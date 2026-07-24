<img width="300" height="75" alt="banner" src="https://github.com/user-attachments/assets/3286a03c-7ec6-4c05-9156-a32a79daf09f" />

# Bâtipro

**Bâtipro** est une plateforme d'accompagnement 100 % en ligne pour la création d'entreprises du bâtiment. Elle aide les artisans du bâtiment (BTP) à préparer leur dossier d'immatriculation INPI, à choisir le bon statut juridique, et à générer des devis conformes à la réglementation du secteur.

🔗 **Démo en ligne** : [batipro-ten.vercel.app](https://batipro-ten.vercel.app)

## ✨ Fonctionnalités

- **Test d'éligibilité** : vérifie si le projet est viable avant de se lancer
- **Simulateur de statut juridique** : comparaison Micro-entreprise vs SASU selon la situation
- **Générateur de dossier INPI** : génération automatique du dossier d'immatriculation, PDF produit côté serveur
- **Générateur de devis conforme BTP** : mentions légales obligatoires (garantie décennale, RC Pro, TVA, pénalités de retard...), personnalisation du logo et des informations de l'entreprise
- **Espace client** : suivi des dossiers et abonnement

## 🛠️ Stack technique

- **Frontend** : HTML/JS (single-file `batipro.html`), Vite, Tailwind CSS
- **Backend** : Supabase (PostgreSQL, Auth, Edge Functions en Deno)
- **Génération de PDF** : entièrement côté serveur (Supabase Edge Functions) pour garantir qu'un utilisateur non-payant ne puisse pas contourner le paywall
- **Paiement** : Stripe
- **Hébergement** : Vercel

## 🔒 Sécurité

- Génération des PDF (INPI et devis) exécutée exclusivement côté serveur, avec vérification de l'abonnement via la clé `service_role` Supabase (jamais exposée au client)
- Row Level Security (RLS) activée sur les tables sensibles, notamment `entitlements`
- Aucune clé secrète n'est présente dans le code : les clés `service_role` et Stripe sont gérées via des variables d'environnement

## 👤 Auteur

Développé par [Osman](https://github.com/mmr45), apprenti peintre en bâtiment et développeur autodidacte.
