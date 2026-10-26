// Modèle de devis BTP, calcul des totaux et construction des mentions
// légales. Utilisé par l'éditeur (aperçu) ET par l'Edge Function qui
// génère le PDF : l'aperçu et le document final ne peuvent pas diverger.

import {
  ASSURANCE,
  DECHETS,
  MEDIATION_SOURCE,
  MENTION_FRANCHISE_TVA,
  MENTION_PENALITES_B2B,
  PAIEMENT,
  RETRACTATION,
  TVA_PAR_NATURE,
  mentionTvaReduite,
  type NatureTravaux,
} from "./reglementation.ts";

export type FormeJuridique = "micro" | "ei" | "eurl" | "sarl" | "sasu" | "sas" | "autre";

export const FORMES: { value: FormeJuridique; label: string; individuelle: boolean }[] = [
  { value: "micro", label: "Micro-entreprise (EI)", individuelle: true },
  { value: "ei", label: "Entreprise individuelle (EI)", individuelle: true },
  { value: "eurl", label: "EURL", individuelle: false },
  { value: "sarl", label: "SARL", individuelle: false },
  { value: "sasu", label: "SASU", individuelle: false },
  { value: "sas", label: "SAS", individuelle: false },
  { value: "autre", label: "Autre", individuelle: false },
];

export const TAUX_TVA_LIGNE = [0, 5.5, 10, 20] as const;
export type TauxTva = (typeof TAUX_TVA_LIGNE)[number];

export interface LigneDevis {
  designation: string;
  unite: string;
  quantite: number;
  prixUnitaireHT: number;
  tva: TauxTva;
}

export interface DevisData {
  // Émetteur
  em_nom: string;
  em_forme: FormeJuridique;
  em_capital: string;
  em_adresse: string;
  em_siret: string;
  em_immatriculation: string; // RCS ville / RNE
  em_tva_intra: string;
  em_email: string;
  em_tel: string;
  em_franchise: boolean;
  em_assureur_nom: string;
  em_assureur_adresse: string;
  em_assureur_police: string;
  em_assureur_zone: string;
  em_qualification: string; // RGE, Qualibat…
  em_mediateur_nom: string;
  em_mediateur_site: string;
  em_logo_dataurl: string;
  // Client
  cl_type: "particulier" | "pro";
  cl_nom: string;
  cl_adresse: string;
  cl_email: string;
  cl_tel: string;
  cl_siret: string;
  cl_hors_etablissement: boolean;
  // Chantier
  ch_intitule: string;
  ch_adresse: string;
  ch_nature: NatureTravaux;
  ch_debut: string; // ISO date
  ch_duree: string;
  // Déchets (art. L541-21-2-3 C. env.)
  de_quantite: string;
  de_modalites: string;
  de_point_collecte: string;
  de_cout: number;
  // Lignes
  lignes: LigneDevis[];
  // Conditions
  co_acompte_pct: number;
  co_validite_jours: number;
  co_delai_paiement_jours: number;
  co_moyens: string[];
  co_devis_gratuit: boolean;
  co_notes: string;
}

export const DEVIS_VIDE: DevisData = {
  em_nom: "",
  em_forme: "micro",
  em_capital: "",
  em_adresse: "",
  em_siret: "",
  em_immatriculation: "",
  em_tva_intra: "",
  em_email: "",
  em_tel: "",
  em_franchise: true,
  em_assureur_nom: "",
  em_assureur_adresse: "",
  em_assureur_police: "",
  em_assureur_zone: "France métropolitaine",
  em_qualification: "",
  em_mediateur_nom: "",
  em_mediateur_site: "",
  em_logo_dataurl: "",
  cl_type: "particulier",
  cl_nom: "",
  cl_adresse: "",
  cl_email: "",
  cl_tel: "",
  cl_siret: "",
  cl_hors_etablissement: false,
  ch_intitule: "",
  ch_adresse: "",
  ch_nature: "reno",
  ch_debut: "",
  ch_duree: "",
  de_quantite: "",
  de_modalites: "Tri à la source (gravats inertes, bois, métaux, déchets non dangereux en mélange), évacuation par l'entreprise.",
  de_point_collecte: "",
  de_cout: 0,
  lignes: [
    { designation: "Protection des sols et mobilier, préparation du chantier", unite: "forfait", quantite: 1, prixUnitaireHT: 120, tva: 10 },
    { designation: "Main d'œuvre", unite: "h", quantite: 16, prixUnitaireHT: 45, tva: 10 },
    { designation: "Fournitures et matériaux", unite: "forfait", quantite: 1, prixUnitaireHT: 450, tva: 10 },
  ],
  co_acompte_pct: 30,
  co_validite_jours: 30,
  co_delai_paiement_jours: 0,
  co_moyens: ["virement"],
  co_devis_gratuit: true,
  co_notes: "",
};

export const MOYENS_PAIEMENT: { value: string; label: string }[] = [
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "cb", label: "Carte bancaire" },
  { value: "especes", label: "Espèces" },
];

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface TotauxDevis {
  totalHT: number;
  tvaParTaux: { taux: number; base: number; montant: number }[];
  totalTVA: number;
  totalTTC: number;
  acompte: number;
  solde: number;
}

export function tauxEffectif(d: Pick<DevisData, "em_franchise">, ligne: LigneDevis): number {
  return d.em_franchise ? 0 : Number(ligne.tva) || 0;
}

export function calculerTotaux(d: Pick<DevisData, "lignes" | "em_franchise" | "co_acompte_pct" | "de_cout">): TotauxDevis {
  const map = new Map<number, { base: number; montant: number }>();
  let totalHT = 0;
  for (const l of d.lignes) {
    const ht = r2((Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0));
    totalHT += ht;
    const t = tauxEffectif(d, l);
    const cur = map.get(t) ?? { base: 0, montant: 0 };
    cur.base += ht;
    cur.montant += (ht * t) / 100;
    map.set(t, cur);
  }
  const tvaParTaux = [...map.entries()]
    .filter(([t]) => t > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([taux, v]) => ({ taux, base: r2(v.base), montant: r2(v.montant) }));
  const totalTVA = r2(tvaParTaux.reduce((s, x) => s + x.montant, 0));
  totalHT = r2(totalHT);
  const totalTTC = r2(totalHT + totalTVA);
  const pct = Math.min(100, Math.max(0, Number(d.co_acompte_pct) || 0));
  const acompte = r2((totalTTC * pct) / 100);
  return { totalHT, tvaParTaux, totalTVA, totalTTC, acompte, solde: r2(totalTTC - acompte) };
}

export function estIndividuelle(forme: FormeJuridique): boolean {
  return FORMES.find((f) => f.value === forme)?.individuelle ?? false;
}

/** Nom de l'émetteur tel qu'il doit apparaître (mention « EI » obligatoire). */
export function nomEmetteur(d: Pick<DevisData, "em_nom" | "em_forme">): string {
  const nom = (d.em_nom || "").trim();
  if (!estIndividuelle(d.em_forme)) return nom;
  return /\bEI\b|entrepreneur individuel/i.test(nom) ? nom : `${nom} EI`;
}

export interface Probleme {
  champ: string;
  message: string;
  bloquant: boolean;
}

/** Contrôle de conformité : bloquant = mention légalement obligatoire manquante. */
export function verifierDevis(d: DevisData): Probleme[] {
  const p: Probleme[] = [];
  const req = (champ: keyof DevisData, message: string) => {
    if (!String(d[champ] ?? "").trim()) p.push({ champ, message, bloquant: true });
  };
  req("em_nom", "Nom ou raison sociale de l'entreprise");
  req("em_adresse", "Adresse de l'entreprise");
  req("em_siret", "Numéro SIREN / SIRET");
  req("em_assureur_nom", "Nom de l'assureur décennale (art. L243-2 C. assur.)");
  req("em_assureur_adresse", "Coordonnées de l'assureur décennale");
  req("em_assureur_police", "Numéro de police d'assurance");
  req("em_assureur_zone", "Couverture géographique de l'assurance");
  req("cl_nom", "Nom du client");
  req("cl_adresse", "Adresse du client");
  req("ch_intitule", "Intitulé des travaux");
  if (!d.lignes.length) p.push({ champ: "lignes", message: "Au moins une ligne de prestation", bloquant: true });
  d.lignes.forEach((l, i) => {
    if (!l.designation.trim()) p.push({ champ: "lignes", message: `Ligne ${i + 1} : désignation vide`, bloquant: true });
  });
  if (!d.em_franchise && !estIndividuelle(d.em_forme) && !d.em_tva_intra.trim())
    p.push({ champ: "em_tva_intra", message: "Numéro de TVA intracommunautaire", bloquant: false });
  if (!estIndividuelle(d.em_forme) && !d.em_capital.trim())
    p.push({ champ: "em_capital", message: "Capital social (société)", bloquant: true });
  if (d.cl_type === "particulier") {
    req("em_mediateur_nom", "Médiateur de la consommation (obligatoire face à un particulier)");
  }
  if (d.cl_type === "pro" && Number(d.co_delai_paiement_jours) > PAIEMENT.delaiMaxB2BJours)
    p.push({ champ: "co_delai_paiement_jours", message: `Délai de paiement entre pros : ${PAIEMENT.delaiMaxB2BJours} jours maximum`, bloquant: true });
  if (d.ch_nature !== "pro" && d.ch_nature !== "neuf" && d.cl_type === "pro")
    p.push({ champ: "ch_nature", message: "Taux réduit pour un client pro : vérifiez qu'il s'agit bien d'un logement", bloquant: false });
  if (!d.de_point_collecte.trim())
    p.push({ champ: "de_point_collecte", message: "Point de collecte des déchets (nom, adresse, type d'installation)", bloquant: false });
  if (d.co_moyens.includes("especes") && d.cl_type === "particulier")
    p.push({ champ: "co_moyens", message: `Espèces : ${PAIEMENT.plafondEspecesParticulier} € maximum par paiement pour un particulier résident`, bloquant: false });
  return p;
}

/** Mentions légales à imprimer en bas du devis, dans l'ordre. */
export function construireMentions(d: DevisData): string[] {
  const m: string[] = [];
  const totaux = calculerTotaux(d);
  if (d.em_franchise) m.push(MENTION_FRANCHISE_TVA);

  m.push(
    `Assurance décennale obligatoire souscrite auprès de ${d.em_assureur_nom || "[assureur]"}` +
      `${d.em_assureur_adresse ? ", " + d.em_assureur_adresse : ""}` +
      `${d.em_assureur_police ? " — contrat n° " + d.em_assureur_police : ""}` +
      ` — couverture géographique : ${d.em_assureur_zone || "[à préciser]"} (${ASSURANCE.mentionDevisSource}).`,
  );

  const reduits = new Set(
    d.lignes.map((l) => tauxEffectif(d, l)).filter((t): t is 10 | 5.5 => t === 10 || t === 5.5),
  );
  for (const t of [...reduits].sort()) m.push(`Attestation du client (TVA ${String(t).replace(".", ",")} %) : ${mentionTvaReduite(t)}`);

  m.push(
    `Gestion des déchets (${DECHETS.source}) : quantité estimée ${d.de_quantite || "[à préciser]"} ; ` +
      `${d.de_modalites || "modalités de tri et d'évacuation à préciser"} ; ` +
      `point de collecte : ${d.de_point_collecte || "[nom, adresse et type d'installation]"} ; ` +
      `coût estimé : ${Number(d.de_cout) > 0 ? `${Number(d.de_cout).toLocaleString("fr-FR")} € HT (inclus ci-dessus)` : "inclus dans les prestations"}.`,
  );

  const pct = Number(d.co_acompte_pct) || 0;
  if (pct > 0) m.push(`Acompte de ${pct} % à la signature, soit ${totaux.acompte.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € TTC ; solde à la réception des travaux.`);
  const delai = Number(d.co_delai_paiement_jours) || 0;
  m.push(delai > 0 ? `Paiement à ${delai} jours à compter de la date de facture.` : "Paiement du solde à réception des travaux.");
  if (d.co_moyens.length)
    m.push(`Moyens de paiement acceptés : ${d.co_moyens.map((v) => MOYENS_PAIEMENT.find((x) => x.value === v)?.label ?? v).join(", ")}.`);

  if (d.cl_type === "pro") m.push(MENTION_PENALITES_B2B);
  else m.push("En cas de retard de paiement, des intérêts au taux légal pourront être appliqués après mise en demeure.");

  if (d.cl_type === "particulier" && d.cl_hors_etablissement) {
    m.push(
      `Contrat conclu hors établissement : vous disposez d'un délai de rétractation de ${RETRACTATION.delaiJours} jours à compter de la signature, au moyen du formulaire joint. ` +
        `Aucun paiement ne peut être exigé avant l'expiration d'un délai de ${RETRACTATION.aucunPaiementAvantJours} jours. ` +
        `Les travaux ne peuvent débuter avant la fin du délai de rétractation que sur votre demande expresse (${RETRACTATION.source}).`,
    );
  }

  if (d.cl_type === "particulier") {
    m.push(
      `Médiation de la consommation : en cas de litige non résolu, le client peut saisir gratuitement ${d.em_mediateur_nom || "[médiateur]"}` +
        `${d.em_mediateur_site ? " (" + d.em_mediateur_site + ")" : ""} (${MEDIATION_SOURCE}).`,
    );
  }

  m.push(
    `Garanties légales après réception : parfait achèvement (${ASSURANCE.dureeParfaitAchevementAns} an), bon fonctionnement (${ASSURANCE.dureeBiennaleAns} ans) et décennale (${ASSURANCE.dureeDecennaleAns} ans).`,
  );
  m.push(d.co_devis_gratuit ? "Devis gratuit." : "Devis payant : son montant sera déduit de la facture en cas d'acceptation.");
  m.push(`Devis valable ${Number(d.co_validite_jours) || 30} jours à compter de sa date d'émission.`);
  return m;
}

/** Nettoie et borne les données reçues (côté serveur, ne jamais faire confiance au client). */
export function normaliserDevis(input: unknown): DevisData {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: DevisData = structuredClone(DEVIS_VIDE);
  const s = (k: keyof DevisData, max = 500) => {
    const v = src[k];
    return typeof v === "string" ? v.slice(0, max) : (out[k] as string);
  };
  const n = (k: keyof DevisData, min: number, max: number) => {
    const v = Number(src[k]);
    return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : (out[k] as number);
  };
  const b = (k: keyof DevisData) => (typeof src[k] === "boolean" ? (src[k] as boolean) : (out[k] as boolean));

  for (const k of [
    "em_nom", "em_capital", "em_adresse", "em_siret", "em_immatriculation", "em_tva_intra", "em_email", "em_tel",
    "em_assureur_nom", "em_assureur_adresse", "em_assureur_police", "em_assureur_zone", "em_qualification",
    "em_mediateur_nom", "em_mediateur_site", "cl_nom", "cl_adresse", "cl_email", "cl_tel", "cl_siret",
    "ch_intitule", "ch_adresse", "ch_debut", "ch_duree", "de_quantite", "de_modalites", "de_point_collecte",
  ] as const) {
    (out as unknown as Record<string, unknown>)[k] = s(k);
  }
  out.co_notes = s("co_notes", 2000);
  const logo = src.em_logo_dataurl;
  out.em_logo_dataurl =
    typeof logo === "string" && /^data:image\/(png|jpeg);base64,/.test(logo) && logo.length < 1_500_000 ? logo : "";
  out.em_forme = FORMES.some((f) => f.value === src.em_forme) ? (src.em_forme as FormeJuridique) : "micro";
  out.cl_type = src.cl_type === "pro" ? "pro" : "particulier";
  out.ch_nature = (["reno", "energie", "neuf", "pro"] as const).includes(src.ch_nature as NatureTravaux)
    ? (src.ch_nature as NatureTravaux)
    : "reno";
  out.em_franchise = b("em_franchise");
  out.cl_hors_etablissement = b("cl_hors_etablissement");
  out.co_devis_gratuit = b("co_devis_gratuit");
  out.co_acompte_pct = n("co_acompte_pct", 0, 100);
  out.co_validite_jours = n("co_validite_jours", 1, 365);
  out.co_delai_paiement_jours = n("co_delai_paiement_jours", 0, 365);
  out.de_cout = n("de_cout", 0, 10_000_000);
  out.co_moyens = Array.isArray(src.co_moyens)
    ? (src.co_moyens as unknown[]).filter((v): v is string => MOYENS_PAIEMENT.some((m) => m.value === v))
    : out.co_moyens;
  out.lignes = Array.isArray(src.lignes)
    ? (src.lignes as Record<string, unknown>[]).slice(0, 100).map((l) => ({
        designation: String(l?.designation ?? "").slice(0, 300),
        unite: String(l?.unite ?? "").slice(0, 20),
        quantite: Math.max(0, Math.min(1e6, Number(l?.quantite) || 0)),
        prixUnitaireHT: Math.max(-1e7, Math.min(1e7, Number(l?.prixUnitaireHT) || 0)),
        tva: (TAUX_TVA_LIGNE as readonly number[]).includes(Number(l?.tva)) ? (Number(l?.tva) as TauxTva) : 20,
      }))
    : out.lignes;
  return out;
}

export function tauxParDefaut(nature: NatureTravaux): TauxTva {
  return TVA_PAR_NATURE[nature] as TauxTva;
}
