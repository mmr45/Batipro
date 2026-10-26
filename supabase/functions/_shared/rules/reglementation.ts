// =====================================================================
// Référentiel réglementaire Bâtipro — SOURCE UNIQUE DE VÉRITÉ
// =====================================================================
// Tous les seuils, taux et références légales utilisés par le site ET par
// les Edge Functions (PDF) sont définis ici, une seule fois.
// Ce fichier est importé côté navigateur (Vite) et côté serveur (Deno) :
// il ne doit contenir que du TypeScript pur, sans dépendance.
//
// Pour mettre une règle à jour : modifier la valeur, la date `verifieLe`
// et la source, puis lancer `npm test`.
// =====================================================================

export const REGLES_VERSION = "2026-10-26";

export interface RegleSourcee<T> {
  valeur: T;
  libelle: string;
  source: string;
  verifieLe: string;
}

// ---------------------------------------------------------------------
// Micro-entreprise — plafonds de chiffre d'affaires (période 2026-2028)
// ---------------------------------------------------------------------
export const MICRO_PLAFOND_PRESTATIONS: RegleSourcee<number> = {
  valeur: 83_600,
  libelle: "Plafond micro-entreprise — prestations de services (cas général de l'artisan du bâtiment)",
  source: "art. 50-0 et 102 ter du CGI, plafonds revalorisés pour 2026-2028",
  verifieLe: REGLES_VERSION,
};

export const MICRO_PLAFOND_VENTE: RegleSourcee<number> = {
  valeur: 203_100,
  libelle: "Plafond micro-entreprise — vente de marchandises / activité mixte (dont 83 600 € max de prestations)",
  source: "art. 50-0 du CGI, plafonds revalorisés pour 2026-2028",
  verifieLe: REGLES_VERSION,
};

// ---------------------------------------------------------------------
// Franchise en base de TVA (art. 293 B du CGI)
// La réforme « seuil unique 25 000 € » (LF 2025) a été abrogée par la loi
// n° 2025-1044 du 3 novembre 2025 ; le seuil BTP à 25 000 € envisagé par
// le PLF 2026 n'a pas été adopté. Les seuils 2024 restent applicables.
// ---------------------------------------------------------------------
export const TVA_FRANCHISE_PRESTATIONS = {
  base: 37_500,
  majore: 41_250,
  libelle: "Franchise en base de TVA — prestations de services",
  source: "art. 293 B du CGI ; loi n° 2025-1044 du 3 novembre 2025",
  verifieLe: REGLES_VERSION,
} as const;

export const TVA_FRANCHISE_VENTE = {
  base: 85_000,
  majore: 93_500,
  libelle: "Franchise en base de TVA — ventes",
  source: "art. 293 B du CGI ; loi n° 2025-1044 du 3 novembre 2025",
  verifieLe: REGLES_VERSION,
} as const;

export const MENTION_FRANCHISE_TVA = "TVA non applicable, article 293 B du Code général des impôts.";

// ---------------------------------------------------------------------
// Cotisations sociales micro-entrepreneur 2026 (métropole)
// ---------------------------------------------------------------------
export const MICRO_TAUX_2026 = {
  // Prestations artisanales BIC : 21,2 % cotisations + 0,3 % formation pro (artisan)
  prestationsArtisan: 21.5,
  // Vente de marchandises : 12,3 % + 0,1 % formation pro
  vente: 12.4,
  // Option versement libératoire de l'impôt sur le revenu
  versementLiberatoirePrestations: 1.7,
  versementLiberatoireVente: 1.0,
  // Taxe pour frais de chambre de métiers (artisans), hors Alsace-Moselle
  taxeCmaArtisan: 0.48,
  libelle: "Taux micro-entrepreneur 2026 (formation professionnelle incluse)",
  source: "Urssaf / Bpifrance Création — taux 2026",
  verifieLe: REGLES_VERSION,
} as const;

// ---------------------------------------------------------------------
// ACRE — depuis le 1er juillet 2026 : réduction de 25 % (au lieu de 50 %)
// pour les micro-entrepreneurs, demande sous 60 jours après le début
// d'activité, durée jusqu'à la fin du 3e trimestre civil suivant.
// ---------------------------------------------------------------------
export const ACRE = {
  reductionMicro: 25, // en %
  dateChangement: "2026-07-01",
  delaiDemandeJours: 60,
  libelle: "ACRE micro-entrepreneur : réduction de 25 % des cotisations",
  source: "Décret relatif à l'ACRE, applicable aux créations depuis le 1er juillet 2026",
  verifieLe: REGLES_VERSION,
  conditions: [
    "Demandeur d'emploi indemnisé (ARE), ou bénéficiaire du RSA ou de l'ASS",
    "Demandeur d'emploi non indemnisé inscrit 6 mois au cours des 18 derniers mois",
    "Âgé de 18 à moins de 26 ans (moins de 30 ans si handicap reconnu)",
    "Création en quartier prioritaire (QPV) ou en zone France Ruralités Revitalisation",
    "Ne pas avoir bénéficié de l'ACRE au cours des 3 dernières années",
  ],
} as const;

// ---------------------------------------------------------------------
// TVA à taux réduit — travaux dans les logements de plus de 2 ans
// Depuis le 16 février 2025, l'attestation CERFA (1300-SD / 1301-SD) est
// supprimée : elle est remplacée par une mention certifiée par le client
// sur le devis ou la facture (BOFiP mis à jour le 22 octobre 2025).
// ---------------------------------------------------------------------
export const TVA_TAUX = {
  normal: 20,
  intermediaire: 10,
  reduit: 5.5,
} as const;

export type NatureTravaux = "reno" | "energie" | "neuf" | "pro";

export const TVA_PAR_NATURE: Record<NatureTravaux, number> = {
  reno: 10,
  energie: 5.5,
  neuf: 20,
  pro: 20,
};

export const NATURE_TRAVAUX_LABEL: Record<NatureTravaux, string> = {
  reno: "Logement achevé depuis plus de 2 ans — amélioration, entretien (TVA 10 %)",
  energie: "Logement de plus de 2 ans — rénovation énergétique (TVA 5,5 %)",
  neuf: "Construction neuve ou logement de moins de 2 ans (TVA 20 %)",
  pro: "Locaux professionnels ou autre (TVA 20 %)",
};

export function mentionTvaReduite(taux: 10 | 5.5): string {
  const base =
    "Je soussigné(e) ……………………………… certifie, en qualité de preneur de la prestation, que les travaux réalisés concernent des locaux à usage d'habitation achevés depuis plus de deux ans et n'ont pas eu pour effet, sur une période de deux ans au plus, de concourir à la production d'un immeuble neuf au sens du 2° du 2 du I de l'article 257 du CGI, ni d'entraîner une augmentation de la surface de plancher des locaux existants supérieure à 10 %";
  return taux === 5.5
    ? `${base}, et qu'ils ont la nature de travaux de rénovation énergétique (art. 278-0 bis A du CGI).`
    : `${base} (art. 279-0 bis du CGI).`;
}

export const TVA_REDUITE_SOURCE = {
  source: "Loi de finances pour 2025 ; BOFiP BOI-TVA-LIQ-30-20-90 (mise à jour du 22/10/2025)",
  dateSuppressionAttestation: "2025-02-16",
} as const;

// ---------------------------------------------------------------------
// Paiement & retards
// ---------------------------------------------------------------------
export const PAIEMENT = {
  delaiMaxB2BJours: 60, // ou 45 jours fin de mois
  indemniteRecouvrementB2B: 40,
  plafondEspecesParticulier: 1_000,
  source: "art. L441-10 et D441-5 du C. com. ; art. D112-3 du C. mon. et fin.",
  verifieLe: REGLES_VERSION,
} as const;

export const MENTION_PENALITES_B2B =
  "En cas de retard de paiement, pénalités de retard exigibles de plein droit au taux de la BCE majoré de 10 points (ne pouvant être inférieur à trois fois le taux d'intérêt légal), et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce).";

// ---------------------------------------------------------------------
// Démarchage / contrat hors établissement (particulier)
// ---------------------------------------------------------------------
export const RETRACTATION = {
  delaiJours: 14,
  aucunPaiementAvantJours: 7,
  source: "art. L221-5, L221-10, L221-18 et L221-28 du Code de la consommation",
} as const;

// ---------------------------------------------------------------------
// Assurance construction
// ---------------------------------------------------------------------
export const ASSURANCE = {
  decennaleSource: "art. L241-1 du Code des assurances (loi Spinetta)",
  mentionDevisSource: "art. L243-2 du Code des assurances",
  dureeDecennaleAns: 10,
  dureeParfaitAchevementAns: 1,
  dureeBiennaleAns: 2,
} as const;

// ---------------------------------------------------------------------
// Déchets de chantier — mentions obligatoires sur le devis depuis le
// 1er juillet 2021 (loi AGEC).
// ---------------------------------------------------------------------
export const DECHETS = {
  source: "art. L541-21-2-3 et D541-45-1 du Code de l'environnement",
  dateApplication: "2021-07-01",
} as const;

// ---------------------------------------------------------------------
// Facturation électronique
// ---------------------------------------------------------------------
export const FACTURE_ELECTRONIQUE = {
  receptionToutesEntreprises: "2026-09-01",
  emissionTpePmeMicro: "2027-09-01",
  source: "art. 289 bis du CGI ; calendrier de la réforme de la facturation électronique",
  verifieLe: REGLES_VERSION,
} as const;

// ---------------------------------------------------------------------
// Qualification professionnelle (activités artisanales réglementées)
// ---------------------------------------------------------------------
export const QUALIFICATION = {
  experienceMinAns: 3,
  niveauDiplomeMin: 3, // CAP / BEP
  source:
    "Code de l'artisanat, art. L121-1 et suivants (ex-art. 16 de la loi n° 96-603 du 5 juillet 1996, recodifié au 1er juillet 2023)",
} as const;

// ---------------------------------------------------------------------
// Mentions d'identification
// ---------------------------------------------------------------------
export const MENTION_EI_SOURCE = "art. R526-27 du Code de commerce";

export const MEDIATION_SOURCE = "art. L612-1 et L616-1 du Code de la consommation";

export function formatEuro(n: number, decimals = 2): string {
  const v = Number.isFinite(n) ? n : 0;
  return (
    v.toLocaleString("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + " €"
  );
}

export function formatMontant(n: number): string {
  return formatEuro(n, 0);
}
