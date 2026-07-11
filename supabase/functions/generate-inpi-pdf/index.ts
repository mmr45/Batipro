// supabase/functions/generate-inpi-pdf/index.ts
//
// Génère le PDF du dossier INPI ENTIÈREMENT CÔTÉ SERVEUR.
//
// Pourquoi : avant cette fonction, downloadInpiPdf() tournait dans le
// navigateur avec window.__inpiData déjà en mémoire. N'importe qui pouvait
// ouvrir la console et appeler downloadInpiPdf() directement, contournant
// tout contrôle de paiement (le check entitlements n'était fait qu'au moment
// d'OUVRIR le formulaire, pas au moment de générer le PDF).
//
// Ici, le PDF n'existe nulle part tant que :
//   1) l'utilisateur est authentifié (JWT valide)
//   2) la clé service_role a confirmé qu'il a bien un entitlement actif
//      ('dossier' ou 'pro') — lecture qui ignore totalement les policies RLS
//      côté client, donc infalsifiable depuis le navigateur
//   3) une soumission INPI existe bien pour cet utilisateur en base
//
// Déploiement : supabase functions deploy generate-inpi-pdf

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const FORME_LABEL: Record<string, string> = {
  micro: "Micro-entreprise",
  ei: "Entreprise Individuelle (EI)",
  sasu: "SASU",
};

const DOC_LABEL: Record<string, string> = {
  cni: "Pièce d'identité",
  domicile: "Justificatif de domicile",
  qualif: "Justificatif de qualification",
  ncnf: "Déclaration de non-condamnation",
  conjoint: "Attestation d'information du conjoint",
};

// Garder synchronisé avec REQUIRED_DOCS côté front (actuellement désactivé
// côté front pour test, mais on le laisse actif ici par prudence — le
// serveur ne doit jamais être moins strict que le client).
const REQUIRED_DOCS: string[] = [];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentification requise." }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    // Client "utilisateur" : sert uniquement à vérifier le JWT et récupérer
    // l'identité. Ne jamais utiliser ce client pour lire entitlements.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Session invalide ou expirée." }, 401);
    }

    // Client "admin" : clé service_role, ignore les policies RLS. C'est LA
    // seule source de vérité pour savoir si l'utilisateur a payé.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: entitlements, error: entError } = await adminClient
      .from("entitlements")
      .select("product_key, active")
      .eq("user_id", user.id)
      .eq("active", true);

    if (entError) {
      console.error("Erreur lecture entitlements :", entError);
      return jsonResponse(
        { error: "Impossible de vérifier votre accès." },
        500,
      );
    }

    const hasAccess = (entitlements || []).some(
      (e) => e.product_key === "dossier" || e.product_key === "pro",
    );

    if (!hasAccess) {
      // 403 : rien n'est généré. C'est le comportement critique de cette
      // fonction — sans entitlement actif, aucun PDF n'existe.
      return jsonResponse(
        { error: "Ce dossier fait partie du Pack Lancement (89 €)." },
        403,
      );
    }

    // Récupère la dernière soumission INPI de l'utilisateur.
    const { data: submissions, error: subError } = await adminClient
      .from("submissions")
      .select("payload, created_at")
      .eq("user_id", user.id)
      .eq("type", "inpi")
      .order("created_at", { ascending: false })
      .limit(1);

    if (subError) {
      console.error("Erreur lecture submissions :", subError);
      return jsonResponse(
        { error: "Impossible de récupérer votre dossier." },
        500,
      );
    }

    if (!submissions || submissions.length === 0) {
      return jsonResponse(
        { error: "Aucun dossier INPI trouvé pour ce compte." },
        404,
      );
    }

    const payload = submissions[0].payload || {};
    const d = payload._data || payload.data || {};
    const ref = d.ref || "—";

    const pdfBytes = await buildInpiPdf(d, ref);

    return new Response(new Blob([pdfBytes], { type: "application/pdf" }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="batipro-dossier-inpi.pdf"',
      },
    });
  } catch (err) {
    console.error("Erreur inattendue generate-inpi-pdf :", err);
    return jsonResponse({ error: "Erreur serveur inattendue." }, 500);
  }
});

// Reconstruit exactement la même mise en page que l'ancienne fonction
// downloadInpiPdf() côté client (jsPDF), mais avec pdf-lib (compatible Deno).
async function buildInpiPdf(
  d: Record<string, any>,
  ref: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28; // A4 en points
  const pageHeight = 841.89;
  const marginX = 48;
  const maxWidth = pageWidth - marginX * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 56;

  const black = rgb(20 / 255, 20 / 255, 20 / 255);
  const gray50 = rgb(50 / 255, 50 / 255, 50 / 255);
  const gray120 = rgb(120 / 255, 120 / 255, 120 / 255);
  const gray140 = rgb(140 / 255, 140 / 255, 140 / 255);
  const brand = rgb(0, 132 / 255, 1);
  const warning = rgb(180 / 255, 83 / 255, 9 / 255);

  function newPageIfNeeded(hNeeded: number) {
    if (y - hNeeded < 56) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - 56;
    }
  }

  function wrapText(text: string, f: any, size: number): string[] {
    const words = String(text).split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const test = current ? current + " " + w : w;
      if (f.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function heading(text: string, size = 12.5) {
    newPageIfNeeded(size + 8);
    page.drawText(text, { x: marginX, y, size, font: fontBold, color: black });
    y -= size + 8;
  }

  function line(
    label: string | null,
    value: string | undefined,
    size = 10.5,
    color = gray50,
    f = font,
  ) {
    const text = (label ? label + " : " : "") + (value || "—");
    const lines = wrapText(text, f, size);
    for (const l of lines) {
      newPageIfNeeded(size + 5);
      page.drawText(l, { x: marginX, y, size, font: f, color });
      y -= size + 5;
    }
  }

  // Titre
  page.drawText("Bâtipro — Dossier INPI", {
    x: marginX,
    y,
    size: 19,
    font: fontBold,
    color: brand,
  });
  y -= 26;

  page.drawText(
    "Référence interne : " +
      ref +
      "  —  Horodaté " +
      new Date().toLocaleString("fr-FR"),
    { x: marginX, y, size: 9.5, font, color: gray120 },
  );
  y -= 24;

  heading("Déclarant");
  line(null, `${d.civ || ""} ${d.prenom || ""} ${d.nom || ""}`.trim());
  line("Né(e) le", `${d.ddn || "—"} à ${d.villeNaissance || "—"} (${d.paysNaissance || "—"})`);
  line("Nationalité", d.nationalite);
  line("Contact", `${d.email || "—"} · ${d.tel || "—"}`);
  y -= 6;

  heading("Entreprise");
  line(null, d.denomination);
  line("Forme", FORME_LABEL[d.forme] || d.forme);
  line("Code APE", d.ape);
  line("Début d'activité", d.debut);
  if (d.activite) {
    y -= 2;
    line(null, d.activite, 9.5);
  }
  y -= 6;

  heading("Siège social");
  line(null, d.adresse);
  line(null, `${d.cp || ""} ${d.ville || ""}`.trim());
  line("Local", d.local);
  y -= 6;

  heading("Options");
  line(null, d.acre ? "✓ ACRE demandée" : "— ACRE non demandée");
  line(null, d.honneur ? "✓ Déclaration sur l'honneur signée" : "— Non signée");
  y -= 6;

  heading("Pièces justificatives");
  for (const [k, l] of Object.entries(DOC_LABEL)) {
    const ok = (d.doc || []).includes(k);
    line(null, (ok ? "✓ " : "! ") + l);
  }
  const missing = Object.keys(DOC_LABEL).filter(
    (k) => REQUIRED_DOCS.includes(k) && !(d.doc || []).includes(k),
  );
  if (missing.length) {
    y -= 4;
    line(
      null,
      "À téléverser avant transmission : " +
        missing.map((k) => DOC_LABEL[k]).join(", ") +
        ".",
      9.5,
      warning,
    );
  }

  y -= 10;
  line(
    null,
    "Ce récapitulatif alimente le formulaire du Guichet unique INPI. La transmission finale s'effectue après signature électronique.",
    8.5,
    gray140,
    fontItalic,
  );

  return await doc.save();
}

