import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { A4, C, LARGEUR, MARGE, Pdf, dateFr } from "./pdf.ts";
import {
  COUTS_SOURCE,
  DELAIS,
  FORMAT_PIECES,
  FORME_INPI_LABEL,
  PIECES,
  coutsCreation,
  etapesApres,
  ficheSaisie,
  piecesRequises,
  pointsDeVigilance,
  type InpiData,
  type PieceKey,
} from "./rules/inpi.ts";

export interface PieceJointe {
  key: PieceKey;
  nom: string;
  mime: string;
  bytes: Uint8Array;
}

/** Libellé / valeur sur deux colonnes, les deux pouvant passer à la ligne. */
function ligne(pdf: Pdf, label: string, value: string, lw: number, aide?: string) {
  const size = 9.5;
  const lh = size * 1.38;
  const gauche = pdf.wrap(label, size, lw - 10);
  const droite = pdf.wrap(value || "—", size, LARGEUR - lw);
  const n = Math.max(gauche.length, droite.length);
  pdf.ensure(lh * n);
  for (let i = 0; i < n; i++) {
    if (gauche[i]) pdf.page.drawText(gauche[i], { x: MARGE, y: pdf.y - size, size, font: pdf.font, color: C.gris });
    if (droite[i]) pdf.page.drawText(droite[i], { x: MARGE + lw, y: pdf.y - size, size, font: pdf.font, color: C.encre });
    pdf.y -= lh;
  }
  if (aide) pdf.text(aide, { size: 7.8, color: C.grisClair, x: MARGE + lw });
  pdf.space(2.5);
}

const INDEPENDANCE =
  "Bâtipro est un service privé, indépendant de l'INPI, de l'INSEE et des Chambres de Métiers. Il ne transmet aucune déclaration : vous la faites vous-même, sur procedures.inpi.fr, seul site officiel.";

/** Fiche de saisie : réponses à reporter sur le Guichet unique, pièces, coûts et étapes. */
export async function buildFichePdf(d: InpiData, ref: string, deposees: PieceKey[]): Promise<Uint8Array> {
  const pdf = await Pdf.create(`Bâtipro — ${ref} — document préparatoire, non transmis à l'INPI`);
  const logo = await pdf.logo();
  const top = pdf.y;
  if (logo) pdf.drawImageFit(logo, MARGE, top, 36, 36);
  pdf.at("Fiche de saisie — Guichet unique INPI", MARGE + 46, top - 15, { size: 15, bold: true });
  pdf.at(`${FORME_INPI_LABEL[d.forme]} · Réf. ${ref} · préparée le ${dateFr(new Date())}`, MARGE + 46, top - 29, { size: 8.5, color: C.gris });
  pdf.y = top - 48;
  pdf.text(
    "Ouvrez procedures.inpi.fr à côté de cette fiche et reportez les réponses rubrique par rubrique. Les intitulés du site peuvent légèrement varier : en cas de doute, la notice du Guichet unique fait foi.",
    { size: 9, color: C.gris },
  );
  pdf.space(2);
  pdf.text(INDEPENDANCE, { size: 8.2, color: C.grisClair });
  pdf.space(4);

  const vigilance = pointsDeVigilance(d, deposees);
  if (vigilance.length) {
    pdf.heading("À régler avant de commencer");
    for (const v of vigilance) pdf.text(`• ${v}`, { size: 9.2, color: C.orange });
  }

  ficheSaisie(d).forEach((rub, i) => {
    pdf.heading(`${i + 1}. ${rub.titre}`);
    for (const l of rub.lignes) ligne(pdf, l.q, l.r, 170, l.aide);
  });

  pdf.heading("Pièces justificatives");
  pdf.text(`${FORMAT_PIECES.regle} ${FORMAT_PIECES.tailleMaxMo} Mo maximum par fichier.`, { size: 8.5, color: C.gris });
  pdf.space(3);
  for (const k of piecesRequises(d)) {
    const p = PIECES.find((x) => x.key === k)!;
    const etat = p.generee ? "Dans ce dossier, à signer" : deposees.includes(k) ? "Prête (dossier « pieces »)" : "À préparer";
    ligne(pdf, p.label, etat, 300);
  }

  pdf.heading("Coûts et délais");
  for (const c of coutsCreation(d.forme)) ligne(pdf, c.libelle, c.montant, 330);
  pdf.space(3);
  pdf.text(DELAIS, { size: 8.5, color: C.gris });
  pdf.text(`Montants indicatifs (${COUTS_SOURCE.source}), vérifiés le ${dateFr(COUTS_SOURCE.verifieLe)}.`, { size: 7.5, color: C.grisClair });

  pdf.heading("Étapes, dans l'ordre");
  etapesApres(d).forEach((e, i) => {
    pdf.text(`${i + 1}. ${e.titre}`, { size: 9.5, bold: true });
    pdf.text(e.detail, { size: 8.8, color: C.gris, x: MARGE + 12 });
    pdf.space(3);
  });

  pdf.space(6);
  pdf.text(
    "Ce document est une aide à la préparation. Il ne constitue pas un conseil juridique ou fiscal personnalisé et ne vaut pas immatriculation. Vous restez responsable de l'exactitude des informations déclarées.",
    { size: 7.8, color: C.grisClair },
  );
  return pdf.finalize();
}

/** Déclaration de non-condamnation et de filiation, à signer à la main. */
export async function buildDncPdf(d: InpiData): Promise<Uint8Array> {
  const pdf = await Pdf.create("Déclaration à dater et signer à la main, puis à téléverser en PDF sur procedures.inpi.fr");
  const blanc = "……………………………";
  pdf.text("Déclaration sur l'honneur de non-condamnation", { size: 14, bold: true });
  pdf.text("et attestation de filiation", { size: 11, color: C.gris });
  pdf.space(14);
  const ident = `${d.civilite} ${d.prenom} ${d.nom}`.trim() || blanc;
  const domicile = d.local === "domicile" || !d.adressePerso ? [d.adresse, d.codePostal, d.ville] : [d.adressePerso, d.codePostalPerso, d.villePerso];
  const qualite = d.forme === "sasu" ? `en qualité de Président de la société ${d.denomination || blanc} (en cours de constitution)` : "en qualité d'entrepreneur individuel";
  const body = [
    `Je soussigné(e) ${ident}${d.nomUsage ? ` (nom d'usage : ${d.nomUsage})` : ""},`,
    `né(e) le ${d.dateNaissance ? dateFr(d.dateNaissance) : blanc} à ${d.villeNaissance || blanc} (${d.paysNaissance || blanc}),`,
    `de nationalité ${d.nationalite || blanc},`,
    `demeurant ${domicile.filter(Boolean).join(" ") || blanc},`,
    `agissant ${qualite},`,
    "",
    `fils / fille de : ${[d.perePrenom, d.pereNom.toUpperCase()].filter(Boolean).join(" ") || blanc} (père)`,
    `et de : ${[d.merePrenom, d.mereNomNaissance.toUpperCase()].filter(Boolean).join(" ") || blanc} (mère, nom de naissance),`,
    "",
    "déclare sur l'honneur n'avoir fait l'objet d'aucune condamnation pénale ni de sanction civile ou administrative de nature à m'interdire de gérer, administrer ou diriger une personne morale ou d'exercer une activité commerciale ou artisanale.",
  ];
  for (const l of body) {
    if (!l) pdf.space(8);
    else pdf.text(l, { size: 10.5, lineHeight: 15.5 });
  }
  pdf.space(30);
  pdf.text(`Fait à ${d.ville || blanc}, le ${blanc}`, { size: 10.5 });
  pdf.space(24);
  pdf.text("Signature manuscrite :", { size: 10.5 });
  pdf.space(70);
  pdf.text("Une fausse déclaration expose à des sanctions pénales (art. 441-7 du Code pénal).", { size: 8, color: C.grisClair });
  return pdf.finalize();
}

/** Convertit une pièce déposée en un PDF autonome, prêt pour sa case du Guichet unique. */
export async function pieceEnPdf(p: PieceJointe): Promise<Uint8Array | null> {
  if (p.mime === "application/pdf") {
    try {
      // Rouvre et réenregistre : vérifie que le fichier est lisible.
      const src = await PDFDocument.load(p.bytes, { ignoreEncryption: true });
      if (src.isEncrypted) return p.bytes;
      return await src.save();
    } catch (e) {
      console.warn("PDF illisible", p.nom, e);
      return null;
    }
  }
  if (p.mime !== "image/png" && p.mime !== "image/jpeg") return null;
  try {
    const doc = await PDFDocument.create();
    const img = p.mime === "image/png" ? await doc.embedPng(p.bytes) : await doc.embedJpg(p.bytes);
    const page = doc.addPage(A4);
    const maxW = LARGEUR;
    const maxH = A4[1] - MARGE * 2;
    const s = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * s;
    const h = img.height * s;
    page.drawImage(img, { x: (A4[0] - w) / 2, y: A4[1] - MARGE - h, width: w, height: h });
    return await doc.save();
  } catch (e) {
    console.warn("Image illisible", p.nom, e);
    return null;
  }
}
