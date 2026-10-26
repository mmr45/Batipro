import type { ReactNode } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Container, Notice, PageHeader } from "@/components/ui";
import { seo } from "@/lib/seo";
import { A_COMPLETER, EDITEUR } from "@/lib/editeur";

const MAJ = "26 octobre 2026";
const v = (x: string) => x || A_COMPLETER;
const incomplet = !EDITEUR.siret || !EDITEUR.adresse || !EDITEUR.forme;

const PAGES: Record<string, { titre: string; description: string; contenu: () => ReactNode }> = {
  "mentions-legales": {
    titre: "Mentions légales",
    description: "Éditeur, hébergeurs et propriété intellectuelle du site Bâtipro.",
    contenu: () => (
      <>
        <h2>Éditeur</h2>
        <p>
          {EDITEUR.nom}
          <br />
          Forme juridique : {v(EDITEUR.forme)}
          <br />
          SIRET : {v(EDITEUR.siret)}
          <br />
          Adresse : {v(EDITEUR.adresse)}
          <br />
          Contact : <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>
          <br />
          Directeur de la publication : {EDITEUR.nom}
        </p>
        <h2>Hébergement</h2>
        <p>
          Site : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
          <br />
          Base de données, comptes et fichiers : Supabase Inc., serveurs situés dans l'Union européenne (Francfort, Allemagne).
          <br />
          Paiements : Stripe Payments Europe Ltd, Dublin, Irlande.
        </p>
        <h2>Propriété intellectuelle</h2>
        <p>
          Les textes, outils, éléments graphiques et le code du site sont protégés par le Code de la propriété intellectuelle. Les
          documents que vous générez (devis, dossiers) vous appartiennent.
        </p>
      </>
    ),
  },
  cgv: {
    titre: "Conditions générales d'utilisation et de vente",
    description: "Règles d'utilisation du service Bâtipro, offres payantes, paiement, rétractation et résiliation.",
    contenu: () => (
      <>
        <h2>1. Objet</h2>
        <p>
          Bâtipro est un service en ligne d'aide à la création et à la gestion d'une entreprise du bâtiment : test de qualification,
          simulateur de statut, préparation du dossier d'immatriculation, dimensionnement de l'assurance et éditeur de devis. Les
          présentes conditions s'appliquent à toute utilisation du site et à tout achat.
        </p>
        <h2>2. Nature du service</h2>
        <p>
          Les résultats sont des informations générales et des pré-orientations calculées à partir de vos réponses. Ils ne
          constituent pas un conseil juridique, fiscal ou en assurance personnalisé et ne remplacent ni un expert-comptable, ni un
          avocat, ni un assureur, ni la Chambre de Métiers et de l'Artisanat. Bâtipro n'effectue aucune formalité à votre place :
          l'immatriculation se fait par vous sur le Guichet unique de l'INPI.
        </p>
        <p>
          Vous restez responsable de l'exactitude des informations saisies et du contenu des devis que vous émettez, notamment de
          la validité de votre assurance décennale.
        </p>
        <h2>3. Compte</h2>
        <p>
          Les outils payants et l'enregistrement des résultats nécessitent un compte. Vous êtes responsable de la confidentialité
          de vos identifiants. Vous pouvez supprimer votre compte à tout moment depuis votre espace.
        </p>
        <h2>4. Offres et prix</h2>
        <ul>
          <li>Gratuit : test de qualification, simulateur de statut et guides.</li>
          <li>Pack Lancement : 89 €, paiement unique, accès sans limite de durée au dossier de création et au dimensionnement de l'assurance.</li>
          <li>Abonnement Pro : 19 € par mois, sans engagement, accès à l'éditeur de devis et à l'archive.</li>
        </ul>
        <p>Prix exprimés en euros. {EDITEUR.tva}. Une facture est émise pour chaque paiement.</p>
        <h2>5. Paiement</h2>
        <p>
          Le paiement est réalisé par carte via Stripe. Bâtipro n'a jamais accès à vos données bancaires. L'abonnement est prélevé
          chaque mois à date anniversaire.
        </p>
        <h2>6. Droit de rétractation</h2>
        <p>
          Pour le Pack Lancement et l'abonnement Pro, l'accès est fourni immédiatement après le paiement. En validant votre commande,
          vous demandez expressément l'exécution immédiate et reconnaissez perdre votre droit de rétractation (art. L221-28 13° du
          Code de la consommation).
        </p>
        <h2>7. Résiliation de l'abonnement</h2>
        <p>
          Vous pouvez résilier à tout moment depuis votre espace, en un clic. La résiliation prend effet à la fin de la période
          payée ; aucun remboursement au prorata n'est dû. Vos devis émis restent téléchargeables.
        </p>
        <h2>8. Disponibilité et responsabilité</h2>
        <p>
          Bâtipro s'efforce d'assurer la disponibilité du service et l'exactitude des règles appliquées, mises à jour régulièrement,
          sans garantie d'absence d'erreur. Sa responsabilité est limitée au montant payé au cours des douze derniers mois, sauf
          faute lourde ou dommage corporel.
        </p>
        <h2>9. Données personnelles</h2>
        <p>
          Voir la <Link to="/legal/$page" params={{ page: "confidentialite" }}>politique de confidentialité</Link>.
        </p>
        <h2>10. Litiges</h2>
        <p>
          Droit français. En cas de difficulté, écrivez d'abord à <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>. Le
          consommateur peut recourir gratuitement au médiateur de la consommation : {v(EDITEUR.mediateur)}.
        </p>
      </>
    ),
  },
  confidentialite: {
    titre: "Politique de confidentialité",
    description: "Données collectées par Bâtipro, finalités, durées de conservation, destinataires et vos droits.",
    contenu: () => (
      <>
        <h2>Responsable du traitement</h2>
        <p>
          {EDITEUR.nom}, contact : <a href={`mailto:${EDITEUR.email}`}>{EDITEUR.email}</a>.
        </p>
        <h2>Données traitées et finalités</h2>
        <ul>
          <li>Compte (nom, prénom, email, téléphone) : fourniture du service, exécution du contrat.</li>
          <li>Réponses aux outils, dossier de création, devis archivés : fourniture du service, exécution du contrat.</li>
          <li>Pièces justificatives (identité, domicile, diplômes) : préparation de votre dossier, sur votre demande.</li>
          <li>Paiement (géré par Stripe, Bâtipro ne voit pas votre carte) : facturation, obligation légale.</li>
          <li>Journaux techniques : sécurité du service, intérêt légitime.</li>
        </ul>
        <h2>Durées de conservation</h2>
        <ul>
          <li>Compte, résultats, pièces et devis : conservés tant que votre compte existe, effacés dès sa suppression.</li>
          <li>Factures : 10 ans (obligation comptable).</li>
          <li>Brouillons de formulaires : stockés uniquement dans votre navigateur.</li>
        </ul>
        <h2>Destinataires et sous-traitants</h2>
        <ul>
          <li>Supabase (base de données, authentification, fichiers) : serveurs dans l'Union européenne.</li>
          <li>Vercel (hébergement du site) : États-Unis, encadré par le cadre UE–États-Unis de protection des données et des clauses contractuelles types.</li>
          <li>Stripe (paiement) : Irlande, avec transferts encadrés vers les États-Unis.</li>
        </ul>
        <p>Vos données ne sont ni vendues ni utilisées à des fins publicitaires.</p>
        <h2>Cookies</h2>
        <p>
          Le site n'utilise que le stockage strictement nécessaire (session de connexion, brouillons). Aucun traceur publicitaire ni
          outil de mesure d'audience n'est installé : aucun consentement n'est donc requis.
        </p>
        <h2>Vos droits</h2>
        <p>
          Accès, rectification, effacement, limitation, opposition et portabilité : depuis votre espace (modification et suppression
          du compte) ou par email. Vous pouvez saisir la CNIL (cnil.fr).
        </p>
      </>
    ),
  },
};

export const Route = createFileRoute("/legal/$page")({
  loader: ({ params }) => {
    if (!PAGES[params.page]) throw notFound();
    return params.page;
  },
  head: ({ loaderData }) => {
    const p = loaderData ? PAGES[loaderData] : undefined;
    return p ? seo({ title: p.titre, description: p.description, path: `/legal/${loaderData}` }) : {};
  },
  component: Page,
});

function Page() {
  const key = Route.useLoaderData();
  const p = PAGES[key];
  return (
    <>
      <PageHeader title={p.titre} intro={`Dernière mise à jour : ${MAJ}`} />
      <Container className="py-10">
        {incomplet && key !== "confidentialite" && (
          <Notice tone="warn" className="mb-6 max-w-3xl">
            Identité de l'éditeur en cours de finalisation : les champs marqués {A_COMPLETER} seront complétés après l'immatriculation.
          </Notice>
        )}
        <div className="prose-legal">{p.contenu()}</div>
      </Container>
    </>
  );
}

