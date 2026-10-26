import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { ButtonLink, Container, Ref } from "@/components/ui";
import { seo } from "@/lib/seo";
import {
  ACRE,
  FACTURE_ELECTRONIQUE,
  MICRO_PLAFOND_PRESTATIONS,
  TVA_FRANCHISE_PRESTATIONS,
  formatMontant,
} from "@rules/reglementation.ts";
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
// Le moment fort de la page : un devis dont les mentions obligatoires
// changent en direct selon la situation du chantier.
// ---------------------------------------------------------------------
type Situation = { client: "particulier" | "pro"; domicile: boolean; ancien: boolean };

function mentionsPour(s: Situation): { label: string; ref: string }[] {
  const m = [
    { label: "SIRET, forme juridique et mention « EI » le cas échéant", ref: "R526-27 C. com." },
    { label: "Assureur décennale, coordonnées et zone couverte", ref: "L243-2 C. assur." },
    { label: "Détail chiffré des prestations et taux de TVA par ligne", ref: "arrêté 24/01/2017" },
    { label: "Quantité, tri et point de collecte des déchets", ref: "L541-21-2-3 C. env." },
  ];
  if (s.ancien && s.client === "particulier")
    m.push({ label: "Attestation TVA 10 % intégrée au devis (fin du CERFA)", ref: "279-0 bis CGI" });
  if (s.client === "pro") m.push({ label: "Pénalités de retard et indemnité de 40 €", ref: "L441-10 C. com." });
  if (s.client === "particulier") m.push({ label: "Médiateur de la consommation", ref: "L616-1 C. conso." });
  if (s.client === "particulier" && s.domicile)
    m.push({ label: "Rétractation 14 jours et formulaire joint", ref: "L221-5 C. conso." });
  return m;
}

function DevisVivant() {
  const [s, setS] = useState<Situation>({ client: "particulier", domicile: false, ancien: true });
  const mentions = mentionsPour(s);
  const toggle = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-sm border px-3 py-1.5 text-[13.5px] font-medium transition-colors " +
        (active ? "border-bleu bg-bleu text-white" : "border-ardoise/20 bg-papier text-ardoise-2 hover:border-ardoise/50")
      }
    >
      {label}
    </button>
  );
  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        {toggle("Client particulier", s.client === "particulier", () => setS({ ...s, client: "particulier" }))}
        {toggle("Client professionnel", s.client === "pro", () => setS({ ...s, client: "pro" }))}
        {toggle("Démarché à domicile", s.domicile, () => setS({ ...s, domicile: !s.domicile }))}
        {toggle("Logement de plus de 2 ans", s.ancien, () => setS({ ...s, ancien: !s.ancien }))}
      </div>
      <div className="mt-4 rotate-[0.6deg] rounded-sm bg-papier p-5 shadow-[0_1px_0_#c8cdd3,0_18px_40px_-18px_rgba(26,31,38,0.45)] ring-1 ring-ardoise/10 sm:p-6">
        <div className="flex items-start justify-between border-b border-ardoise/10 pb-3">
          <div>
            <p className="font-semibold">Martin Peinture EI</p>
            <p className="text-[13px] text-ardoise-3">Réfection séjour, 45 m²</p>
          </div>
          <div className="text-right">
            <p className="display text-2xl text-bleu">DEVIS</p>
            <p className="text-[12px] text-ardoise-3">D2026-0042</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] font-semibold text-ardoise-2">
          {mentions.length} mentions obligatoires dans cette situation
        </p>
        <ul className="mt-2 space-y-1.5" aria-live="polite">
          {mentions.map((m) => (
            <li key={m.label} className="flex items-start gap-2 text-[14px]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-vert" aria-hidden />
              <span className="flex-1">{m.label}</span>
              <span className="whitespace-nowrap"><Ref>{m.ref}</Ref></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const PARCOURS = [
  { titre: "Vérifier sa qualification", texte: "Diplôme, années d'expérience : savoir tout de suite si la CMA validera votre métier.", to: "/outils/qualification", prix: "Gratuit" },
  { titre: "Choisir son statut", texte: "Micro, EI au réel ou SASU, avec le coût des cotisations et l'effet de l'ACRE.", to: "/outils/statut", prix: "Gratuit" },
  { titre: "Préparer le dossier INPI", texte: "Toutes les informations du Guichet unique, vos pièces et la déclaration de non-condamnation dans un seul PDF.", to: "/outils/inpi", prix: "Pack Lancement" },
  { titre: "Dimensionner la décennale", texte: "Plafonds conseillés et budget annuel avant d'appeler les assureurs.", to: "/outils/assurance", prix: "Pack Lancement" },
  { titre: "Envoyer des devis conformes", texte: "Mentions légales générées selon le client et le chantier, numérotation continue, archive.", to: "/outils/devis", prix: "Abonnement Pro" },
] as const;

function Accueil() {
  const changements = [
    { date: "2025-11-03", titre: "Seuils de franchise de TVA maintenus", texte: `Le seuil unique à 25 000 € est abandonné : ${formatMontant(TVA_FRANCHISE_PRESTATIONS.base)} pour les prestations (${formatMontant(TVA_FRANCHISE_PRESTATIONS.majore)} en seuil majoré).` },
    { date: FACTURE_ELECTRONIQUE.receptionToutesEntreprises, titre: "Réception des factures électroniques", texte: `Toutes les entreprises, micro comprises, doivent pouvoir recevoir des factures électroniques. Émission obligatoire pour les TPE au ${dateFr(FACTURE_ELECTRONIQUE.emissionTpePmeMicro)}.` },
    { date: ACRE.dateChangement, titre: "ACRE réduite à 25 %", texte: `Pour les micro-entrepreneurs, la réduction de cotisations passe de 50 % à 25 %, à demander sous ${ACRE.delaiDemandeJours} jours.` },
    { date: "2025-02-16", titre: "Fin des attestations TVA papier", texte: "Pour la TVA à 10 % ou 5,5 %, le client certifie désormais directement sur le devis signé." },
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <section className="border-b border-ardoise/10 bg-papier">
        <Container className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <h1 className="display text-[52px] sm:text-[72px] lg:text-[84px]">
              Créez votre entreprise du bâtiment. Facturez dans les règles.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ardoise-2">
              De la qualification au premier devis signé, Bâtipro applique la réglementation à jour à votre situation :
              métier, statut, client, chantier. Vous remplissez, il vérifie.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/outils/qualification" className="px-5 py-3 text-base">
                Tester ma qualification gratuitement
              </ButtonLink>
              <ButtonLink to="/tarifs" variant="secondary" className="px-5 py-3 text-base">
                Voir les tarifs
              </ButtonLink>
            </div>
            <p className="mt-4 text-[14px] text-ardoise-3">Sans carte bancaire. Conçu par un apprenti peintre du Loiret.</p>
          </div>
          <DevisVivant />
        </Container>
      </section>

      <section>
        <Container className="py-16">
          <h2 className="display text-5xl">Le parcours, dans l'ordre</h2>
          <p className="mt-3 max-w-2xl text-ardoise-2">
            Chaque étape reprend ce que vous avez saisi à la précédente. Les deux premières sont gratuites.
          </p>
          <ol className="mt-10 divide-y divide-ardoise/10 rounded-md bg-papier ring-1 ring-ardoise/10">
            {PARCOURS.map((p, i) => (
              <li key={p.to}>
                <Link to={p.to} className="group grid gap-2 px-5 py-5 sm:grid-cols-[4rem_1fr_10rem] sm:items-center sm:px-6">
                  <span className="display text-4xl text-ardoise/25 group-hover:text-bleu">{i + 1}</span>
                  <span>
                    <span className="block text-lg font-semibold group-hover:text-bleu">{p.titre}</span>
                    <span className="block text-ardoise-2">{p.texte}</span>
                  </span>
                  <span className="text-[14px] font-medium text-ardoise-3 sm:text-right">{p.prix}</span>
                </Link>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-ardoise text-white">
        <Container className="grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="display text-5xl">Ce qui a changé récemment</h2>
            <p className="mt-3 text-white/70">
              Les seuils, taux et mentions utilisés par les outils sont centralisés et datés. Quand la loi bouge, vos devis suivent.
            </p>
            <Link to="/reglementation" className="mt-5 inline-block font-semibold text-[#8dbaf0] underline underline-offset-4">
              Toutes les règles appliquées
            </Link>
          </div>
          <ol className="space-y-6 border-l border-white/15 pl-6">
            {changements.map((c) => (
              <li key={c.titre} className="relative">
                <span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#f26a1b]" aria-hidden />
                <p className="text-[13px] text-white/55">{dateFr(c.date)}</p>
                <p className="mt-0.5 text-lg font-semibold">{c.titre}</p>
                <p className="text-white/75">{c.texte}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section>
        <Container className="grid gap-10 py-16 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="display text-5xl">Un outil, pas un cabinet</h2>
            <p className="mt-3 text-ardoise-2">
              Bâtipro ne vous appelle pas et ne décide pas à votre place. Quand une question engage votre patrimoine ou dépasse un
              calcul (associés, conjoint, activité mixte au-delà de {formatMontant(MICRO_PLAFOND_PRESTATIONS.valeur)}), il vous
              le dit et vous oriente vers un professionnel.
            </p>
          </div>
          <FaqList items={FAQ_ACCUEIL} />
        </Container>
      </section>

      <section>
        <Container className="pb-4">
          <div className="flex flex-col items-start justify-between gap-6 rounded-md bg-bleu px-6 py-10 text-white sm:flex-row sm:items-center sm:px-10">
            <div>
              <h2 className="display text-4xl sm:text-5xl">Trois minutes pour savoir où vous en êtes</h2>
              <p className="mt-2 text-white/80">Le test de qualification et le simulateur de statut sont gratuits.</p>
            </div>
            <ButtonLink to="/outils/qualification" variant="secondary" className="shrink-0 border-0 px-5 py-3 text-base">
              Commencer le test
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
