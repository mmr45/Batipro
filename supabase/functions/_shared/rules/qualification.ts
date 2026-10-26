import { QUALIFICATION } from "./reglementation.ts";
import { exigencesPour, getMetier, type Exigence } from "./metiers.ts";

export type Diplome = "aucun" | "cap_bep" | "bac_pro" | "bts_sup";

export const DIPLOMES: { value: Diplome; label: string; niveau: number }[] = [
  { value: "aucun", label: "Aucun diplôme dans ce métier", niveau: 0 },
  { value: "cap_bep", label: "CAP / BEP dans le métier (ou titre de niveau 3)", niveau: 3 },
  { value: "bac_pro", label: "Bac pro / BP dans le métier", niveau: 4 },
  { value: "bts_sup", label: "BTS / BUT / diplôme supérieur dans le métier", niveau: 5 },
];

export interface QualifInput {
  metier: string;
  diplome: Diplome;
  experienceAns: number;
  diplomeUE: boolean;
}

export type QualifStatus = "eligible" | "presque" | "non";

export interface QualifResult {
  status: QualifStatus;
  titre: string;
  raisons: string[];
  conseils: string[];
  exigences: Exigence[];
  metierLabel: string;
  source: string;
}

export function evaluerQualification(input: QualifInput): QualifResult {
  const metier = getMetier(input.metier);
  if (!metier) throw new Error("Métier inconnu");
  const diplome = DIPLOMES.find((d) => d.value === input.diplome) ?? DIPLOMES[0];
  const exp = Math.max(0, Math.floor(Number(input.experienceAns) || 0));
  const exigences = exigencesPour(metier.slug);
  const base = { exigences, metierLabel: metier.label, source: QUALIFICATION.source };

  if (!metier.reglemente) {
    return {
      ...base,
      status: "eligible",
      titre: "Vous pouvez immatriculer votre entreprise",
      raisons: [
        `« ${metier.label} » n'est pas une activité soumise à qualification professionnelle obligatoire.`,
      ],
      conseils: [
        "Vérifiez avec la Chambre de Métiers que votre activité réelle ne relève pas d'un métier réglementé (électricité, plomberie, maçonnerie…).",
        "Dès que vous réalisez des travaux de construction, l'assurance décennale est obligatoire.",
      ],
    };
  }

  const okDiplome = diplome.niveau >= QUALIFICATION.niveauDiplomeMin;
  const okExp = exp >= QUALIFICATION.experienceMinAns;
  const okUE = !!input.diplomeUE;

  if (okDiplome || okExp || okUE) {
    const raisons: string[] = [];
    if (okDiplome) raisons.push(`Diplôme validant : ${diplome.label}.`);
    if (okExp)
      raisons.push(
        `${exp} ans d'expérience effective dans le métier (minimum légal : ${QUALIFICATION.experienceMinAns} ans).`,
      );
    if (okUE) raisons.push("Qualification obtenue dans un autre État de l'UE / EEE, à faire reconnaître par la CMA.");
    return {
      ...base,
      status: "eligible",
      titre: "Vous remplissez la condition de qualification",
      raisons,
      conseils: [
        "La Chambre de Métiers et de l'Artisanat (CMA) contrôle votre qualification lors de l'immatriculation : préparez diplôme, certificats de travail ou bulletins de paie.",
      ],
    };
  }

  if (exp >= 1) {
    const manque = QUALIFICATION.experienceMinAns - exp;
    return {
      ...base,
      status: "presque",
      titre: "Presque : il vous manque un peu d'expérience",
      raisons: [
        `« ${metier.label} » est une activité réglementée : il faut un CAP/BEP (ou équivalent) OU ${QUALIFICATION.experienceMinAns} ans d'expérience.`,
        `Vous cumulez ${exp} an${exp > 1 ? "s" : ""} : il vous manque ${manque} an${manque > 1 ? "s" : ""}.`,
      ],
      conseils: [
        "Une VAE (validation des acquis de l'expérience) ou un CAP en candidat libre permet d'obtenir le diplôme plus vite.",
        "Vous pouvez aussi vous associer à une personne qualifiée qui assure le contrôle effectif et permanent de l'activité.",
      ],
    };
  }

  return {
    ...base,
    status: "non",
    titre: "Vous ne pouvez pas encore immatriculer cette activité",
    raisons: [
      `« ${metier.label} » est une activité réglementée (${QUALIFICATION.source}).`,
      "Aucune condition n'est remplie : ni diplôme de niveau CAP/BEP, ni 3 ans d'expérience, ni qualification européenne.",
    ],
    conseils: [
      "Passer un CAP dans le métier : apprentissage, formation adulte ou candidat libre.",
      "Cumuler 3 ans d'expérience comme salarié du métier avant de vous installer.",
      "Ou exercer avec une personne qualifiée (salarié ou associé) qui contrôle effectivement l'activité.",
    ],
  };
}
