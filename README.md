# Bâtipro

Créer son entreprise du bâtiment et faire des devis conformes : test de qualification, simulateur de statut, dossier de
création pour le Guichet unique INPI, dimensionnement de la décennale et éditeur de devis BTP.

Production : [batipro-ten.vercel.app](https://batipro-ten.vercel.app)

## Offres

| Offre | Prix | Contenu | Clé `entitlements` |
| --- | --- | --- | --- |
| Gratuit | 0 € | Qualification, statut, guides | — |
| Pack Lancement | 89 € une fois | Dossier INPI + pièces, assurance décennale | `dossier` |
| Pro | 19 €/mois | Éditeur de devis, numérotation, archive | `pro` |

Les deux offres payantes sont indépendantes.

## Architecture

```
src/                          Front React (TanStack Start), pré-rendu en HTML statique
  routes/                     Une page = un fichier (outils/, guides/, legal/, espace, admin…)
  components/                 UI, en-tête, pied de page, verrous (connexion / paiement)
  lib/                        Client Supabase, auth, appels aux fonctions
supabase/
  migrations/                 Schéma, RLS et stockage (idempotent)
  functions/
    _shared/rules/            ⚖️ RÉFÉRENTIEL RÉGLEMENTAIRE — partagé front + serveur
    _shared/                  HTTP, Stripe, moteur PDF
    create-checkout           Session de paiement Stripe
    create-portal-session     Portail client Stripe (factures, résiliation)
    stripe-webhook            Seul point d'écriture des droits d'accès
    generate-devis-pdf        Devis : contrôle, numérotation, archive, PDF
    generate-inpi-pdf         Dossier de création + pièces jointes
    delete-account            Suppression RGPD du compte
scripts/sitemap.ts            Génère public/sitemap.xml
```

- **Aucun serveur Node** : Vercel sert des fichiers statiques, tout le backend est dans Supabase.
- **SEO** : toutes les pages publiques (accueil, outils, 13 guides métiers, règles) sont pré-rendues en HTML.
- **Sécurité** : le navigateur ne peut écrire ni dans `entitlements`, ni dans `devis`. Les PDF payants sont générés côté
  serveur après vérification des droits avec la clé `service_role`.

## Mettre une règle à jour

Toutes les valeurs légales (seuils micro, franchise TVA, taux, ACRE, mentions de devis…) sont dans
[`supabase/functions/_shared/rules/reglementation.ts`](supabase/functions/_shared/rules/reglementation.ts), avec leur source.

1. Modifier la valeur, la source et `REGLES_VERSION`.
2. `npm test`
3. Pousser : le site se met à jour au déploiement Vercel ; redéployer `generate-devis-pdf` pour les PDF.

La page `/reglementation` affiche automatiquement toutes les valeurs en vigueur.

## Développement

```bash
npm install
npm run dev        # adresse affichée dans le terminal
npm test           # règles métier
npm run typecheck
npm run build      # sortie statique dans dist/client
```

Variables optionnelles (`.env.local`, voir `.env.example`) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Sans elles,
le projet de production est utilisé.

Mise en production de la base et des fonctions : voir [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md).

## Auteur

Développé par [Osman Fauconnier](https://github.com/mmr45), apprenti peintre en bâtiment et développeur autodidacte.
