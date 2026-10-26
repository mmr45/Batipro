// Données du dossier d'immatriculation (préparation au Guichet unique INPI).
import { METIERS } from "./metiers.ts";

export type FormeInpi = "micro" | "ei" | "sasu";

export interface InpiData {
  civilite: "M." | "Mme" | "";
  prenom: string;
  nom: string;
  nomUsage: string;
  dateNaissance: string;
  villeNaissance: string;
  paysNaissance: string;
  nationalite: string;
  email: string;
  telephone: string;
  situationMatrimoniale: "celibataire" | "marie_communaute" | "marie_separation" | "pacse" | "";
  forme: FormeInpi;
  denomination: string;
  metier: string;
  activite: string;
  ape: string;
  dateDebut: string;
  // SASU
  capital: string;
  apports: "numeraire" | "nature" | "mixte";
  cloture: string;
  banque: string;
  // Siège
  adresse: string;
  codePostal: string;
  ville: string;
  local: "domicile" | "local_pro" | "domiciliation";
  // Options
  acre: boolean;
  versementLiberatoire: boolean;
  honneur: boolean;
}

export const INPI_VIDE: InpiData = {
  civilite: "",
  prenom: "",
  nom: "",
  nomUsage: "",
  dateNaissance: "",
  villeNaissance: "",
  paysNaissance: "France",
  nationalite: "Française",
  email: "",
  telephone: "",
  situationMatrimoniale: "",
  forme: "micro",
  denomination: "",
  metier: "",
  activite: "",
  ape: "",
  dateDebut: "",
  capital: "1000",
  apports: "numeraire",
  cloture: "31/12",
  banque: "",
  adresse: "",
  codePostal: "",
  ville: "",
  local: "domicile",
  acre: false,
  versementLiberatoire: false,
  honneur: false,
};

export const FORME_INPI_LABEL: Record<FormeInpi, string> = {
  micro: "Micro-entreprise (entrepreneur individuel)",
  ei: "Entreprise individuelle (EI) au réel",
  sasu: "SASU",
};

export const LOCAL_LABEL = {
  domicile: "Domicile du dirigeant",
  local_pro: "Local professionnel",
  domiciliation: "Société de domiciliation",
} as const;

export type PieceKey = "identite" | "domicile" | "qualification" | "statuts" | "depot_fonds" | "conjoint" | "annonce_legale";

export interface PieceDef {
  key: PieceKey;
  label: string;
  aide: string;
}

export const PIECES: PieceDef[] = [
  { key: "identite", label: "Pièce d'identité", aide: "Carte d'identité, passeport ou titre de séjour en cours de validité (recto-verso)." },
  { key: "domicile", label: "Justificatif d'adresse du siège", aide: "Facture de moins de 3 mois, bail, ou contrat de domiciliation." },
  { key: "qualification", label: "Justificatif de qualification", aide: "Diplôme (CAP, BEP…) ou certificats de travail / bulletins de paie couvrant 3 ans." },
  { key: "statuts", label: "Statuts signés", aide: "Statuts de la SASU datés et signés." },
  { key: "depot_fonds", label: "Attestation de dépôt des fonds", aide: "Délivrée par la banque après dépôt du capital." },
  { key: "annonce_legale", label: "Attestation de parution de l'annonce légale", aide: "Remise par le journal d'annonces légales." },
  { key: "conjoint", label: "Attestation d'information du conjoint", aide: "Si vous êtes marié(e) sous un régime de communauté." },
];

export function piecesRequises(d: Pick<InpiData, "forme" | "situationMatrimoniale" | "metier">): PieceKey[] {
  const req: PieceKey[] = ["identite", "domicile"];
  const metier = METIERS.find((m) => m.slug === d.metier);
  if (!metier || metier.reglemente) req.push("qualification");
  if (d.forme === "sasu") req.push("statuts", "depot_fonds", "annonce_legale");
  if (d.forme !== "sasu" && d.situationMatrimoniale === "marie_communaute") req.push("conjoint");
  return req;
}

export interface EtapeInpi {
  titre: string;
  detail: string;
}

/** Étapes à suivre après la génération du dossier, selon la forme. */
export function etapesApres(d: Pick<InpiData, "forme" | "acre">): EtapeInpi[] {
  const e: EtapeInpi[] = [];
  if (d.forme === "sasu") {
    e.push(
      { titre: "Déposer le capital", detail: "Ouvrez un compte professionnel et déposez le capital : la banque vous remet l'attestation de dépôt des fonds." },
      { titre: "Publier l'annonce légale", detail: "Auprès d'un journal habilité du département du siège." },
    );
  }
  e.push(
    { titre: "Créer votre compte sur procedures.inpi.fr", detail: "Le Guichet unique est le seul canal officiel pour immatriculer une entreprise." },
    { titre: "Reporter les informations du dossier", detail: "Recopiez les éléments de ce récapitulatif dans le formulaire « Création d'entreprise »." },
    { titre: "Téléverser les pièces et signer", detail: "La signature électronique valide la déclaration. La CMA contrôle ensuite votre qualification." },
    { titre: "Recevoir votre SIRET", detail: "L'INSEE attribue votre SIREN/SIRET et le code APE ; vous pouvez alors facturer." },
  );
  if (d.acre)
    e.push({ titre: "Demander l'ACRE dans les 60 jours", detail: "Micro-entrepreneur : demande à faire auprès de l'Urssaf dans les 60 jours suivant le début d'activité." });
  e.push({ titre: "Souscrire la décennale avant le premier chantier", detail: "Obligatoire dès l'ouverture du chantier, attestation à mentionner sur chaque devis." });
  return e;
}

export function normaliserInpi(input: unknown): InpiData {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = structuredClone(INPI_VIDE) as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(INPI_VIDE)) {
    const val = src[k];
    if (typeof v === "boolean") out[k] = typeof val === "boolean" ? val : v;
    else out[k] = typeof val === "string" ? val.slice(0, 400) : v;
  }
  const d = out as unknown as InpiData;
  if (!["micro", "ei", "sasu"].includes(d.forme)) d.forme = "micro";
  return d;
}
