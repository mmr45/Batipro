// Données du dossier d'immatriculation (préparation au Guichet unique INPI,
// procedures.inpi.fr). Bâtipro ne transmet rien : il prépare les réponses et
// les pièces que l'entrepreneur saisit et téléverse lui-même.
import { METIERS } from "./metiers.ts";
import { ACRE } from "./reglementation.ts";

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
  // Filiation (demandée par la déclaration de non-condamnation)
  perePrenom: string;
  pereNom: string;
  merePrenom: string;
  mereNomNaissance: string;
  situationMatrimoniale: "celibataire" | "marie_communaute" | "marie_separation" | "pacse" | "";
  /** Rôle du conjoint ou partenaire de PACS qui travaille dans l'entreprise (EI). */
  conjointRole: "aucun" | "collaborateur" | "salarie";
  forme: FormeInpi;
  denomination: string;
  metier: string;
  activite: string;
  ape: string;
  dateDebut: string;
  // Qualification professionnelle (activités réglementées)
  qualifPar: "moi" | "salarie";
  qualifNom: string;
  qualifPreuve: "diplome" | "experience";
  // Options fiscales et sociales
  periodicite: "mensuelle" | "trimestrielle";
  tva: "franchise" | "reel";
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
  // Domicile personnel, si le siège n'est pas au domicile
  adressePerso: string;
  codePostalPerso: string;
  villePerso: string;
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
  perePrenom: "",
  pereNom: "",
  merePrenom: "",
  mereNomNaissance: "",
  situationMatrimoniale: "",
  conjointRole: "aucun",
  forme: "micro",
  denomination: "",
  metier: "",
  activite: "",
  ape: "",
  dateDebut: "",
  qualifPar: "moi",
  qualifNom: "",
  qualifPreuve: "diplome",
  periodicite: "trimestrielle",
  tva: "franchise",
  capital: "1000",
  apports: "numeraire",
  cloture: "31/12",
  banque: "",
  adresse: "",
  codePostal: "",
  ville: "",
  local: "domicile",
  adressePerso: "",
  codePostalPerso: "",
  villePerso: "",
  acre: false,
  versementLiberatoire: false,
  honneur: false,
};

/** Valeurs admises pour les champs à choix (le reste est du texte libre). */
const ENUMS: Partial<Record<keyof InpiData, readonly string[]>> = {
  civilite: ["M.", "Mme", ""],
  situationMatrimoniale: ["celibataire", "marie_communaute", "marie_separation", "pacse", ""],
  conjointRole: ["aucun", "collaborateur", "salarie"],
  forme: ["micro", "ei", "sasu"],
  qualifPar: ["moi", "salarie"],
  qualifPreuve: ["diplome", "experience"],
  periodicite: ["mensuelle", "trimestrielle"],
  tva: ["franchise", "reel"],
  apports: ["numeraire", "nature", "mixte"],
  local: ["domicile", "local_pro", "domiciliation"],
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

export const SITUATION_LABEL: Record<InpiData["situationMatrimoniale"], string> = {
  celibataire: "Célibataire",
  marie_communaute: "Marié(e) sous un régime de communauté",
  marie_separation: "Marié(e) sous séparation de biens",
  pacse: "Pacsé(e)",
  "": "—",
};

export const CONJOINT_LABEL: Record<InpiData["conjointRole"], string> = {
  aucun: "Ne travaille pas dans l'entreprise",
  collaborateur: "Conjoint collaborateur",
  salarie: "Conjoint salarié",
};

/** Le conjoint ou partenaire de PACS est concerné (EI uniquement). */
export function aUnConjoint(d: Pick<InpiData, "situationMatrimoniale">): boolean {
  return d.situationMatrimoniale === "marie_communaute" || d.situationMatrimoniale === "marie_separation" || d.situationMatrimoniale === "pacse";
}

export function metierReglemente(slug: string): boolean {
  const m = METIERS.find((x) => x.slug === slug);
  return !m || m.reglemente;
}

// ---------------------------------------------------------------------
// Pièces justificatives
// ---------------------------------------------------------------------

export type PieceKey =
  | "identite"
  | "domicile"
  | "qualification"
  | "statuts"
  | "depot_fonds"
  | "annonce_legale"
  | "conjoint"
  | "dnc";

export interface PieceDef {
  key: PieceKey;
  label: string;
  aide: string;
  /** Pièce produite par Bâtipro (rien à téléverser chez nous). */
  generee?: boolean;
}

/** Format accepté par le Guichet unique : un fichier PDF par pièce, lisible, non protégé. */
export const FORMAT_PIECES = {
  format: "PDF",
  tailleMaxMo: 10,
  regle: "Un fichier PDF par pièce, lisible, non protégé par mot de passe, en français (ou traduit).",
} as const;

export const PIECES: PieceDef[] = [
  { key: "identite", label: "Pièce d'identité", aide: "Carte d'identité ou passeport en cours de validité (recto et verso), ou titre de séjour autorisant à exercer une activité indépendante." },
  {
    key: "domicile",
    label: "Justificatif d'adresse de l'entreprise",
    aide: "Facture d'énergie ou de téléphone fixe de moins de 3 mois, bail, titre de propriété, ou contrat de domiciliation. Hébergé par un tiers : attestation d'hébergement signée et sa pièce d'identité.",
  },
  {
    key: "qualification",
    label: "Justificatif de qualification professionnelle",
    aide: "Diplôme ou titre du métier (CAP, BEP, BP, titre RNCP…), ou 3 ans d'expérience : certificats de travail et bulletins de paie, ou attestations Urssaf si vous étiez indépendant.",
  },
  { key: "statuts", label: "Statuts signés", aide: "Statuts de la SASU datés et signés par l'associé unique." },
  { key: "depot_fonds", label: "Attestation de dépôt des fonds", aide: "Délivrée par la banque ou le notaire après le dépôt du capital en numéraire." },
  { key: "annonce_legale", label: "Attestation de parution de l'annonce légale", aide: "Remise par le journal d'annonces légales du département du siège." },
  {
    key: "conjoint",
    label: "Attestation d'information du conjoint commun en biens",
    aide: "Le conjoint marié sous un régime de communauté atteste avoir été informé des conséquences des dettes professionnelles sur les biens communs.",
  },
  {
    key: "dnc",
    label: "Déclaration de non-condamnation et de filiation",
    aide: "Pré-remplie par Bâtipro avec votre filiation : imprimez, datez, signez à la main puis scannez en PDF (moins de 3 mois au moment du dépôt).",
    generee: true,
  },
];

export function piecesRequises(d: Pick<InpiData, "forme" | "situationMatrimoniale" | "metier">): PieceKey[] {
  const req: PieceKey[] = ["identite", "domicile", "dnc"];
  if (metierReglemente(d.metier)) req.push("qualification");
  if (d.forme === "sasu") req.push("statuts", "depot_fonds", "annonce_legale");
  if (d.forme !== "sasu" && d.situationMatrimoniale === "marie_communaute") req.push("conjoint");
  return req;
}

/** Aide adaptée au cas de l'utilisateur pour une pièce donnée. */
export function aidePiece(p: PieceDef, d: Pick<InpiData, "qualifPar" | "qualifNom" | "qualifPreuve" | "local" | "forme">): string {
  if (p.key === "qualification") {
    const qui = d.qualifPar === "salarie" ? `de la personne qualifiée (${d.qualifNom || "votre salarié"}), avec son contrat de travail à temps plein` : "à votre nom";
    const quoi =
      d.qualifPreuve === "experience"
        ? "Certificats de travail et bulletins de paie couvrant 3 ans d'expérience dans le métier (ou attestations Urssaf pour une activité indépendante)"
        : "Copie du diplôme ou du titre homologué du métier (CAP, BEP, BP, titre RNCP de niveau équivalent ou supérieur)";
    return `${quoi}, ${qui}.`;
  }
  if (p.key === "domicile") {
    if (d.local === "domiciliation") return "Contrat de domiciliation signé avec la société de domiciliation agréée.";
    if (d.local === "local_pro") return "Bail commercial ou professionnel, ou titre de propriété du local.";
    return p.aide;
  }
  return p.aide;
}

// ---------------------------------------------------------------------
// Coûts et délais (montants à vérifier chaque année)
// ---------------------------------------------------------------------

export interface LigneCout {
  libelle: string;
  montant: string;
}

export const COUTS_SOURCE = {
  source: "Tarifs réglementés des greffes 2026 ; arrêté fixant le forfait des annonces légales ; procedures.inpi.fr",
  verifieLe: "2026-11-01",
};

export function coutsCreation(forme: FormeInpi): LigneCout[] {
  if (forme === "sasu")
    return [
      { libelle: "Immatriculation au RCS (frais de greffe, payés sur le Guichet unique)", montant: "environ 36 € TTC" },
      { libelle: "Déclaration des bénéficiaires effectifs", montant: "environ 21 € TTC" },
      { libelle: "Annonce légale de constitution (forfait fixé par arrêté, selon le département)", montant: "environ 150 à 200 € HT" },
      { libelle: "Rédaction des statuts par un professionnel (facultatif)", montant: "Libre" },
    ];
  return [
    { libelle: "Déclaration de création sur le Guichet unique (inscription au Registre national des entreprises)", montant: "Gratuite" },
    { libelle: "Stage de préparation à l'installation de la CMA", montant: "Facultatif depuis 2019" },
  ];
}

export const DELAIS = "Dossier complet : SIRET en 1 à 3 semaines en général. Activité réglementée : la CMA vérifie la qualification, comptez souvent 3 à 6 semaines. Une pièce manquante ou illisible relance le délai.";

// ---------------------------------------------------------------------
// Fiche de saisie : les réponses à reporter, dans l'ordre du formulaire
// ---------------------------------------------------------------------

export interface LigneSaisie {
  q: string;
  r: string;
  aide?: string;
}

export interface RubriqueSaisie {
  titre: string;
  lignes: LigneSaisie[];
}

function dateFrCourte(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "—";
}

function adresseSiege(d: InpiData): string {
  return [d.adresse, [d.codePostal, d.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—";
}

function adresseDomicile(d: InpiData): string {
  if (d.local === "domicile") return adresseSiege(d);
  return [d.adressePerso, [d.codePostalPerso, d.villePerso].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—";
}

/**
 * Réponses à recopier sur procedures.inpi.fr, regroupées dans l'ordre où le
 * formulaire les demande. Les intitulés exacts du site peuvent évoluer.
 */
export function ficheSaisie(d: InpiData): RubriqueSaisie[] {
  const metier = METIERS.find((m) => m.slug === d.metier);
  const sasu = d.forme === "sasu";
  const reglemente = metierReglemente(d.metier);
  const nomPerso = `${d.prenom} ${d.nom}`.trim();
  const out: RubriqueSaisie[] = [];

  out.push({
    titre: "Type de formalité",
    lignes: [
      { q: "Démarche", r: "Créer une entreprise" },
      sasu
        ? { q: "Type d'entreprise", r: "Société — SAS à associé unique (SASU)" }
        : { q: "Type d'entreprise", r: "Entrepreneur individuel" },
      ...(!sasu ? [{ q: "Micro-entrepreneur", r: d.forme === "micro" ? "Oui" : "Non (régime réel)" }] : []),
    ],
  });

  const identite: LigneSaisie[] = [
    { q: "Civilité", r: d.civilite === "Mme" ? "Madame" : d.civilite === "M." ? "Monsieur" : "—" },
    { q: "Nom de naissance", r: d.nom.toUpperCase() || "—" },
    { q: "Nom d'usage", r: d.nomUsage || "Aucun" },
    { q: "Prénom(s)", r: d.prenom || "—", aide: "Tous les prénoms, dans l'ordre de l'état civil." },
    { q: "Date de naissance", r: dateFrCourte(d.dateNaissance) },
    { q: "Lieu de naissance", r: `${d.villeNaissance || "—"} (${d.paysNaissance || "—"})` },
    { q: "Nationalité", r: d.nationalite || "—" },
    { q: "Adresse de domicile personnel", r: adresseDomicile(d) },
  ];
  if (!sasu) {
    identite.push({ q: "Situation matrimoniale", r: SITUATION_LABEL[d.situationMatrimoniale] });
    if (aUnConjoint(d))
      identite.push({
        q: "Rôle du conjoint / partenaire",
        r: CONJOINT_LABEL[d.conjointRole],
        aide: d.conjointRole === "aucun" ? undefined : "Son identité et son numéro de sécurité sociale vous seront demandés.",
      });
  }
  out.push({ titre: sasu ? "Président (associé unique)" : "L'entrepreneur", lignes: identite });

  if (sasu) {
    out.push({
      titre: "La société",
      lignes: [
        { q: "Dénomination sociale", r: d.denomination || "—" },
        { q: "Forme", r: "Société par actions simplifiée unipersonnelle" },
        { q: "Capital social", r: `${d.capital || "—"} €, ${{ numeraire: "apports en numéraire", nature: "apports en nature", mixte: "apports en numéraire et en nature" }[d.apports]}` },
        { q: "Durée", r: "99 ans (selon vos statuts)" },
        { q: "Date de clôture du premier exercice", r: d.cloture || "31/12" },
        { q: "Objet social", r: d.activite || "—", aide: "Reprenez l'article « Objet » de vos statuts." },
        { q: "Bénéficiaire effectif", r: `${nomPerso} — détient 100 % du capital et des droits de vote` },
      ],
    });
  }

  out.push({
    titre: "Établissement et activité",
    lignes: [
      { q: sasu ? "Adresse du siège" : "Adresse de l'entreprise", r: adresseSiege(d), aide: "Publique au Registre national des entreprises." },
      { q: "Le siège est", r: LOCAL_LABEL[d.local] },
      { q: "Date de début d'activité", r: dateFrCourte(d.dateDebut) },
      ...(sasu ? [] : [{ q: "Nom commercial", r: d.denomination || "Aucun (vous exercez sous votre nom)" }]),
      { q: "Origine de l'activité", r: "Création" },
      { q: "Nature de l'activité", r: "Artisanale", aide: "Les travaux du bâtiment relèvent de l'artisanat : la Chambre de Métiers et de l'Artisanat est votre interlocuteur." },
      {
        q: "Description de l'activité principale",
        r: d.activite || "—",
        aide: "Gardez exactement le même libellé que sur votre attestation décennale.",
      },
      { q: "Code APE (proposé par le site)", r: d.ape || (metier ? `${metier.ape} — ${metier.apeLabel}` : "—"), aide: "Indicatif : l'INSEE l'attribue définitivement." },
    ],
  });

  if (reglemente) {
    out.push({
      titre: "Qualification professionnelle",
      lignes: [
        {
          q: "Personne qui contrôle l'activité",
          r: d.qualifPar === "salarie" ? `Un salarié qualifié : ${d.qualifNom || "—"}` : `${nomPerso} (le dirigeant)`,
          aide: "Métier réglementé : un diplôme du métier ou 3 ans d'expérience sont exigés pour l'exercer ou le contrôler.",
        },
        {
          q: "Justificatif",
          r: d.qualifPreuve === "experience" ? "3 ans d'expérience professionnelle dans le métier" : "Diplôme ou titre du métier",
        },
      ],
    });
  }

  const fiscal: LigneSaisie[] = [];
  if (d.forme === "micro") {
    fiscal.push(
      { q: "Régime d'imposition", r: "Micro-entreprise (micro-BIC)" },
      {
        q: "Versement libératoire de l'impôt",
        r: d.versementLiberatoire ? "Oui" : "Non",
        aide: d.versementLiberatoire ? "Possible seulement si le revenu fiscal de référence de l'avant-dernière année respecte le plafond." : undefined,
      },
      { q: "TVA", r: "Franchise en base de TVA" },
      { q: "Déclaration du chiffre d'affaires", r: d.periodicite === "mensuelle" ? "Mensuelle" : "Trimestrielle" },
    );
  } else if (d.forme === "ei") {
    fiscal.push(
      { q: "Régime d'imposition", r: "Bénéfices industriels et commerciaux (BIC), régime réel simplifié", aide: "L'option pour l'impôt sur les sociétés est possible : à valider avec votre expert-comptable." },
      { q: "TVA", r: d.tva === "franchise" ? "Franchise en base de TVA" : "Régime réel simplifié de TVA" },
    );
  } else {
    fiscal.push(
      { q: "Régime d'imposition", r: "Impôt sur les sociétés (IS), régime réel simplifié" },
      { q: "TVA", r: d.tva === "franchise" ? "Franchise en base de TVA" : "Régime réel simplifié de TVA" },
      { q: "Régime social du président", r: "Assimilé salarié (régime général), s'il est rémunéré" },
    );
  }
  if (!sasu && d.acre)
    fiscal.push({
      q: "ACRE",
      r: "Je la demande",
      aide: `Si le formulaire ne la propose pas, faites la demande à l'Urssaf au plus tard ${ACRE.delaiDemandeJours} jours après le début d'activité.`,
    });
  out.push({ titre: "Options fiscales et sociales", lignes: fiscal });

  return out;
}

// ---------------------------------------------------------------------
// Étapes et vérifications
// ---------------------------------------------------------------------

/** Dispense de commissaire aux apports en SASU (art. L227-1 et R227-1 du Code de commerce). */
export const APPORT_NATURE_SANS_COMMISSAIRE = 30_000;

export interface EtapeInpi {
  titre: string;
  detail: string;
}

/** Étapes à suivre après la génération du dossier, selon la forme. */
export function etapesApres(d: Pick<InpiData, "forme" | "acre" | "apports">): EtapeInpi[] {
  const e: EtapeInpi[] = [];
  if (d.forme === "sasu") {
    e.push(
      { titre: "Rédiger et signer les statuts", detail: "Un avocat ou un expert-comptable peut les rédiger. Ils fixent l'objet social, le capital, le siège et le président." },
      ...(d.apports !== "numeraire"
        ? [{ titre: "Évaluer les apports en nature", detail: `Commissaire aux apports obligatoire, sauf si aucun apport ne dépasse ${APPORT_NATURE_SANS_COMMISSAIRE.toLocaleString("fr-FR")} € et que leur total reste sous la moitié du capital (art. L227-1 du Code de commerce).` }]
        : []),
      { titre: "Déposer le capital", detail: "Ouvrez un compte professionnel et déposez le capital : la banque vous remet l'attestation de dépôt des fonds." },
      { titre: "Publier l'annonce légale", detail: "Auprès d'un journal habilité du département du siège ; gardez l'attestation de parution." },
    );
  }
  e.push(
    { titre: "Créer votre compte sur procedures.inpi.fr", detail: "Le Guichet unique est le seul site officiel pour déclarer une création. Méfiez-vous des sites qui le copient." },
    { titre: "Reporter les réponses de la fiche de saisie", detail: "Rubrique par rubrique : les réponses sont rangées dans l'ordre du formulaire." },
    { titre: "Signer la déclaration de non-condamnation", detail: "Imprimez-la, datez, signez à la main et scannez-la en PDF." },
    { titre: "Téléverser une pièce par case puis signer", detail: "Les fichiers du dossier « pieces » sont déjà en PDF. La signature électronique valide l'envoi." },
    { titre: "Suivre le dossier et recevoir votre SIRET", detail: "Répondez vite si une pièce est demandée. L'INSEE attribue ensuite le SIREN, le SIRET et le code APE." },
  );
  if (d.acre && d.forme !== "sasu")
    e.push({ titre: `Demander l'ACRE dans les ${ACRE.delaiDemandeJours} jours`, detail: `Si elle n'a pas été demandée dans le formulaire : demande à l'Urssaf au plus tard ${ACRE.delaiDemandeJours} jours après le début d'activité.` });
  e.push({ titre: "Souscrire la décennale avant le premier chantier", detail: "Obligatoire dès l'ouverture du chantier, attestation à mentionner sur chaque devis." });
  return e;
}

/** Points qui feraient rejeter ou retarder le dossier. */
export function pointsDeVigilance(d: InpiData, piecesDeposees: PieceKey[]): string[] {
  const v: string[] = [];
  for (const k of piecesRequises(d)) {
    const p = PIECES.find((x) => x.key === k)!;
    if (!p.generee && !piecesDeposees.includes(k)) v.push(`Pièce à préparer : ${p.label.toLowerCase()}.`);
  }
  if (!d.perePrenom || !d.pereNom || !d.merePrenom || !d.mereNomNaissance)
    v.push("Filiation incomplète : complétez à la main la déclaration de non-condamnation.");
  if (d.local !== "domicile" && !d.adressePerso) v.push("Adresse de domicile personnel manquante : elle est demandée en plus de celle de l'entreprise.");
  if (d.activite.trim().length < 15) v.push("Description de l'activité trop vague : détaillez les travaux, comme sur votre attestation décennale.");
  if (metierReglemente(d.metier) && d.qualifPar === "salarie" && !d.qualifNom) v.push("Indiquez le nom du salarié qualifié qui contrôle l'activité.");
  if (d.forme === "sasu" && !d.denomination) v.push("Dénomination de la SASU manquante.");
  return v;
}

export function normaliserInpi(input: unknown): InpiData {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out = structuredClone(INPI_VIDE) as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(INPI_VIDE)) {
    const val = src[k];
    if (typeof v === "boolean") out[k] = typeof val === "boolean" ? val : v;
    else out[k] = typeof val === "string" ? val.slice(0, 400) : v;
    const allowed = ENUMS[k as keyof InpiData];
    if (allowed && !allowed.includes(out[k] as string)) out[k] = v;
  }
  const d = out as unknown as InpiData;
  if (d.forme === "micro") d.tva = "franchise";
  return d;
}
