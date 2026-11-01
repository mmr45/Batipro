-- =====================================================================
-- Bâtipro — profils créés par la connexion Google
-- =====================================================================
-- Google ne transmet pas toujours given_name / family_name à Supabase :
-- seulement « full_name » / « name ». On découpe alors le nom complet
-- (premier mot = prénom, le reste = nom). `create or replace` garde les
-- droits de la fonction (révoqués par le durcissement sécurité).
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  complet text := btrim(coalesce(nullif(m ->> 'full_name', ''), m ->> 'name', ''));
begin
  insert into public.profiles (user_id, prenom, nom)
  values (
    new.id,
    left(coalesce(nullif(m ->> 'prenom', ''), nullif(m ->> 'given_name', ''), split_part(complet, ' ', 1)), 100),
    left(coalesce(nullif(m ->> 'nom', ''), nullif(m ->> 'family_name', ''), nullif(btrim(substr(complet, length(split_part(complet, ' ', 1)) + 1)), ''), ''), 100)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
