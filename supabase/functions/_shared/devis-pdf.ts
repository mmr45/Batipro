import { C, LARGEUR, MARGE, Pdf, clean, dateFr, euro } from "./pdf.ts";
import { calculerTotaux, construireMentions, nomEmetteur, FORMES, type DevisData } from "./rules/devis.ts";
import { NATURE_TRAVAUX_LABEL, RETRACTATION } from "./rules/reglementation.ts";

export interface MetaDevis {
  numero: string;
  date: Date;
}

export async function buildDevisPdf(d: DevisData, meta: MetaDevis): Promise<Uint8Array> {
  const emetteur = nomEmetteur(d);
  const pdf = await Pdf.create(`${emetteur} — Devis ${meta.numero}`);
  const t = calculerTotaux(d);
  const forme = FORMES.find((f) => f.value === d.em_forme)?.label ?? "";

  // ---------- En-tête ----------
  pdf.page.drawRectangle({ x: 0, y: 841.89 - 5, width: 595.28, height: 5, color: C.marque });
  const logo = await pdf.logo(d.em_logo_dataurl);
  const top = pdf.y;
  const { w } = pdf.drawImageFit(logo, MARGE, top, 54, 40);
  const xTxt = MARGE + w + 10;
  pdf.at(emetteur, xTxt, top - 14, { size: 13, bold: true });
  pdf.at(
    [forme, d.em_capital && !/^(micro|ei)$/.test(d.em_forme) ? `capital ${d.em_capital} €` : ""].filter(Boolean).join(" — "),
    xTxt,
    top - 27,
    { size: 8.5, color: C.gris },
  );
  if (d.em_qualification) pdf.at(d.em_qualification, xTxt, top - 38, { size: 8.5, color: C.gris });

  const right = MARGE + LARGEUR;
  pdf.at("DEVIS", right, top - 16, { size: 20, bold: true, color: C.marque, align: "right" });
  pdf.at(`N° ${meta.numero}`, right, top - 30, { size: 9, align: "right" });
  pdf.at(`Établi le ${dateFr(meta.date)}`, right, top - 41, { size: 8.5, color: C.gris, align: "right" });
  const validite = new Date(meta.date.getTime() + (Number(d.co_validite_jours) || 30) * 86_400_000);
  pdf.at(`Valable jusqu'au ${dateFr(validite)}`, right, top - 52, { size: 8.5, color: C.gris, align: "right" });
  pdf.y = top - 66;
  pdf.rule();
  pdf.space(14);

  // ---------- Émetteur / Client ----------
  const colW = LARGEUR / 2 - 10;
  const startY = pdf.y;
  pdf.text("ENTREPRISE", { size: 7.5, bold: true, color: C.grisClair, width: colW });
  pdf.space(2);
  const emLines = [
    d.em_adresse,
    d.em_siret ? `SIRET : ${d.em_siret}` : "",
    d.em_immatriculation,
    !d.em_franchise && d.em_tva_intra ? `TVA intracom. : ${d.em_tva_intra}` : "",
    [d.em_tel, d.em_email].filter(Boolean).join(" — "),
  ].filter(Boolean);
  for (const l of emLines) pdf.text(l, { size: 9, width: colW });
  const yAfterLeft = pdf.y;

  pdf.y = startY;
  const xR = MARGE + LARGEUR / 2 + 10;
  pdf.text(d.cl_type === "pro" ? "CLIENT PROFESSIONNEL" : "CLIENT", { size: 7.5, bold: true, color: C.grisClair, x: xR, width: colW });
  pdf.space(2);
  pdf.text(d.cl_nom, { size: 9.5, bold: true, x: xR, width: colW });
  for (const l of [d.cl_adresse, d.cl_siret ? `SIRET : ${d.cl_siret}` : "", [d.cl_tel, d.cl_email].filter(Boolean).join(" — ")].filter(Boolean))
    pdf.text(l, { size: 9, x: xR, width: colW });
  pdf.y = Math.min(pdf.y, yAfterLeft) - 10;

  // ---------- Chantier ----------
  pdf.page.drawRectangle({ x: MARGE, y: pdf.y - 46, width: LARGEUR, height: 46, color: C.fond });
  const yCh = pdf.y - 8;
  pdf.y = yCh;
  pdf.text(d.ch_intitule || "Travaux", { size: 10.5, bold: true, x: MARGE + 10, width: LARGEUR - 20 });
  pdf.text(`Lieu du chantier : ${d.ch_adresse || d.cl_adresse || "—"}`, { size: 8.5, color: C.gris, x: MARGE + 10, width: LARGEUR - 20 });
  pdf.text(
    [
      NATURE_TRAVAUX_LABEL[d.ch_nature],
      d.ch_debut ? `début prévu le ${dateFr(d.ch_debut)}` : "",
      d.ch_duree ? `durée estimée : ${d.ch_duree}` : "",
    ]
      .filter(Boolean)
      .join(" — "),
    { size: 8.5, color: C.gris, x: MARGE + 10, width: LARGEUR - 20 },
  );
  pdf.y = Math.min(pdf.y, yCh - 38) - 14;

  // ---------- Tableau ----------
  const cols = { des: MARGE + 8, qte: MARGE + 290, unite: MARGE + 296, pu: MARGE + 388, tva: MARGE + 428, tot: right - 8 };
  const header = () => {
    pdf.ensure(40);
    pdf.page.drawRectangle({ x: MARGE, y: pdf.y - 18, width: LARGEUR, height: 18, color: C.encre });
    const yy = pdf.y - 12.5;
    pdf.at("Désignation", cols.des, yy, { size: 8, bold: true, color: C.blanc });
    pdf.at("Qté", cols.qte, yy, { size: 8, bold: true, color: C.blanc, align: "right" });
    pdf.at("Unité", cols.unite, yy, { size: 8, bold: true, color: C.blanc });
    pdf.at("PU HT", cols.pu, yy, { size: 8, bold: true, color: C.blanc, align: "right" });
    pdf.at("TVA", cols.tva, yy, { size: 8, bold: true, color: C.blanc, align: "right" });
    pdf.at("Total HT", cols.tot, yy, { size: 8, bold: true, color: C.blanc, align: "right" });
    pdf.y -= 22;
  };
  header();
  d.lignes.forEach((l, i) => {
    const lines = pdf.wrap(l.designation, 9, 262);
    const h = lines.length * 12.5 + 6;
    if (pdf.y - h < MARGE + 40) {
      pdf.newPage();
      header();
    }
    if (i % 2 === 1) pdf.page.drawRectangle({ x: MARGE, y: pdf.y - h + 3, width: LARGEUR, height: h, color: C.fond });
    const y0 = pdf.y - 9;
    lines.forEach((ln, k) => pdf.at(ln, cols.des, y0 - k * 12.5, { size: 9 }));
    const ht = (Number(l.quantite) || 0) * (Number(l.prixUnitaireHT) || 0);
    pdf.at(String(l.quantite).replace(".", ","), cols.qte, y0, { size: 9, align: "right" });
    pdf.at(l.unite, cols.unite, y0, { size: 9 });
    pdf.at(euro(l.prixUnitaireHT), cols.pu, y0, { size: 9, align: "right" });
    pdf.at(d.em_franchise ? "-" : `${String(l.tva).replace(".", ",")} %`, cols.tva, y0, { size: 9, align: "right" });
    pdf.at(euro(ht), cols.tot, y0, { size: 9, align: "right" });
    pdf.y -= h;
  });
  pdf.rule();
  pdf.space(10);

  // ---------- Totaux ----------
  const rows: [string, string, boolean][] = [["Total HT", euro(t.totalHT), false]];
  if (d.em_franchise) rows.push(["TVA", "non applicable (art. 293 B CGI)", false]);
  else for (const v of t.tvaParTaux) rows.push([`TVA ${String(v.taux).replace(".", ",")} % (base ${euro(v.base)})`, euro(v.montant), false]);
  rows.push(["Total TTC", euro(t.totalTTC), true]);
  if (t.acompte > 0) {
    rows.push([`Acompte à la signature (${d.co_acompte_pct} %)`, euro(t.acompte), false]);
    rows.push(["Reste à payer", euro(t.solde), false]);
  }
  pdf.ensure(rows.length * 16 + 10);
  const xL = MARGE + LARGEUR - 250;
  for (const [k, v, strong] of rows) {
    if (strong) {
      pdf.page.drawRectangle({ x: xL - 8, y: pdf.y - 18, width: 258, height: 20, color: C.marqueClair });
    }
    pdf.at(k, xL, pdf.y - 12, { size: strong ? 10.5 : 9, bold: strong });
    pdf.at(v, right - 8, pdf.y - 12, { size: strong ? 11 : 9, bold: strong, align: "right" });
    pdf.y -= strong ? 22 : 15;
  }
  pdf.space(6);

  if (d.co_notes.trim()) {
    pdf.heading("Précisions");
    pdf.text(d.co_notes, { size: 9 });
  }

  // ---------- Mentions ----------
  pdf.heading("Conditions et mentions légales");
  for (const m of construireMentions(d)) {
    pdf.text(`• ${m}`, { size: 7.8, color: C.gris, lineHeight: 10.6 });
    pdf.space(2.5);
  }

  // ---------- Signature ----------
  pdf.ensure(110);
  pdf.heading("Acceptation du devis");
  const ySig = pdf.y;
  const boxW = LARGEUR / 2 - 8;
  for (const [i, titre] of ["L'entreprise", "Le client"].entries()) {
    const x = MARGE + i * (boxW + 16);
    pdf.page.drawRectangle({ x, y: ySig - 86, width: boxW, height: 86, borderColor: C.filet, borderWidth: 0.8 });
    pdf.at(titre, x + 8, ySig - 14, { size: 8.5, bold: true });
    if (i === 1) {
      pdf.at("Date, signature précédées de la mention", x + 8, ySig - 27, { size: 7.5, color: C.gris });
      pdf.at("« Devis reçu avant l'exécution des travaux, bon pour accord »", x + 8, ySig - 37, { size: 7.5, color: C.gris });
    } else {
      pdf.at("Date et signature", x + 8, ySig - 27, { size: 7.5, color: C.gris });
    }
  }
  pdf.y = ySig - 96;

  // ---------- Formulaire de rétractation ----------
  if (d.cl_type === "particulier" && d.cl_hors_etablissement) {
    pdf.newPage();
    pdf.heading("Formulaire de rétractation");
    pdf.text(
      `Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat, dans un délai de ${RETRACTATION.delaiJours} jours à compter de sa signature (art. L221-5 du Code de la consommation).`,
      { size: 9, color: C.gris },
    );
    pdf.space(10);
    pdf.text(`À l'attention de : ${emetteur}, ${d.em_adresse}${d.em_email ? ", " + d.em_email : ""}`, { size: 9.5 });
    pdf.space(8);
    for (const l of [
      `Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous : devis n° ${meta.numero} — ${d.ch_intitule}`,
      "Conclu le : ……………………………",
      "Nom du client : ……………………………",
      "Adresse du client : ……………………………………………………………",
      "Signature du client (uniquement en cas de notification sur papier) :",
      "Date : ……………………………",
    ]) {
      pdf.text(l, { size: 9.5 });
      pdf.space(10);
    }
  }

  return pdf.finalize();
}

export function nomFichierDevis(numero: string, client: string): string {
  return clean(`devis-${numero}-${client}`).toLowerCase().replace(/[^\w-]+/g, "-").replace(/-+/g, "-").slice(0, 80) + ".pdf";
}
