// supabase/functions/generate-devis-pdf/index.ts
//
// Génère le PDF de devis côté serveur, après vérification (avec la clé
// service_role, infalsifiable depuis le navigateur) que le compte a bien
// un entitlement 'pro' actif. Reçoit les données du devis dans le body
// (POST), jamais lues depuis une table — le devis n'est pas persistant
// côté serveur, seul l'entitlement l'est.

import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Logo Batipro embarqué en base64 (PNG 128x128). Évite un aller-retour
// réseau vers Storage pour un fichier de quelques Ko, statique et
// rarement modifié.
//
const LOGO_BASE64 =
  "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";

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Non authentifié." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client "anon-scope" juste pour résoudre l'utilisateur depuis son JWT.
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Session invalide, reconnectez-vous." }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Client service_role : seule cette clé peut lire entitlements en
    // s'affranchissant des RLS, donc seule cette vérification fait foi.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: entitlements, error: entError } = await adminClient
      .from("entitlements")
      .select("product_key, active")
      .eq("user_id", userId)
      .eq("active", true);

    if (entError) {
      console.error("Erreur lecture entitlements:", entError);
      return new Response(JSON.stringify({ error: "Impossible de vérifier votre accès." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const hasAccess = (entitlements || []).some((e) => e.product_key === "pro");
    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "L'éditeur de devis est réservé à l'abonnement Pro (19 €/mois)." }),
        { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const pdfBytes = await buildDevisPdf(body);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="devis-${(body.ch_num || "batipro").replace(/[^\w-]+/g, "_")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Erreur génération PDF devis:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur pendant la génération du PDF." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

// ---------------------------------------------------------------------
// Construction du PDF — style sobre / corporate : bandeau noir fin,
// logo + identité en en-tête, tableau des prestations avec en-têtes de
// colonnes et lignes alternées, bloc totaux encadré, pied de page avec
// mentions légales et zones de signature.
// ---------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MX = 40; // marge gauche/droite
const CONTENT_W = PAGE_W - MX * 2;

const INK = rgb(0.1, 0.1, 0.1);
const GRAY_TEXT = rgb(0.4, 0.4, 0.4);
const GRAY_LIGHT = rgb(0.62, 0.62, 0.62);
const ROW_ALT = rgb(0.96, 0.96, 0.96);
const HEADER_BG = rgb(0.13, 0.13, 0.13);
const HEADER_TEXT = rgb(1, 1, 1);
const LINE = rgb(0.85, 0.85, 0.85);

// Colonnes du tableau (largeurs cumulées jusqu'à CONTENT_W)
// FIX #3 : qte.w passe de 55 à 50 pour créer un espace de 5pt entre le
// nombre (aligné à droite, ex. "45") et l'unité (alignée à gauche, ex.
// "h") — avant ce correctif les deux colonnes se touchaient exactement
// au même x et s'affichaient collées ("45h" au lieu de "45 h").
const COL = {
  desig: { x: MX + 6, w: 265 },
  qte: { x: MX + 275, w: 50 },
  unite: { x: MX + 330, w: 55 },
  pu: { x: MX + 385, w: 65 },
  total: { x: MX + CONTENT_W - 6, w: 0 }, // ancré à droite
};

// Le formulaire envoie éventuellement d.em_logo_dataurl, une data URL
// "data:image/png;base64,...." ou "data:image/jpeg;base64,...." produite
// côté navigateur (upload + redimensionnement canvas). Si elle est absente,
// invalide, ou que l'embed échoue (fichier corrompu, format non supporté),
// on retombe silencieusement sur le logo Bâtipro par défaut plutôt que de
// faire échouer toute la génération du PDF pour un logo cassé.
async function resolveLogoImage(doc: PDFDocument, d: any) {
  const dataUrl = typeof d?.em_logo_dataurl === "string" ? d.em_logo_dataurl : "";
  const match = dataUrl.match(/^data:(image\/png|image\/jpeg|image\/jpg);base64,([A-Za-z0-9+/=]+)$/);
  if (match) {
    try {
      const mime = match[1];
      const bytes = base64ToUint8Array(match[2]);
      return mime === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    } catch (e) {
      console.warn("Logo personnalisé illisible, retour au logo Bâtipro par défaut :", e);
    }
  }
  return doc.embedPng(base64ToUint8Array(LOGO_BASE64));
}

async function buildDevisPdf(d: any): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([PAGE_W, PAGE_H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = await resolveLogoImage(doc, d);

  const lines = Array.isArray(d.lines) ? d.lines : [];
  const franchise = !!d.em_franchise;
  let totalHT = 0;
  const tvaMap = new Map<number, number>();
  lines.forEach((L: any) => {
    const ht = (Number(L.q) || 0) * (Number(L.pu) || 0);
    totalHT += ht;
    const rate = franchise ? 0 : Number(L.tva) || 0;
    tvaMap.set(rate, (tvaMap.get(rate) || 0) + ht * (rate / 100));
  });
  const totalTVA = Array.from(tvaMap.values()).reduce((a, b) => a + b, 0);
  const totalTTC = totalHT + totalTVA;
  const acomptePct = Number(d.co_acompte) || 0;
  const acompte = totalTTC * (acomptePct / 100);

  // Intl.NumberFormat("fr-FR", { style: "currency" }) insère un espace
  // fine insécable (U+202F) entre le nombre et "€". La police standard
  // Helvetica (encodage WinAnsi) ne sait pas encoder ce caractère et fait
  // planter pdf-lib. On le remplace par un espace normal après coup.
  const fmtEUR = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
      .format(n || 0)
      .replace(/\u202f/g, " ")
      .replace(/\u00a0/g, " ");

  let y = PAGE_H;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 48;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) newPage();
  };

  const rightText = (text: string, rightX: number, yy: number, size: number, f = font, color = INK) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: rightX - w, y: yy, size, font: f, color });
  };

  // ---- En-tête ----
  y = PAGE_H - 6;
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: HEADER_BG });

  // Le logo Bâtipro par défaut est carré, mais un logo perso uploadé peut
  // avoir n'importe quel ratio : on le fait tenir dans une case de
  // logoBox x logoBox en conservant ses proportions (pas d'étirement),
  // centré dans cette case pour garder un en-tête aligné quel que soit le
  // logo.
  const logoBox = 34;
  const boxY = PAGE_H - 44 - logoBox + 4;
  const logoScale = Math.min(logoBox / logoImage.width, logoBox / logoImage.height);
  const logoW = logoImage.width * logoScale;
  const logoH = logoImage.height * logoScale;
  const logoX = MX + (logoBox - logoW) / 2;
  const logoDrawY = boxY + (logoBox - logoH) / 2;
  page.drawImage(logoImage, { x: logoX, y: logoDrawY, width: logoW, height: logoH });

  const headerTextX = MX + logoBox + 10;
  page.drawText(d.em_nom || "Votre entreprise", {
    x: headerTextX,
    y: PAGE_H - 52,
    size: 14,
    font: fontBold,
    color: INK,
  });
  page.drawText(d.em_forme || "", {
    x: headerTextX,
    y: PAGE_H - 65,
    size: 9,
    font,
    color: GRAY_TEXT,
  });

  // Titre + référence, alignés à droite
  rightText("DEVIS", MX + CONTENT_W, PAGE_H - 46, 20, fontBold, INK);
  rightText(`N° ${d.ch_num || "\u2014"}`, MX + CONTENT_W, PAGE_H - 62, 9, font, GRAY_TEXT);
  rightText(`Émis le ${new Date().toLocaleDateString("fr-FR")}`, MX + CONTENT_W, PAGE_H - 74, 9, font, GRAY_TEXT);
  rightText(`Valable ${d.co_validite || 30} jours`, MX + CONTENT_W, PAGE_H - 86, 9, font, GRAY_TEXT);

  y = PAGE_H - 108;
  page.drawLine({ start: { x: MX, y }, end: { x: MX + CONTENT_W, y }, thickness: 0.75, color: LINE });
  y -= 20;

  // ---- Bloc émetteur / client, deux colonnes ----
  const colClientX = MX + CONTENT_W / 2 + 10;
  let yLeft = y;
  let yRight = y;

  page.drawText("ÉMETTEUR", { x: MX, y: yLeft, size: 8, font: fontBold, color: GRAY_LIGHT });
  yLeft -= 13;
  [
    d.em_adresse,
    d.em_email,
    d.em_tel,
    d.em_siren ? `SIRET : ${d.em_siren}` : "",
    d.em_tva ? `TVA intracom. : ${d.em_tva}` : "",
  ]
    .filter(Boolean)
    .forEach((l: string) => {
      page.drawText(String(l), { x: MX, y: yLeft, size: 9, font, color: rgb(0.25, 0.25, 0.25) });
      yLeft -= 12;
    });

  // FIX #1 : le formulaire envoie em_assureur_nom / em_assureur_police,
  // pas em_assureur (qui n'existe pas côté client) — ce bloc était donc
  // toujours ignoré. On lit maintenant les bons champs et on affiche
  // aussi le numéro de police, jamais exploité auparavant.
  if (d.em_assureur_nom || d.em_assureur_police) {
    yLeft -= 4;
    page.drawText("Assurance décennale", { x: MX, y: yLeft, size: 7.5, font: fontBold, color: GRAY_LIGHT });
    yLeft -= 11;
    const assureurLine = [d.em_assureur_nom, d.em_assureur_police ? `police n° ${d.em_assureur_police}` : ""]
      .filter(Boolean)
      .join(" — ");
    page.drawText(String(assureurLine || "\u2014"), { x: MX, y: yLeft, size: 9, font, color: rgb(0.25, 0.25, 0.25) });
    yLeft -= 12;
    if (d.em_zone) {
      page.drawText(`Zone de couverture : ${d.em_zone}`, {
        x: MX,
        y: yLeft,
        size: 8,
        font,
        color: GRAY_TEXT,
      });
      yLeft -= 12;
    }
  }

  page.drawText("CLIENT", { x: colClientX, y: yRight, size: 8, font: fontBold, color: GRAY_LIGHT });
  yRight -= 13;
  page.drawText(d.cl_nom || "\u2014", { x: colClientX, y: yRight, size: 10, font: fontBold, color: INK });
  yRight -= 13;
  [
    d.cl_adresse,
    d.cl_email,
    d.cl_tel,
    d.cl_type === "pro" && d.cl_siret ? `SIRET : ${d.cl_siret}` : "",
  ]
    .filter(Boolean)
    .forEach((l: string) => {
      page.drawText(String(l), { x: colClientX, y: yRight, size: 9, font, color: rgb(0.25, 0.25, 0.25) });
      yRight -= 12;
    });

  y = Math.min(yLeft, yRight) - 16;

  // ---- Bloc chantier ----
  if (d.ch_objet || d.ch_adresse || d.ch_debut || d.ch_duree) {
    ensureSpace(60);
    page.drawText("CHANTIER", { x: MX, y, size: 8, font: fontBold, color: GRAY_LIGHT });
    y -= 13;
    if (d.ch_objet) {
      page.drawText(String(d.ch_objet), { x: MX, y, size: 10, font: fontBold, color: INK });
      y -= 13;
    }
    const chLine = [
      d.ch_adresse ? `Adresse : ${d.ch_adresse}` : "",
      d.ch_debut ? `Début prévu : ${new Date(d.ch_debut).toLocaleDateString("fr-FR")}` : "",
      d.ch_duree ? `Durée estimée : ${d.ch_duree}` : "",
    ].filter(Boolean);
    chLine.forEach((l) => {
      page.drawText(l, { x: MX, y, size: 9, font, color: rgb(0.25, 0.25, 0.25) });
      y -= 12;
    });
    y -= 8;
  }

  // ---- Tableau des prestations ----
  const headerRowH = 20;
  const drawTableHeader = () => {
    page.drawRectangle({ x: MX, y: y - headerRowH, width: CONTENT_W, height: headerRowH, color: HEADER_BG });
    const ty = y - headerRowH + 6;
    page.drawText("Désignation", { x: COL.desig.x, y: ty, size: 8.5, font: fontBold, color: HEADER_TEXT });
    rightText("Qté", COL.qte.x + COL.qte.w, ty, 8.5, fontBold, HEADER_TEXT);
    page.drawText("Unité", { x: COL.unite.x, y: ty, size: 8.5, font: fontBold, color: HEADER_TEXT });
    rightText("PU HT", COL.pu.x + COL.pu.w, ty, 8.5, fontBold, HEADER_TEXT);
    rightText("Total HT", COL.total.x, ty, 8.5, fontBold, HEADER_TEXT);
    y -= headerRowH;
  };

  ensureSpace(headerRowH + 40);
  drawTableHeader();

  const rowH = 20;
  lines.forEach((L: any, idx: number) => {
    ensureSpace(rowH + 8);
    if (y === PAGE_H - 48) {
      // On vient de sauter de page : redessine l'en-tête du tableau ici.
      drawTableHeader();
    }
    const ht = (Number(L.q) || 0) * (Number(L.pu) || 0);
    if (idx % 2 === 1) {
      page.drawRectangle({ x: MX, y: y - rowH, width: CONTENT_W, height: rowH, color: ROW_ALT });
    }
    const ty = y - rowH + 6;
    const label = String(L.d || "\u2014");
    const truncated = label.length > 42 ? label.slice(0, 42) + "…" : label;
    page.drawText(truncated, { x: COL.desig.x, y: ty, size: 9, font, color: INK });
    rightText(String(L.q ?? 0), COL.qte.x + COL.qte.w, ty, 9, font, INK);
    page.drawText(String(L.u || ""), { x: COL.unite.x, y: ty, size: 9, font, color: INK });
    rightText(fmtEUR(Number(L.pu) || 0), COL.pu.x + COL.pu.w, ty, 9, font, INK);
    rightText(fmtEUR(ht), COL.total.x, ty, 9, font, INK);
    y -= rowH;
  });

  page.drawLine({ start: { x: MX, y }, end: { x: MX + CONTENT_W, y }, thickness: 0.75, color: LINE });
  y -= 20;

  // ---- Bloc totaux, encadré et aligné à droite ----
  const totalsBoxW = 230;
  const totalsBoxX = MX + CONTENT_W - totalsBoxW;
  const totalsLineH = 16;
  const totalsRows = franchise
    ? [["Total HT", fmtEUR(totalHT), false], ["TVA non applicable, art. 293B CGI", "", false]]
    : [["Total HT", fmtEUR(totalHT), false], ["TVA", fmtEUR(totalTVA), false]];
  const totalsBoxH = totalsLineH * (totalsRows.length + 1) + 10;

  ensureSpace(totalsBoxH + 10);
  page.drawRectangle({
    x: totalsBoxX,
    y: y - totalsBoxH,
    width: totalsBoxW,
    height: totalsBoxH,
    borderColor: LINE,
    borderWidth: 0.75,
  });
  let ty = y - 14;
  totalsRows.forEach(([label, value]) => {
    page.drawText(String(label), { x: totalsBoxX + 12, y: ty, size: 9, font, color: GRAY_TEXT });
    if (value) rightText(String(value), totalsBoxX + totalsBoxW - 12, ty, 9, font, INK);
    ty -= totalsLineH;
  });
  page.drawLine({
    start: { x: totalsBoxX + 12, y: ty + 6 },
    end: { x: totalsBoxX + totalsBoxW - 12, y: ty + 6 },
    thickness: 0.5,
    color: LINE,
  });
  ty -= 6;
  page.drawText("Total TTC", { x: totalsBoxX + 12, y: ty, size: 10.5, font: fontBold, color: INK });
  rightText(fmtEUR(totalTTC), totalsBoxX + totalsBoxW - 12, ty, 12, fontBold, INK);

  y -= totalsBoxH + 16;

  if (acomptePct > 0) {
    ensureSpace(16);
    rightText(`Acompte demandé (${acomptePct}%) : ${fmtEUR(acompte)}`, MX + CONTENT_W, y, 9.5, fontBold, GRAY_TEXT);
    y -= 24;
  }

  // ---- Notes ----
  if (d.co_notes) {
    ensureSpace(30);
    page.drawText("Notes", { x: MX, y, size: 8, font: fontBold, color: GRAY_LIGHT });
    y -= 12;
    page.drawText(String(d.co_notes).slice(0, 140), { x: MX, y, size: 8.5, font, color: rgb(0.25, 0.25, 0.25) });
    y -= 20;
  }

  // ---- Mentions légales ----
  const isPro = d.cl_type === "pro";
  ensureSpace(70);
  page.drawLine({ start: { x: MX, y }, end: { x: MX + CONTENT_W, y }, thickness: 0.5, color: LINE });
  y -= 16;

  // FIX #1 (suite) : la mention légale de garantie décennale reprend
  // maintenant le nom de l'assureur, le n° de police et la zone de
  // couverture quand ils sont renseignés — c'était le point signalé
  // comme "problème légal important" (mention trop vague sans ces
  // précisions).
  const mentionAssurance = (d.em_assureur_nom || d.em_assureur_police)
    ? `Garantie décennale et assurance responsabilité civile professionnelle en cours de validité (loi Spinetta, art. L241-1 du Code des assurances) — ${d.em_assureur_nom || "assureur non renseigné"}${d.em_assureur_police ? ", police n° " + d.em_assureur_police : ""}${d.em_zone ? ", couvrant " + d.em_zone : ""}.`
    : "Garantie décennale et assurance responsabilité civile professionnelle en cours de validité (loi Spinetta, art. L241-1 du Code des assurances).";

  const mentions = [
    "Devis gratuit, valable pour la durée indiquée ci-dessus.",
    franchise ? "TVA non applicable, article 293 B du Code général des impôts." : "",
    "En cas d'acceptation, ce devis vaut bon de commande.",
    d.co_paiement ? `Délai de paiement : ${d.co_paiement} jours à compter de la facturation.` : "",
    isPro
      ? "Pénalités de retard légales (taux BCE + 10 points) et indemnité forfaitaire de recouvrement de 40 € applicables de plein droit entre professionnels (art. L441-10 du Code de commerce)."
      : "En cas de retard de paiement, des pénalités contractuelles peuvent s'appliquer si stipulées ci-dessus.",
    mentionAssurance,
    "Médiation de la consommation : en cas de litige, le client peut recourir gratuitement au médiateur de la consommation compétent.",
  ].filter(Boolean);

  // FIX #2 : les moyens de paiement cochés dans le formulaire
  // (co_paiement_virement / _cheque / _cb / _especes) n'étaient lus nulle
  // part dans la fonction. On les ajoute maintenant comme mention.
  const moyensPaiement: string[] = [];
  if (d.co_paiement_virement) moyensPaiement.push("Virement");
  if (d.co_paiement_cheque) moyensPaiement.push("Chèque");
  if (d.co_paiement_cb) moyensPaiement.push("Carte bancaire");
  if (d.co_paiement_especes) moyensPaiement.push("Espèces");
  if (moyensPaiement.length) {
    mentions.push(`Moyens de paiement acceptés : ${moyensPaiement.join(", ")}.`);
  }

  const drawWrapped = (text: string, size: number, f = font, color = GRAY_LIGHT, lineH = 10) => {
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > CONTENT_W) {
        ensureSpace(lineH);
        page.drawText(line, { x: MX, y, size, font: f, color });
        y -= lineH;
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      ensureSpace(lineH);
      page.drawText(line, { x: MX, y, size, font: f, color });
      y -= lineH;
    }
  };

  mentions.forEach((m) => drawWrapped(m, 7.5));

  // ---- Signatures ----
  ensureSpace(90);
  y -= 14;
  const sigBoxW = (CONTENT_W - 20) / 2;
  const sigBoxH = 70;

  page.drawText("Bon pour accord — Client", { x: MX, y, size: 8.5, font: fontBold, color: INK });
  page.drawText("Date et signature, précédées de la mention manuscrite", {
    x: MX,
    y: y - 11,
    size: 7,
    font,
    color: GRAY_LIGHT,
  });
  page.drawText('"Bon pour accord"', { x: MX, y: y - 20, size: 7, font, color: GRAY_LIGHT });
  page.drawRectangle({
    x: MX,
    y: y - sigBoxH - 6,
    width: sigBoxW,
    height: sigBoxH,
    borderColor: LINE,
    borderWidth: 0.75,
  });

  const sigRightX = MX + sigBoxW + 20;
  page.drawText("L'entreprise", { x: sigRightX, y, size: 8.5, font: fontBold, color: INK });
  page.drawText("Cachet et signature", { x: sigRightX, y: y - 11, size: 7, font, color: GRAY_LIGHT });
  page.drawRectangle({
    x: sigRightX,
    y: y - sigBoxH - 6,
    width: sigBoxW,
    height: sigBoxH,
    borderColor: LINE,
    borderWidth: 0.75,
  });

  return doc.save();
}
