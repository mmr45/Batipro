import { createFileRoute } from "@tanstack/react-router";
import { Container, PageHeader } from "@/components/ui";
import { seo } from "@/lib/seo";
import { dateFr } from "@/lib/utils";
import {
  ACRE,
  ASSURANCE,
  DECHETS,
  FACTURE_ELECTRONIQUE,
  MEDIATION_SOURCE,
  MENTION_EI_SOURCE,
  MICRO_PLAFOND_PRESTATIONS,
  MICRO_PLAFOND_VENTE,
  MICRO_TAUX_2026,
  PAIEMENT,
  QUALIFICATION,
  REGLES_VERSION,
  RETRACTATION,
  TVA_FRANCHISE_PRESTATIONS,
  TVA_FRANCHISE_VENTE,
  TVA_REDUITE_SOURCE,
  formatMontant,
} from "@rules/reglementation.ts";

export const Route = createFileRoute("/reglementation")({
  head: () =>
    seo({
      title: "Règles appliquées par Bâtipro (2026)",
      description: "Plafonds micro, franchise de TVA, cotisations, ACRE, TVA réduite, mentions de devis : toutes les valeurs utilisées, avec leurs sources.",
      path: "/reglementation",
    }),
  component: Page,
});

const pct = (n: number) => `${String(n).replace(".", ",")} %`;

function Page() {
  const groupes: { titre: string; lignes: [string, string, string][] }[] = [
    {
      titre: "Micro-entreprise",
      lignes: [
        ["Plafond de chiffre d'affaires, prestations", formatMontant(MICRO_PLAFOND_PRESTATIONS.valeur), MICRO_PLAFOND_PRESTATIONS.source],
        ["Plafond, vente ou activité mixte", formatMontant(MICRO_PLAFOND_VENTE.valeur), MICRO_PLAFOND_VENTE.source],
        ["Cotisations, prestations artisanales", pct(MICRO_TAUX_2026.prestationsArtisan), MICRO_TAUX_2026.source],
        ["Cotisations, vente de marchandises", pct(MICRO_TAUX_2026.vente), MICRO_TAUX_2026.source],
        ["Versement libératoire, prestations", pct(MICRO_TAUX_2026.versementLiberatoirePrestations), "art. 151-0 du CGI"],
        ["Taxe pour frais de chambre de métiers", pct(MICRO_TAUX_2026.taxeCmaArtisan), "art. 1601 du CGI"],
        ["ACRE micro, depuis le " + dateFr(ACRE.dateChangement), `−${ACRE.reductionMicro} %, demande sous ${ACRE.delaiDemandeJours} jours`, ACRE.source],
      ],
    },
    {
      titre: "TVA",
      lignes: [
        ["Franchise, prestations", `${formatMontant(TVA_FRANCHISE_PRESTATIONS.base)} (majoré ${formatMontant(TVA_FRANCHISE_PRESTATIONS.majore)})`, TVA_FRANCHISE_PRESTATIONS.source],
        ["Franchise, ventes", `${formatMontant(TVA_FRANCHISE_VENTE.base)} (majoré ${formatMontant(TVA_FRANCHISE_VENTE.majore)})`, TVA_FRANCHISE_VENTE.source],
        ["Logement de plus de 2 ans", "10 %", "art. 279-0 bis du CGI"],
        ["Rénovation énergétique", "5,5 %", "art. 278-0 bis A du CGI"],
        ["Attestation CERFA du client", `supprimée depuis le ${dateFr(TVA_REDUITE_SOURCE.dateSuppressionAttestation)}, remplacée par une mention signée`, TVA_REDUITE_SOURCE.source],
      ],
    },
    {
      titre: "Devis et paiement",
      lignes: [
        ["Mention « EI » pour un entrepreneur individuel", "obligatoire", MENTION_EI_SOURCE],
        ["Assurance décennale sur devis et factures", "assureur, coordonnées, couverture géographique", ASSURANCE.mentionDevisSource],
        ["Gestion des déchets", `obligatoire depuis le ${dateFr(DECHETS.dateApplication)}`, DECHETS.source],
        ["Médiateur de la consommation", "obligatoire face à un particulier", MEDIATION_SOURCE],
        ["Rétractation hors établissement", `${RETRACTATION.delaiJours} jours, aucun paiement avant ${RETRACTATION.aucunPaiementAvantJours} jours`, RETRACTATION.source],
        ["Délai de paiement entre professionnels", `${PAIEMENT.delaiMaxB2BJours} jours maximum`, PAIEMENT.source],
        ["Indemnité de recouvrement entre professionnels", `${PAIEMENT.indemniteRecouvrementB2B} €`, PAIEMENT.source],
        ["Paiement en espèces, particulier", `${formatMontant(PAIEMENT.plafondEspecesParticulier)} maximum`, PAIEMENT.source],
      ],
    },
    {
      titre: "Création et activité",
      lignes: [
        ["Qualification pour un métier réglementé", `CAP/BEP ou ${QUALIFICATION.experienceMinAns} ans d'expérience`, QUALIFICATION.source],
        ["Assurance décennale", "obligatoire avant l'ouverture du chantier", ASSURANCE.decennaleSource],
        ["Réception des factures électroniques", `toutes entreprises depuis le ${dateFr(FACTURE_ELECTRONIQUE.receptionToutesEntreprises)}`, FACTURE_ELECTRONIQUE.source],
        ["Émission des factures électroniques", `TPE et micro au ${dateFr(FACTURE_ELECTRONIQUE.emissionTpePmeMicro)}`, FACTURE_ELECTRONIQUE.source],
      ],
    },
  ];

  return (
    <>
      <PageHeader
        title="Les règles appliquées"
        rubrique="Règles 2026"
        intro={`Toutes les valeurs utilisées par les outils et imprimées sur vos documents, avec leur source. Dernière vérification le ${dateFr(REGLES_VERSION)}.`}
      />
      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[13rem_1fr]">
        <nav aria-label="Rubriques" className="hidden lg:block">
          <ol className="sticky top-24 space-y-0.5 border-l border-encre/10 text-[14px]">
            {groupes.map((g, i) => (
              <li key={g.titre}>
                <a href={`#r${i}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-encre-2 transition-colors hover:border-bleu hover:text-encre">
                  {g.titre}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 space-y-12">
        {groupes.map((g, i) => (
          <section key={g.titre} id={`r${i}`}>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="display text-[24px] sm:text-[26px]">{g.titre}</h2>
              <span className="text-[13px] font-medium text-encre-3">{g.lignes.length} règles</span>
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl bg-papier shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-sm)]">
              <table className="w-full min-w-[44rem] table-fixed text-left text-[14.5px]">
                <colgroup>
                  <col className="w-[36%]" />
                  <col className="w-[28%]" />
                  <col />
                </colgroup>
                <thead className="border-b border-encre/[0.07] bg-enduit/50 text-[12.5px] text-encre-3">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Règle</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Valeur</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-encre/[0.05]">
                  {g.lignes.map(([k, v, s]) => (
                    <tr key={k} className="align-top transition-colors hover:bg-enduit/40">
                      <th scope="row" className="px-5 py-3.5 font-medium">{k}</th>
                      <td className="px-3 py-3.5 font-semibold tabular-nums">{v}</td>
                      <td className="px-5 py-3.5 text-[13px] leading-snug"><span className="ref !text-[12px]">{s}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        <p className="max-w-3xl text-[14px] text-encre-3">
          Ces informations sont générales. En cas de doute sur votre situation, l'Urssaf, le service des impôts des entreprises et la
          Chambre de Métiers et de l'Artisanat restent les interlocuteurs officiels.
        </p>
        </div>
      </Container>
    </>
  );
}
