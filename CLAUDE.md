# Bâtipro — notes pour les agents

- Règles légales : uniquement dans `supabase/functions/_shared/rules/` (TypeScript pur, importé par le front via `@rules/*` et par Deno). Ne jamais recopier un seuil ou un taux ailleurs.
- Imports dans `_shared` : extensions `.ts` obligatoires (Deno).
- Le navigateur n'écrit jamais dans `entitlements`, `devis`, `stripe_*`, `admins` : seules les Edge Functions (service_role) le font.
- Vérifications : `npm test`, `npm run typecheck`, `npm run build`, `cd supabase/functions && deno check */index.ts`.
- Pages pré-rendues : tout ce qui dépend du navigateur (localStorage, paramètres d'URL, session) se lit dans un `useEffect`.
