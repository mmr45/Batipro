import { PDFDocument } from "npm:pdf-lib@1.17.1";
import { C, LARGEUR, MARGE, Pdf, dateFr } from "./pdf.ts";
import { FORME_INPI_LABEL, LOCAL_LABEL, PIECES, etapesApres, piecesRequises, type InpiData, type PieceKey } from "./rules/inpi.ts";
import { getMetier } from "./rules/metiers.ts";

export interface PieceJointe {
  key: PieceKey;
  nom: string;
  mime: string;
  bytes: Uint8Array;
}

export async function buildInpiPdf(d: InpiData, ref: string, pieces: PieceJointe[]): Promise<Uint8Array> {
  const pdf = await Pdf.create(`Bâtipro — Dossier de création ${ref} — document préparatoire, non transmis à l'INPI`);
  const logo = await pdf.logo();
  const top = pdf.y;
  pdf.drawImageFit(logo, MARGE, top, 36, 36);
  pdf.at("Dossier de création d'entreprise", MARGE + 46, top - 15, { size: 15, bold: true });
  pdf.at(`Réf. ${ref} — préparé le ${dateFr(new Date())}`, MARGE + 46, top - 29, { size: 8.5, color: C.gris });
  pdf.y = top - 48;
  pdf.text(
    "Ce récapitulatif reprend toutes les informations demandées par le Guichet unique de l'INPI (procedures.inpi.fr). Il ne vaut pas immatriculation : la déclaration officielle se fait en ligne sur le Guichet unique, puis la Chambre de Métiers et de l'Artisanat contrôle votre qualification.",
    { size: 8.8, color: C.gris },
  );
  pdf.space(4);

  const metier = getMetier(d.metier);
  pdf.heading("1. Le dirigeant");
  pdf.field("Identité", `${d.civilite} ${d.prenom} ${d.nom}`.trim());
  if (d.nomUsage) pdf.field("Nom d'usage", d.nomUsage);
  pdf.field("Naissance", `${d.dateNaissance ? dateFr(d.dateNaissance) : "—"} à ${d.villeNaissance || "—"} (${d.paysNaissance || "—"})`);
  pdf.field("Nationalité", d.nationalite);
  pdf.field("Contact", [d.email, d.telephone].filter(Boolean).join(" — "));
  pdf.field(
    "Situation matrimoniale",
    {
      celibataire: "Célibataire",
      marie_communaute: "Marié(e) sous un régime de communauté",
      marie_separation: "Marié(e) sous séparation de biens",
      pacse: "Pacsé(e)",
      "": "—",
    }[d.situationMatrimoniale],
  );

  pdf.heading("2. L'entreprise");
  pdf.field("Forme juridique", FORME_INPI_LABEL[d.forme]);
  pdf.field("Dénomination / nom commercial", d.denomination || (d.forme === "sasu" ? "—" : `${d.prenom} ${d.nom} (nom personnel)`));
  pdf.field("Métier", metier?.label ?? d.metier);
  pdf.field("Activité déclarée", d.activite);
  pdf.field("Code APE indicatif", d.ape || (metier ? `${metier.ape} — ${metier.apeLabel}` : ""));
  pdf.field("Début d'activité", d.dateDebut ? dateFr(d.dateDebut) : "—");
  if (d.forme === "sasu") {
    pdf.field("Capital social", `${d.capital || "—"} €`);
    pdf.field("Nature des apports", { numeraire: "Numéraire", nature: "En nature", mixte: "Numéraire et nature" }[d.apports]);
    pdf.field("Président", `${d.prenom} ${d.nom}`);
    pdf.field("Clôture de l'exercice", d.cloture);
    pdf.field("Banque de dépôt", d.banque);
  } else {
    pdf.field("Options", [d.versementLiberatoire ? "Versement libératoire de l'impôt" : "", d.acre ? "Demande d'ACRE" : ""].filter(Boolean).join(", ") || "Aucune");
  }

  pdf.heading("3. Le siège");
  pdf.field("Adresse", `${d.adresse}, ${d.codePostal} ${d.ville}`);
  pdf.field("Type de local", LOCAL_LABEL[d.local]);
  if (d.local === "domicile")
    pdf.text("Le domicile peut accueillir le siège sans limite de durée pour un entrepreneur individuel ; vérifiez votre bail ou règlement de copropriété si une activité y est exercée.", { size: 8.2, color: C.gris });

  pdf.heading("4. Pièces justificatives");
  const requises = piecesRequises(d);
  for (const p of PIECES.filter((x) => requises.includes(x.key) || pieces.some((pj) => pj.key === x.key))) {
    const jointes = pieces.filter((pj) => pj.key === p.key);
    pdf.field(p.label, jointes.length ? `Jointe (${jointes.map((j) => j.nom).join(", ")})` : requises.includes(p.key) ? "À fournir sur le Guichet unique" : "—", 190);
  }
  pdf.field("Déclaration de non-condamnation", "Jointe ci-après, à signer", 190);

  pdf.heading("5. Prochaines étapes");
  etapesApres(d).forEach((e, i) => {
    pdf.text(`${i + 1}. ${e.titre}`, { size: 9.5, bold: true });
    pdf.text(e.detail, { size: 8.8, color: C.gris, x: MARGE + 12 });
    pdf.space(3);
  });

  // ---------- Déclaration de non-condamnation ----------
  pdf.newPage();
  pdf.text("Déclaration sur l'honneur de non-condamnation", { size: 14, bold: true });
  pdf.text("et de filiation", { size: 11, color: C.gris });
  pdf.space(14);
  const body = [
    `Je soussigné(e) ${d.civilite} ${d.prenom} ${d.nom}${d.nomUsage ? ` (nom d'usage : ${d.nomUsage})` : ""},`,
    `né(e) le ${d.dateNaissance ? dateFr(d.dateNaissance) : "……………"} à ${d.villeNaissance || "……………"} (${d.paysNaissance || "……"}),`,
    `de nationalité ${d.nationalite || "……………"},`,
    `demeurant ${d.adresse || "……………"}, ${d.codePostal} ${d.ville},`,
    "",
    "Fils / fille de (nom et prénom du père) : ……………………………………………………",
    "et de (nom de naissance et prénom de la mère) : ……………………………………………",
    "",
    "déclare sur l'honneur, n'avoir fait l'objet d'aucune condamnation pénale ni de sanction civile ou administrative de nature à m'interdire de gérer, administrer ou diriger une personne morale ou d'exercer une activité commerciale ou artisanale.",
  ];
  for (const l of body) {
    if (!l) pdf.space(8);
    else pdf.text(l, { size: 10.5, lineHeight: 15.5 });
  }
  pdf.space(30);
  pdf.text(`Fait à ……………………………, le ……………………………`, { size: 10.5 });
  pdf.space(24);
  pdf.text("Signature :", { size: 10.5 });

  // ---------- Pièces jointes ----------
  if (pieces.length) {
    pdf.newPage();
    pdf.text("Annexes — pièces justificatives", { size: 14, bold: true });
    pdf.space(6);
    pieces.forEach((p, i) =>
      pdf.text(`${i + 1}. ${PIECES.find((x) => x.key === p.key)?.label ?? p.key} — ${p.nom}`, { size: 9.5 }),
    );
  }
  const imagePages: { p: PieceJointe }[] = [];
  for (const p of pieces) {
    if (p.mime === "image/png" || p.mime === "image/jpeg") imagePages.push({ p });
  }
  for (const { p } of imagePages) {
    try {
      const img = p.mime === "image/png" ? await pdf.doc.embedPng(p.bytes) : await pdf.doc.embedJpg(p.bytes);
      pdf.newPage();
      pdf.text(PIECES.find((x) => x.key === p.key)?.label ?? p.key, { size: 10, bold: true });
      pdf.space(6);
      pdf.drawImageFit(img, MARGE, pdf.y, LARGEUR, pdf.y - MARGE - 30);
    } catch (e) {
      console.warn("Image illisible", p.nom, e);
    }
  }

  // Les PDF joints sont ajoutés tels quels à la fin (après numérotation).
  const out = await PDFDocument.load(await pdf.finalize());
  for (const p of pieces.filter((x) => x.mime === "application/pdf")) {
    try {
      const src = await PDFDocument.load(p.bytes, { ignoreEncryption: true });
      const copied = await out.copyPages(src, src.getPageIndices().slice(0, 20));
      copied.forEach((pg) => out.addPage(pg));
    } catch (e) {
      console.warn("PDF illisible", p.nom, e);
    }
  }
  return out.save();
}

export { LARGEUR };
