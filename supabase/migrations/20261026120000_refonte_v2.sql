-- =====================================================================
-- Bâtipro v2 — schéma, sécurité (RLS) et stockage
-- =====================================================================
-- Migration idempotente : elle peut être appliquée sur la base existante
-- (tables profiles / submissions / entitlements déjà créées à la main)
-- sans perte de données. Elle ajoute les colonnes manquantes, remplace
-- TOUTES les policies RLS par un jeu strict et documenté, et crée les
-- nouvelles tables (devis, stripe_customers, stripe_events, admins).
--
-- Règle d'or : le navigateur (clé anon / publishable) ne peut JAMAIS écrire
-- dans entitlements, stripe_*, admins ou devis. Seules les Edge Functions
-- (clé service_role) le peuvent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Utilitaires
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Supprime toutes les policies existantes d'une table (repart d'un état propre).
create or replace function public._drop_all_policies(tbl text)
returns void language plpgsql
set search_path = ''
as $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies where schemaname = 'public' and tablename = tbl
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Administrateurs
-- Table séparée, sans aucune policy : invisible et non modifiable depuis le
-- navigateur. On ajoute un admin depuis le SQL Editor :
--   insert into public.admins (user_id) select id from auth.users where email = '…';
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
select public._drop_all_policies('admins');

-- ---------------------------------------------------------------------
-- 2. Profils
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.profiles add column if not exists prenom text;
alter table public.profiles add column if not exists nom text;
alter table public.profiles add column if not exists telephone text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Reprise d'un éventuel ancien rôle « admin » stocké dans profiles.role
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    execute $q$
      insert into public.admins (user_id)
      select user_id from public.profiles where role = 'admin'
      on conflict do nothing
    $q$;
  end if;
end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
select public._drop_all_policies('profiles');
create policy "profiles: lecture de son profil" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "profiles: modification de son profil" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Seules ces colonnes sont modifiables par l'utilisateur (une éventuelle
-- colonne « role » héritée reste en lecture seule).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (prenom, nom, telephone) on public.profiles to authenticated;

-- Création automatique du profil à l'inscription (prénom / nom passés dans
-- les métadonnées de signUp). Remplace l'insert fait depuis le navigateur.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, prenom, nom)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'prenom', new.raw_user_meta_data ->> 'given_name', ''), 100),
    left(coalesce(new.raw_user_meta_data ->> 'nom', new.raw_user_meta_data ->> 'family_name', ''), 100)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profils manquants pour les comptes déjà créés
insert into public.profiles (user_id, prenom, nom)
select u.id,
       left(coalesce(u.raw_user_meta_data ->> 'prenom', ''), 100),
       left(coalesce(u.raw_user_meta_data ->> 'nom', ''), 100)
from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- 3. is_admin() — utilisable par le front (RPC) et dans les policies
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 4. Droits d'accès (entitlements) — écrits UNIQUEMENT par le webhook Stripe
-- ---------------------------------------------------------------------
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_key text not null,
  active boolean not null default true
);
alter table public.entitlements add column if not exists source text not null default 'stripe';
alter table public.entitlements add column if not exists stripe_customer_id text;
alter table public.entitlements add column if not exists stripe_subscription_id text;
alter table public.entitlements add column if not exists stripe_checkout_session_id text;
alter table public.entitlements add column if not exists status text;
alter table public.entitlements add column if not exists current_period_end timestamptz;
alter table public.entitlements add column if not exists cancel_at_period_end boolean not null default false;
alter table public.entitlements add column if not exists created_at timestamptz not null default now();
alter table public.entitlements add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'entitlements_product_key_check') then
    alter table public.entitlements
      add constraint entitlements_product_key_check check (product_key in ('dossier', 'pro')) not valid;
  end if;
end $$;

-- Un seul droit par (compte, produit) : dédoublonne avant de poser l'index
delete from public.entitlements e
using public.entitlements e2
where e.user_id = e2.user_id and e.product_key = e2.product_key
  and (e.active, e.ctid) < (e2.active, e2.ctid);
create unique index if not exists entitlements_user_product_key on public.entitlements (user_id, product_key);
create index if not exists entitlements_subscription on public.entitlements (stripe_subscription_id);

drop trigger if exists entitlements_updated_at on public.entitlements;
create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function public.set_updated_at();

alter table public.entitlements enable row level security;
select public._drop_all_policies('entitlements');
create policy "entitlements: lecture de ses droits" on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;

-- Raccourci pour le front : droits actifs du compte connecté
create or replace function public.my_access()
returns table (dossier boolean, pro boolean, pro_period_end timestamptz, pro_cancel_at_period_end boolean)
language sql stable security invoker
set search_path = ''
as $$
  select
    coalesce(bool_or(product_key = 'dossier' and active), false),
    coalesce(bool_or(product_key = 'pro' and active), false),
    max(current_period_end) filter (where product_key = 'pro'),
    coalesce(bool_or(product_key = 'pro' and cancel_at_period_end), false)
  from public.entitlements
  where user_id = (select auth.uid());
$$;
grant execute on function public.my_access() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Clients Stripe & idempotence des webhooks (service_role uniquement)
-- ---------------------------------------------------------------------
create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  customer_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.stripe_customers enable row level security;
select public._drop_all_policies('stripe_customers');
revoke all on public.stripe_customers from anon, authenticated;

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
select public._drop_all_policies('stripe_events');
revoke all on public.stripe_events from anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Soumissions des modules (qualification, statut, INPI, assurance)
-- ---------------------------------------------------------------------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  type text not null,
  summary text,
  payload jsonb
);
alter table public.submissions add column if not exists created_at timestamptz not null default now();
alter table public.submissions alter column user_id set default auth.uid();
alter table public.submissions alter column payload set default '{}'::jsonb;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'submissions_type_check') then
    alter table public.submissions drop constraint submissions_type_check;
  end if;
  alter table public.submissions
    add constraint submissions_type_check check (type in ('qualif', 'statut', 'inpi', 'assurance', 'devis')) not valid;
  if not exists (select 1 from pg_constraint where conname = 'submissions_payload_size') then
    alter table public.submissions
      add constraint submissions_payload_size check (pg_column_size(payload) < 200000) not valid;
  end if;
end $$;

create index if not exists submissions_user_type_created on public.submissions (user_id, type, created_at desc);

alter table public.submissions enable row level security;
select public._drop_all_policies('submissions');
create policy "submissions: lecture des siennes" on public.submissions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
-- Les devis sont archivés par l'Edge Function (service_role), jamais par le navigateur.
create policy "submissions: création des siennes" on public.submissions
  for insert to authenticated with check (user_id = (select auth.uid()) and type <> 'devis');
create policy "submissions: suppression des siennes" on public.submissions
  for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.submissions from anon, authenticated;
revoke all on public.submissions from anon;
grant select, insert, delete on public.submissions to authenticated;

-- ---------------------------------------------------------------------
-- 7. Devis archivés — numérotation continue par compte
-- ---------------------------------------------------------------------
create table if not exists public.devis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  numero text not null,
  sequence integer not null,
  client_nom text not null default '',
  intitule text not null default '',
  total_ht numeric(12, 2) not null default 0,
  total_ttc numeric(12, 2) not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, sequence)
);
create index if not exists devis_user_created on public.devis (user_id, created_at desc);

alter table public.devis enable row level security;
select public._drop_all_policies('devis');
create policy "devis: lecture des siens" on public.devis
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete on public.devis from anon, authenticated;
revoke all on public.devis from anon;
grant select on public.devis to authenticated;

-- Réserve le prochain numéro de devis (appelée par l'Edge Function).
create or replace function public.next_devis_sequence(p_user uuid)
returns integer language plpgsql security definer
set search_path = ''
as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(hashtext('devis:' || p_user::text));
  select coalesce(max(sequence), 0) + 1 into n from public.devis where user_id = p_user;
  return n;
end;
$$;
revoke all on function public.next_devis_sequence(uuid) from public, anon, authenticated;
grant execute on function public.next_devis_sequence(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 8. Vue d'administration (lecture seule, réservée aux admins)
-- ---------------------------------------------------------------------
create or replace function public.admin_overview()
returns table (
  user_id uuid, email text, prenom text, nom text, created_at timestamptz,
  dossier boolean, pro boolean, submissions bigint, devis bigint
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, p.prenom, p.nom, u.created_at,
           coalesce(bool_or(e.product_key = 'dossier' and e.active), false),
           coalesce(bool_or(e.product_key = 'pro' and e.active), false),
           (select count(*) from public.submissions s where s.user_id = u.id),
           (select count(*) from public.devis d where d.user_id = u.id)
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.entitlements e on e.user_id = u.id
    group by u.id, u.email, p.prenom, p.nom, u.created_at
    order by u.created_at desc
    limit 500;
end;
$$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- ---------------------------------------------------------------------
-- 9. Stockage des pièces justificatives (bucket privé)
-- Chemin imposé : <user_id>/<type_de_piece>/<fichier>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('justificatifs', 'justificatifs', false, 5242880,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "justificatifs: lecture des siens" on storage.objects;
drop policy if exists "justificatifs: dépôt des siens" on storage.objects;
drop policy if exists "justificatifs: remplacement des siens" on storage.objects;
drop policy if exists "justificatifs: suppression des siens" on storage.objects;

create policy "justificatifs: lecture des siens" on storage.objects
  for select to authenticated
  using (bucket_id = 'justificatifs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "justificatifs: dépôt des siens" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'justificatifs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "justificatifs: remplacement des siens" on storage.objects
  for update to authenticated
  using (bucket_id = 'justificatifs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'justificatifs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "justificatifs: suppression des siens" on storage.objects
  for delete to authenticated
  using (bucket_id = 'justificatifs' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- La suppression de compte (RGPD) passe par l'Edge Function delete-account,
-- qui efface les fichiers via l'API Storage puis le compte (cascade).

drop function public._drop_all_policies(text);
