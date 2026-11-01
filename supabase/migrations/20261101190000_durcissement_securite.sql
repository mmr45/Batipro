-- =====================================================================
-- Bâtipro — durcissement sécurité (audit du 2026-11-01)
-- =====================================================================
-- Ne change aucun comportement du site : il retire des droits que le
-- navigateur n'utilise pas. Idempotent.
-- =====================================================================

-- 1. Fonctions SECURITY DEFINER appelables depuis l'API REST alors qu'elles
--    ne servent qu'en trigger : on retire l'exécution au public.
do $$
declare f text;
begin
  foreach f in array array['public.handle_new_user()', 'public.protect_plan_columns()', 'public.rls_auto_enable()']
  loop
    if to_regprocedure(f) is not null then
      execute format('revoke all on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;

-- search_path figé (alerte « Function Search Path Mutable »)
do $$
begin
  if to_regprocedure('public.protect_plan_columns()') is not null then
    alter function public.protect_plan_columns() set search_path = '';
  end if;
end $$;

-- my_access() n'a de sens que connecté
revoke all on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

-- 2. Tables : le navigateur n'a que les droits listés ici. RLS bloquait déjà
--    les écritures, mais on retire aussi les privilèges (défense en profondeur),
--    y compris TRUNCATE, qui n'est pas filtré par RLS.
revoke all on public.admins from anon, authenticated;
revoke all on public.stripe_customers from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;

revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;

revoke all on public.devis from anon, authenticated;
grant select on public.devis to authenticated;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (prenom, nom, telephone) on public.profiles to authenticated;

revoke all on public.submissions from anon, authenticated;
grant select, insert, delete on public.submissions to authenticated;

-- Anciennes tables de la v1 (plus utilisées par le site) : lecture seule.
do $$
begin
  if to_regclass('public.app_admins') is not null then
    revoke all on public.app_admins from anon, authenticated;
  end if;
  if to_regclass('public.payments') is not null then
    revoke all on public.payments from anon, authenticated;
    grant select on public.payments to authenticated; -- policy « select own payments »
  end if;
end $$;
