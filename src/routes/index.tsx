import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check } from "lucide-react";
import { ButtonLink, Container, Cote, revision } from "@/components/ui";
import { seo } from "@/lib/seo";
import { ACRE, FACTURE_ELECTRONIQUE, MICRO_PLAFOND_PRESTATIONS, TVA_FRANCHISE_PRESTATIONS, formatMontant } from "@rules/reglementation.ts";
import { METIERS_GUIDES } from "@rules/metiers.ts";
import { dateFr } from "@/lib/utils";
import { FaqList, FAQ_ACCUEIL } from "@/components/faq";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "Bâtipro — Créer son entreprise du bâtiment et faire des devis conformes",
      description:
        "Test de qualification, choix du statut, dossier de création pour le Guichet unique INPI, assurance décennale et devis BTP conformes aux règles 2026.",
      path: "/",
    }),
  component: Accueil,
});

// ---------------------------------------------------------------------
// Le panneau de chantier : la pièce maîtresse de la page.
// Reprend la structure du panneau d'affichage obligatoire posé à l'entrée
// de chaque chantier en France, avec son cadre noir et ses rubriques.
// ---------------------------------------------------------------------
function PanneauChantier() {
  const rubriques: [string, string][] = [
    ["Bénéficiaire", "Vous, artisan du bâtiment qui se lance"],
    ["Nature des travaux", "Qualification, statut, dossier INPI, décennale, devis"],
    ["Durée du premier verdict", "3 minutes"],
    ["Coût pour commencer", "Gratuit, sans carte bancaire"],
  ];
  return (
    <div className="relative">
      <div className="relative z-10 border-[3px] border-encre bg-papier [--cote-bg:var(--color-papier)]">
        <div className="flex items-center justify-between border-b-[3px] border-encre px-4 py-2 text-[13px] font-semibold sm:px-6">
          <span>Création d'entreprise artisanale</span>
          <span className="ref !text-[12px] !text-encre">Réf. BP-{revision().replaceAll(".", "")}</span>
        </div>
        <div className="grid lg:grid-cols-[1.55fr_1fr]">
          <div className="px-4 pb-6 pt-7 sm:px-8 sm:pb-9 sm:pt-10">
            <h1 className="display text-[44px] sm:text-[68px] xl:text-[76px]">Créez votre entreprise du bâtiment.</h1>
            <p className="display-etroit mt-2 text-[34px] text-bleu sm:text-[50px] xl:text-[56px]">Facturez dans les règles.</p>
            <Cote label={`règles vérifiées le ${revision()}`} trace className="mt-8 max-w-[34rem]" />
          </div>
          <dl className="grid border-t-[3px] border-encre sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-4 lg:border-l-[3px] lg:border-t-0">
            {rubriques.map(([k, v], i) => (
              <div
                key={k}
                className={
                  "flex flex-col justify-center border-encre/20 px-4 py-3.5 sm:px-6 lg:border-b lg:last:border-b-0 " +
                  (i % 2 === 0 ? "sm:border-r lg:border-r-0 " : "") +
                  (i < 2 ? "border-b " : i === 2 ? "border-b sm:border-b-0 " : "")
                }
              >
                <dt className="text-[13px] text-encre-3">{k}</dt>
                <dd className="mt-0.5 text-[15.5px] font-semibold leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      {/* Poteaux du panneau */}
      <div aria-hidden className="pointer-events-none absolute -bottom-16 left-[12%] top-full w-3 bg-gradient-to-b from-encre-2 to-encre-2/0 sm:-bottom-24" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 right-[12%] top-full w-3 bg-gradient-to-b from-encre-2 to-encre-2/0 sm:-bottom-24" />
    </div>
  );
}

// ---------------------------------------------------------------------
// Le devis vivant : les mentions obligatoires changent avec la situation.
// ---------------------------------------------------------------------
type Situation = { client: "particulier" | "pro"; domicile: boolean; ancien: boolean };

function mentionsPour(s: Situation): { label: string; ref: string }[] {
  const m = [
    { label: "SIRET, forme juridique et mention « EI »", ref: "R526-27 C. com." },
    { label: "Assureur décennale, coordonnées et zone couverte", ref: "L243-2 C. assur." },
    { label: "Détail chiffré et taux de TVA par ligne", ref: "arrêté 24/01/2017" },
    { label: "Quantité, tri et point de collecte des déchets", ref: "L541-21-2-3 C. env." },
  ];
  if (s.ancien && s.client === "particulier") m.push({ label: "Attestation TVA 10 % signée sur le devis", ref: "279-0 bis CGI" });
  if (s.client === "pro") m.push({ label: "Pénalités de retard et indemnité de 40 €", ref: "L441-10 C. com." });
  if (s.client === "particulier") m.push({ label: "Médiateur de la consommation", ref: "L616-1 C. conso." });
  if (s.client === "particulier" && s.domicile) m.push({ label: "Rétractation 14 jours et formulaire joint", ref: "L221-5 C. conso." });
  return m;
}

function Bascule({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "flex items-center gap-2 rounded-sm border px-3 py-2 text-[14px] font-semibold transition-colors " +
        (active ? "border-encre bg-encre text-white" : "border-trait-fort bg-papier text-encre-2 hover:border-encre hover:text-encre")
      }
    >
      <span aria-hidden className={"h-2 w-2 rounded-full " + (active ? "bg-balise" : "bg-trait-fort")} />
      {label}
    </button>
  );
}

function DevisVivant() {
  const [s, setS] = useState<Situation>({ client: "particulier", domicile: false, ancien: true });
  const mentions = mentionsPour(s);
  return (
    <div className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-16">
      <div>
        <h2 className="display text-[36px] sm:text-[44px]">Un devis qui connaît la loi.</h2>
        <p className="mt-4 text-[17.5px] leading-relaxed text-encre-2">
          Les mentions obligatoires d'un devis changent selon le client et le chantier. Changez la situation : la liste se met à jour,
          avec l'article de loi en face de chaque ligne.
        </p>
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Situation du chantier">
          <Bascule label="Particulier" active={s.client === "particulier"} onClick={() => setS({ ...s, client: "particulier" })} />
          <Bascule label="Professionnel" active={s.client === "pro"} onClick={() => setS({ ...s, client: "pro" })} />
          <Bascule label="Démarché à domicile" active={s.domicile} onClick={() => setS({ ...s, domicile: !s.domicile })} />
          <Bascule label="Logement de plus de 2 ans" active={s.ancien} onClick={() => setS({ ...s, ancien: !s.ancien })} />
        </div>
        <ButtonLink to="/outils/devis" variant="secondary" className="mt-8">
          Ouvrir l'éditeur de devis
        </ButtonLink>
      </div>

      <div className="relative pl-7 sm:pl-10">
        {/* Cote verticale : la hauteur suit le nombre de mentions */}
        <div aria-hidden className="absolute bottom-0 left-0 top-0 flex w-4 flex-col items-center text-balise">
          <span className="h-px w-4 bg-current" />
          <span className="w-px flex-1 bg-current" />
          <span className="h-px w-4 bg-current" />
        </div>
        <span className="ref absolute left-2 top-1/2 origin-center -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap bg-enduit px-1.5 !text-[12px] !text-balise" aria-hidden>
          {mentions.length} mentions
        </span>

        <div className="feuille">
          <div className="flex items-start justify-between gap-4 border-b border-encre/10 px-5 py-4 sm:px-7">
            <div>
              <p className="font-semibold">Martin Peinture EI</p>
              <p className="text-[13.5px] text-encre-3">Réfection séjour et couloir, 45 m²</p>
            </div>
            <div className="text-right">
              <p className="display text-[22px] text-bleu">Devis</p>
              <p className="ref !text-[12px]">D2026-0042</p>
            </div>
          </div>
          <ul className="divide-y divide-encre/8 px-5 sm:px-7" aria-live="polite">
            {mentions.map((m) => (
              <li key={m.label} className="flex items-baseline gap-3 py-3 text-[15px]">
                <Check className="relative top-0.5 h-4 w-4 shrink-0 text-vert" strokeWidth={2.5} aria-hidden />
                <span className="flex-1">{m.label}</span>
                <span className="ref hidden whitespace-nowrap sm:inline">{m.ref}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-encre/10 px-5 py-3 text-[13.5px] sm:px-7">
            <span className="text-encre-3">Signature du client</span>
            <span className="text-encre-3">Bon pour accord</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Le parcours : 5 étapes dans l'ordre ; les cotes indiquent ce que couvre
// chaque offre.
// ---------------------------------------------------------------------
const PARCOURS = [
  { titre: "Vérifier sa qualification", texte: "Diplôme ou années d'expérience : savoir tout de suite si la CMA validera votre métier.", to: "/outils/qualification" },
  { titre: "Choisir son statut", texte: "Micro, EI au réel ou SASU, avec le coût des cotisations et l'effet de l'ACRE.", to: "/outils/statut" },
  { titre: "Préparer le dossier INPI", texte: "Les informations du Guichet unique, vos pièces et la déclaration de non-condamnation, en un PDF.", to: "/outils/inpi" },
  { titre: "Dimensionner la décennale", texte: "Plafonds conseillés et budget annuel avant d'appeler les assureurs.", to: "/outils/assurance" },
  { titre: "Envoyer des devis conformes", texte: "Mentions générées selon le client et le chantier, numérotation continue, archive.", to: "/outils/devis" },
] as const;

function Parcours() {
  return (
    <div>
      <div className="hidden grid-cols-5 gap-px lg:grid">
        <Cote label="Gratuit" tone="encre" className="col-span-2" />
        <Cote label="Pack Lancement, 89 €" className="col-span-2" />
        <Cote label="Pro, 19 €/mois" className="col-span-1" />
      </div>
      <ol className="mt-5 grid gap-px border border-encre/12 bg-encre/12 lg:grid-cols-5">
        {PARCOURS.map((p, i) => (
          <li key={p.to} className="bg-papier">
            <Link to={p.to} className="group flex h-full flex-col p-5 transition-colors hover:bg-bleu-pale/50">
              <span className="display text-[52px] leading-none text-encre/15 transition-colors group-hover:text-balise">{i + 1}</span>
              <span className="mt-6 flex items-start justify-between gap-2 text-[17px] font-semibold leading-snug">
                {p.titre}
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-encre-3 transition-colors group-hover:text-bleu" aria-hidden />
              </span>
              <span className="mt-2 text-[14.5px] leading-snug text-encre-2">{p.texte}</span>
              <span className="mt-4 text-[13px] font-medium text-encre-3 lg:hidden">
                {i < 2 ? "Gratuit" : i < 4 ? "Pack Lancement" : "Abonnement Pro"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Accueil() {
  const changements = [
    { date: FACTURE_ELECTRONIQUE.receptionToutesEntreprises, titre: "Réception des factures électroniques", texte: `Toutes les entreprises, micro comprises, doivent pouvoir recevoir des factures électroniques. L'émission devient obligatoire pour les TPE le ${dateFr(FACTURE_ELECTRONIQUE.emissionTpePmeMicro)}.` },
    { date: ACRE.dateChangement, titre: "ACRE réduite à 25 %", texte: `Pour les micro-entrepreneurs, la réduction de cotisations passe de 50 % à 25 %, à demander sous ${ACRE.delaiDemandeJours} jours.` },
    { date: "2025-11-03", titre: "Seuils de franchise de TVA maintenus", texte: `Le seuil unique à 25 000 € est abandonné : ${formatMontant(TVA_FRANCHISE_PRESTATIONS.base)} pour les prestations, ${formatMontant(TVA_FRANCHISE_PRESTATIONS.majore)} en seuil majoré.` },
    { date: "2025-02-16", titre: "Fin des attestations TVA papier", texte: "Pour la TVA à 10 % ou 5,5 %, le client certifie désormais directement sur le devis qu'il signe." },
  ];

  return (
    <>
      <section className="terrain overflow-hidden border-b border-encre/10">
        <Container className="pb-20 pt-10 sm:pb-28 sm:pt-16">
          <div>
            <PanneauChantier />
          </div>
          <div className="relative z-10 mt-24 flex flex-col gap-4 sm:mt-32 sm:flex-row sm:items-center">
            <ButtonLink to="/outils/qualification" variant="encre" className="px-6 py-3.5 text-[16.5px]">
              Tester ma qualification gratuitement
            </ButtonLink>
            <Link to="/tarifs" className="w-fit px-2 py-2 text-[16px] font-semibold text-encre underline decoration-encre/30 underline-offset-[6px] hover:decoration-balise">
              Voir les tarifs
            </Link>
            <p className="text-[14.5px] text-encre-2 sm:ml-auto sm:max-w-xs sm:text-right">
              Conçu par un apprenti peintre du Loiret, pour ceux qui veulent avancer, pas s'administrer.
            </p>
          </div>
        </Container>
      </section>

      <section className="[--cote-bg:var(--color-enduit)]">
        <Container className="py-20 sm:py-28">
          <DevisVivant />
        </Container>
      </section>

      <section className="border-y border-encre/10 bg-enduit-2/60 [--cote-bg:#ebedea]">
        <Container className="py-20 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="display text-[36px] sm:text-[44px]">Le parcours, dans l'ordre du chantier.</h2>
            <p className="mt-4 text-[17.5px] text-encre-2">Chaque étape reprend ce que vous avez saisi à la précédente. Les deux premières sont gratuites.</p>
          </div>
          <div className="mt-12">
            <Parcours />
          </div>
        </Container>
      </section>

      <section className="bg-bleu-nuit text-white">
        <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.35fr]">
          <div>
            <h2 className="display text-[36px] sm:text-[44px]">Ce qui a changé.</h2>
            <p className="mt-4 max-w-md text-[17px] text-white/70">
              Les seuils, taux et mentions des outils sont centralisés et datés. Quand la loi bouge, vos devis suivent, sans que vous
              ayez à lire le Journal officiel.
            </p>
            <Link to="/reglementation" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-white underline decoration-white/30 underline-offset-[6px] hover:decoration-balise">
              Toutes les règles appliquées <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ol className="relative">
            <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-white/20" />
            {changements.map((c) => (
              <li key={c.titre} className="relative pb-9 pl-9 last:pb-0">
                <span aria-hidden className="absolute left-0 top-1.5 h-[11px] w-[11px] border-2 border-balise bg-bleu-nuit" />
                <p className="ref !text-[12.5px] !text-white/55">{dateFr(c.date)}</p>
                <p className="mt-1 text-[19px] font-semibold">{c.titre}</p>
                <p className="mt-1 max-w-xl text-white/70">{c.texte}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section>
        <Container className="py-20 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="display max-w-2xl text-[36px] sm:text-[44px]">Treize métiers, treize guides.</h2>
            <Link to="/guides" className="font-semibold text-bleu underline decoration-bleu/30 underline-offset-[6px] hover:decoration-bleu">
              Tous les guides
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-2">
            {METIERS_GUIDES.map((m) => (
              <li key={m.slug}>
                <Link
                  to="/guides/$metier"
                  params={{ metier: m.slug }}
                  className="block rounded-sm border border-trait-fort bg-papier px-4 py-2.5 text-[15.5px] font-semibold transition-colors hover:border-encre hover:bg-encre hover:text-white"
                >
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-t border-encre/10">
        <Container className="grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="display text-[36px] sm:text-[44px]">Un outil, pas un cabinet.</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-encre-2">
              Bâtipro ne vous appelle pas et ne décide pas à votre place. Quand une question engage votre patrimoine ou dépasse un calcul
              (associés, conjoint, activité mixte au-delà de {formatMontant(MICRO_PLAFOND_PRESTATIONS.valeur)}), il vous le dit et vous
              oriente vers un professionnel.
            </p>
          </div>
          <FaqList items={FAQ_ACCUEIL} />
        </Container>
      </section>

      <section>
        <Container>
          <div className="relative overflow-hidden bg-encre px-6 py-14 text-white sm:px-12 sm:py-16 [--cote-bg:var(--color-encre)]">
            <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h2 className="display max-w-2xl text-[36px] sm:text-[52px]">Trois minutes pour savoir où vous en êtes.</h2>
                <Cote label="3 min" tone="clair" className="mt-6 max-w-[14rem]" />
              </div>
              <ButtonLink to="/outils/qualification" variant="inverse" className="px-6 py-3.5 text-[16.5px]">
                Commencer le test
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
