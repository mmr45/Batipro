# Mise en production de la v2

À faire **une fois**, dans cet ordre, avant de merger la Pull Request. Commandes pour PowerShell (Windows) ; travaillez
dans un dossier sans « & » dans le chemin, par exemple `C:\dev\batipro`.

## 0. Sauvegarde

Supabase → **Database → Backups** : vérifiez qu'une sauvegarde récente existe (ou lancez `npx supabase db dump -f sauvegarde.sql`
après l'étape 1).

## 1. Relier le projet

```powershell
cd C:\dev\batipro
git fetch origin
git checkout refonte/v2
npm install
npx supabase login
npx supabase link --project-ref pznuuwydfqvsuilimjgm
```

## 2. Appliquer la migration (schéma + RLS + stockage)

```powershell
npx supabase db push
```

La migration `20261026120000_refonte_v2.sql` est idempotente : elle complète les tables existantes sans perte de données,
remplace toutes les policies RLS et crée `devis`, `admins`, `stripe_customers`, `stripe_events` et le bucket privé
`justificatifs`.

Si `db push` refuse (historique de migrations différent), ouvrez **SQL Editor**, collez le contenu du fichier et exécutez-le.

## 3. Vous déclarer administrateur

Dans **SQL Editor** :

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'osman874pro@gmail.com'
on conflict do nothing;
```

## 4. Secrets des fonctions

```powershell
npx supabase secrets list
```

`STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` existent normalement déjà (anciennes fonctions). Ajoutez :

```powershell
npx supabase secrets set SITE_URL=https://batipro-ten.vercel.app ALLOWED_ORIGINS=https://batipro-ten.vercel.app
```

S'ils manquent : `npx supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...`
(clé secrète : Stripe → Développeurs → Clés API ; secret du webhook : Stripe → Webhooks → l'endpoint `stripe-webhook`).

## 5. Déployer les fonctions

```powershell
npx supabase functions deploy
```

Déploie `create-checkout`, `create-portal-session`, `stripe-webhook`, `generate-devis-pdf`, `generate-inpi-pdf` et
`delete-account`.

## 6. Webhook Stripe

L'endpoint existant (`…/functions/v1/stripe-webhook`) écoute déjà `checkout.session.completed`, `invoice.paid`,
`customer.subscription.updated` et `customer.subscription.deleted`. Ajoutez dans Stripe → Webhooks → l'endpoint →
**Modifier les événements** :

- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `invoice.payment_failed`
- `charge.refunded`

## 7. Authentification Supabase

**Authentication → URL Configuration** :

- Site URL : `https://batipro-ten.vercel.app`
- Redirect URLs : `https://batipro-ten.vercel.app/**` et `https://*-batipro3.vercel.app/**` (aperçus Vercel)

## 8. Vercel

`vercel.json` fixe la commande de build et le dossier de sortie (`dist/client`) : rien à régler dans le tableau de bord.
Les anciennes adresses (`/batipro.html`, `/guide-peintre.html`…) sont redirigées en 301 vers les nouvelles.

Ouvrez l'aperçu de la Pull Request, testez : inscription, test de qualification, paiement (vous pouvez vous rembourser
depuis Stripe ensuite), génération d'un devis et du dossier. Puis mergez.

## 9. Mentions légales

Complétez `src/lib/editeur.ts` (forme juridique, SIRET, adresse, médiateur) dès que l'immatriculation est faite : c'est
obligatoire pour vendre en ligne.
