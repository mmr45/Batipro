import { ASSURANCE } from "./reglementation.ts";
import { getMetier } from "./metiers.ts";

export type TrancheCAAssur = "lt50" | "50_150" | "150_500" | "gt500";
export type Effectif = "0" | "1_2" | "3_5" | "6plus";
export type Sinistres = "0" | "1" | "2plus";
export type RisqueOption = "hauteur" | "erp" | "sous_traitance" | "amiante";

export interface AssurInput {
  metier: string;
  ca: TrancheCAAssur;
  effectif: Effectif;
  sinistres: Sinistres;
  risques: RisqueOption[];
}

export interface Garantie {
  label: string;
  valeur: string;
  note: string;
}

export interface AssurResult {
  metierLabel: string;
  niveauRisque: number;
  rcProConseilleK: number;
  decennaleHorsHabitationK: number;
  primeBasse: number;
  primeHaute: number;
  raisons: string[];
  alertes: string[];
  garanties: Garantie[];
}

// Plafonds de référence (k€ par sinistre) selon le niveau de risque.
const RC_K = { 1: 300, 2: 500, 3: 750, 4: 1000, 5: 1500 } as const;
const DEC_K = { 1: 500, 2: 800, 3: 1200, 4: 1500, 5: 2000 } as const;
const CA_MULT: Record<TrancheCAAssur, number> = { lt50: 1, "50_150": 1.15, "150_500": 1.4, gt500: 1.7 };
const CA_MEDIAN: Record<TrancheCAAssur, number> = { lt50: 30_000, "50_150": 100_000, "150_500": 300_000, gt500: 700_000 };
const EFF_MULT: Record<Effectif, number> = { "0": 1, "1_2": 1.2, "3_5": 1.5, "6plus": 1.9 };
const SIN_ADD: Record<Sinistres, number> = { "0": 0, "1": 1, "2plus": 2 };

const arrondi = (n: number, pas: number) => Math.round(n / pas) * pas;

export function evaluerAssurance(input: AssurInput): AssurResult {
  const metier = getMetier(input.metier) ?? getMetier("autre")!;
  const bonus = (input.risques.includes("hauteur") ? 1 : 0) + (input.risques.includes("erp") ? 1 : 0);
  const niveau = Math.max(1, Math.min(5, metier.risque + Math.floor(bonus / 1.5))) as 1 | 2 | 3 | 4 | 5;
  const caMult = CA_MULT[input.ca];
  const effMult = EFF_MULT[input.effectif];
  const sin = SIN_ADD[input.sinistres];

  const rcProConseilleK = Math.round(RC_K[niveau] * caMult);
  const decennaleHorsHabitationK = Math.round(DEC_K[niveau] * caMult);

  const ca = CA_MEDIAN[input.ca];
  let primeBasse = arrondi(ca * (0.008 + niveau * 0.004) * effMult * (1 + 0.15 * sin), 50);
  let primeHaute = arrondi(ca * (0.015 + niveau * 0.008) * effMult * (1 + 0.25 * sin), 50);
  primeBasse = Math.max(primeBasse, 600 + niveau * 150);
  primeHaute = Math.max(primeHaute, primeBasse + 400);

  const raisons = [
    `Métier « ${metier.label} » : niveau de risque technique ${niveau}/5.`,
    `Coefficient chiffre d'affaires × effectif appliqué : ×${(caMult * effMult).toFixed(2)}.`,
  ];
  if (sin) raisons.push("Sinistres déclarés sur 5 ans : majoration probable de la prime.");
  if (input.risques.includes("hauteur")) raisons.push("Travaux en hauteur : exposition renforcée.");
  if (input.risques.includes("erp")) raisons.push("Chantiers ERP / tertiaire : dommages potentiels plus lourds.");

  const alertes = [
    `La garantie décennale est obligatoire avant l'ouverture du chantier (${ASSURANCE.decennaleSource}).`,
    "L'attestation doit lister précisément vos activités : une activité non déclarée n'est pas couverte.",
    `Vos devis et factures doivent mentionner l'assurance, les coordonnées de l'assureur et la couverture géographique (${ASSURANCE.mentionDevisSource}).`,
  ];
  if (input.risques.includes("amiante"))
    alertes.push("Amiante / plomb : certification spécifique requise, et extension de garantie à négocier explicitement.");
  if (input.risques.includes("sous_traitance"))
    alertes.push("Sous-traitance : exigez et conservez 10 ans l'attestation décennale de chaque sous-traitant.");

  const garanties: Garantie[] = [
    {
      label: "Décennale — ouvrages d'habitation",
      valeur: "Coût total des réparations",
      note: "Pas de plafond possible pour les logements : la garantie couvre la réparation intégrale.",
    },
    {
      label: "Décennale — ouvrages hors habitation",
      valeur: `≥ ${decennaleHorsHabitationK.toLocaleString("fr-FR")} k€ par sinistre`,
      note: "Plafond conseillé, à ajuster selon le montant de vos plus gros chantiers.",
    },
    {
      label: "RC professionnelle",
      valeur: `≥ ${rcProConseilleK.toLocaleString("fr-FR")} k€ par sinistre`,
      note: "Dommages causés aux tiers pendant le chantier — non obligatoire mais indispensable.",
    },
    {
      label: "Parfait achèvement",
      valeur: `${ASSURANCE.dureeParfaitAchevementAns} an après réception`,
      note: "Due par l'entreprise elle-même (non assurée) : réparer les désordres signalés.",
    },
    {
      label: "Bon fonctionnement (biennale)",
      valeur: `${ASSURANCE.dureeBiennaleAns} ans après réception`,
      note: "Équipements dissociables : volets, robinetterie, radiateurs…",
    },
  ];

  return {
    metierLabel: metier.label,
    niveauRisque: niveau,
    rcProConseilleK,
    decennaleHorsHabitationK,
    primeBasse,
    primeHaute,
    raisons,
    alertes,
    garanties,
  };
}
