-- =====================================================================
-- Bâtipro — panel d'administration v2
-- =====================================================================
-- admin_overview() renvoie maintenant tout ce qu'il faut pour suivre un
-- compte (dernière connexion, méthode de connexion, état de l'abonnement,
-- client Stripe, dernière activité). Toujours en lecture seule, toujours
-- réservée aux admins (vérification is_admin() dans la fonction).
-- Le détail d'un compte (soumissions, devis) est lu directement dans les
-- tables : leurs policies autorisent déjà la lecture par un admin.
-- =====================================================================

drop function if exists public.admin_overview();

create function public.admin_overview()
returns table (
  user_id uuid,
  email text,
  prenom text,
  nom text,
  telephone text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  provider text,
  email_confirme boolean,
  est_admin boolean,
  dossier boolean,
  dossier_le timestamptz,
  pro boolean,
  pro_statut text,
  pro_fin timestamptz,
  pro_resilie boolean,
  pro_depuis timestamptz,
  stripe_customer text,
  submissions bigint,
  devis bigint,
  derniere_activite timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return query
    select
      u.id,
      u.email::text,
      p.prenom,
      p.nom,
      p.telephone,
      u.created_at,
      u.last_sign_in_at,
      coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
      u.email_confirmed_at is not null,
      exists (select 1 from public.admins a where a.user_id = u.id),
      coalesce(ed.active, false),
      ed.created_at,
      coalesce(ep.active, false),
      ep.status,
      ep.current_period_end,
      coalesce(ep.cancel_at_period_end, false),
      ep.created_at,
      sc.customer_id,
      coalesce(s.n, 0),
      coalesce(d.n, 0),
      greatest(u.last_sign_in_at, s.derniere, d.derniere)
    from auth.users u
    left join public.profiles p on p.user_id = u.id
    left join public.entitlements ed on ed.user_id = u.id and ed.product_key = 'dossier'
    left join public.entitlements ep on ep.user_id = u.id and ep.product_key = 'pro'
    left join public.stripe_customers sc on sc.user_id = u.id
    left join lateral (
      select count(*) as n, max(x.created_at) as derniere from public.submissions x where x.user_id = u.id
    ) s on true
    left join lateral (
      select count(*) as n, max(x.created_at) as derniere from public.devis x where x.user_id = u.id
    ) d on true
    order by u.created_at desc
    limit 2000;
end;
$$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;
