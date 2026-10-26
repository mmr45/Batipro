import {
  ACRE,
  MICRO_PLAFOND_PRESTATIONS,
  MICRO_PLAFOND_VENTE,
  MICRO_TAUX_2026,
  TVA_FRANCHISE_PRESTATIONS,
  formatMontant,
} from "./reglementation.ts";

export type TrancheCA = "lt_tva" | "tva_micro" | "au_dela_micro" | "gros";
export type Statut = "micro" | "ei" | "sasu";

export interface StatutInput {
  ca: TrancheCA;
  associes: boolean;
  patrimoine: boolean;
  social: "tns" | "assimile" | "indifferent";
  achatsImportants: boolean;
}

const F = TVA_FRANCHISE_PRESTATIONS.base;
const P = MICRO_PLAFOND_PRESTATIONS.valeur;
const V = MICRO_PLAFOND_VENTE.valeur;

export const TRANCHES_CA: { value: TrancheCA; label: string; sub: string }[] = [
  { value: "lt_tva", label: `Moins de ${formatMontant(F)}`, sub: "Démarrage progressif, sous le seuil de franchise de TVA" },
  { value: "tva_micro", label: `${formatMontant(F)} – ${formatMontant(P)}`, sub: "Micro possible, mais vous facturez la TVA" },
  { value: "au_dela_micro", label: `${formatMontant(P)} – ${formatMontant(V)}`, sub: "Au-delà du plafond micro pour les prestations" },
  { value: "gros", label: `Plus de ${formatMontant(V)}`, sub: "Activité soutenue, salariés envisagés" },
];

export const STATUT_LABEL: Record<Statut, string> = {
  micro: "Micro-entreprise",
  ei: "Entreprise individuelle (EI) au réel",
  sasu: "SASU",
};

export const STATUT_RESUME: Record<Statut, string> = {
  micro:
    "Cotisations calculées sur le chiffre d'affaires encaissé, comptabilité allégée, franchise de TVA sous les seuils.",
  ei: "Pas de capital, patrimoine personnel protégé de plein droit, déduction des charges réelles (régime réel).",
  sasu: "Société à associé unique : dirigeant assimilé-salarié, impôt sur les sociétés, prête à accueillir des associés (SAS).",
};

export interface StatutResult {
  statut: Statut;
  label: string;
  resume: string;
  confiance: number;
  raisons: string[];
  scores: Record<Statut, number>;
  validationExpert: boolean;
  alertes: string[];
  estimationMicro: {
    tauxCotisations: number;
    tauxAvecAcre: number;
    exempleCA: number;
    cotisationsAnnuelles: number;
    cotisationsAvecAcre: number;
  };
}

export function evaluerStatut(input: StatutInput): StatutResult {
  const scores: Record<Statut, number> = { micro: 0, ei: 0, sasu: 0 };
  const raisons: Record<Statut, string[]> = { micro: [], ei: [], sasu: [] };
  const alertes: string[] = [];

  if (input.associes) {
    scores.sasu += 8;
    raisons.sasu.push("Vous voulez vous associer : la SASU devient une SAS sans changer de structure.");
    scores.micro -= 10;
    scores.ei -= 10;
  }

  switch (input.ca) {
    case "lt_tva":
      scores.micro += 5;
      raisons.micro.push(`CA sous ${formatMontant(F)} : franchise de TVA et formalités minimales.`);
      scores.ei += 1;
      break;
    case "tva_micro":
      scores.micro += 3;
      raisons.micro.push(`CA sous le plafond micro (${formatMontant(P)}) mais au-dessus de la franchise : vous facturerez la TVA.`);
      scores.ei += 2;
      raisons.ei.push("Au réel, vos achats de matériaux et votre outillage viennent réduire le bénéfice imposable.");
      break;
    case "au_dela_micro":
      scores.micro -= 6;
      raisons.ei.push(`CA au-delà de ${formatMontant(P)} : la micro n'est plus possible pour des prestations, l'EI au réel prend le relais.`);
      scores.ei += 4;
      scores.sasu += 3;
      alertes.push(
        `Le plafond de ${formatMontant(V)} ne vaut que pour une activité de vente ou mixte, avec ${formatMontant(P)} maximum de prestations.`,
      );
      break;
    case "gros":
      scores.micro -= 10;
      scores.sasu += 5;
      raisons.sasu.push("CA élevé : la SASU permet d'arbitrer entre salaire et dividendes et de préparer l'embauche.");
      scores.ei += 2;
      break;
  }

  if (input.patrimoine) {
    scores.sasu += 1;
    scores.ei += 1;
    raisons.ei.push("Depuis le 15 mai 2022, le patrimoine personnel de l'entrepreneur individuel est protégé de plein droit.");
    raisons.sasu.push("Responsabilité limitée au montant des apports.");
  }

  if (input.social === "tns") {
    scores.micro += 2;
    scores.ei += 2;
    raisons.ei.push("Régime des indépendants : cotisations plus faibles qu'en assimilé-salarié.");
    scores.sasu -= 2;
  } else if (input.social === "assimile") {
    scores.sasu += 5;
    raisons.sasu.push("Vous voulez la protection sociale d'un salarié (hors chômage) : seule la SASU le permet.");
    scores.micro -= 3;
    scores.ei -= 3;
  }

  if (input.achatsImportants) {
    scores.ei += 2;
    scores.sasu += 2;
    scores.micro -= 3;
    raisons.ei.push("Achats importants : au réel, vous déduisez les charges et récupérez la TVA.");
    raisons.sasu.push("TVA récupérable et charges déductibles dès le départ.");
  } else {
    scores.micro += 2;
    raisons.micro.push("Peu d'achats : un abattement forfaitaire sur le CA reste avantageux.");
  }

  const tri = (Object.entries(scores) as [Statut, number][]).sort((a, b) => b[1] - a[1]);
  const [premier, second] = tri;
  const statut = premier[0];
  const ecart = premier[1] - second[1];
  const confiance = Math.max(40, Math.min(95, Math.round(60 + ecart * 7)));
  const validationExpert =
    ecart <= 1 || (statut === "sasu" && input.ca === "lt_tva") || input.ca === "gros";

  if (statut === "micro") {
    alertes.push(
      `Surveillez votre CA : au-delà de ${formatMontant(TVA_FRANCHISE_PRESTATIONS.majore)} encaissés dans l'année, la TVA est due dès le jour du dépassement.`,
    );
  }

  const exempleCA = input.ca === "lt_tva" ? 30_000 : 60_000;
  const taux = MICRO_TAUX_2026.prestationsArtisan;
  const tauxAcre = Math.round(taux * (1 - ACRE.reductionMicro / 100) * 100) / 100;

  return {
    statut,
    label: STATUT_LABEL[statut],
    resume: STATUT_RESUME[statut],
    confiance,
    raisons: raisons[statut],
    scores,
    validationExpert,
    alertes,
    estimationMicro: {
      tauxCotisations: taux,
      tauxAvecAcre: tauxAcre,
      exempleCA,
      cotisationsAnnuelles: Math.round((exempleCA * taux) / 100),
      cotisationsAvecAcre: Math.round((exempleCA * tauxAcre) / 100),
    },
  };
}
