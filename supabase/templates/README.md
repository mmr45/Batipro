# Emails d'authentification

Modèles des emails envoyés par Supabase Auth, aux couleurs et à la typographie de Bâtipro (Inter, avec repli sur la
police système dans les messageries qui bloquent les polices web).

| Fichier | Dashboard Supabase → Authentication → Emails | Sujet conseillé |
| --- | --- | --- |
| `confirmation.html` | Confirm signup | Confirmez votre adresse email |
| `recovery.html` | Reset password | Réinitialisez votre mot de passe Bâtipro |
| `magic_link.html` | Magic link | Votre lien de connexion Bâtipro |
| `email_change.html` | Change email address | Confirmez votre nouvelle adresse email |
| `invite.html` | Invite user | Vous êtes invité sur Bâtipro |
| `reauthentication.html` | Reauthentication | Votre code de confirmation Bâtipro |

Pour chaque ligne : ouvrir le modèle dans le tableau de bord, coller le sujet, puis le contenu du fichier, et enregistrer.

Ces modèles ne sont volontairement **pas** branchés dans `config.toml` : `supabase config push` enverrait aussi toute
la section `[auth]` (URL du site, redirections…) avec les valeurs locales par défaut.
