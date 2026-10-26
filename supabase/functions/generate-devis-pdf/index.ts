// Génère le PDF d'un devis (abonnement Pro requis) et l'archive avec un
// numéro continu. Deux usages :
//   { devis: {...} }      → nouveau devis : contrôle, numérotation, archive, PDF
//   { devis_id: "uuid" }  → re-téléchargement à l'identique d'un devis archivé
import { HttpError, adminClient, hasEntitlement, pdfResponse, readJson, requireUser, serve } from "../_shared/http.ts";
import { buildDevisPdf, nomFichierDevis } from "../_shared/devis-pdf.ts";
import { calculerTotaux, normaliserDevis, verifierDevis } from "../_shared/rules/devis.ts";

serve(async (req) => {
  const user = await requireUser(req);
  const db = adminClient();
  const body = await readJson<{ devis?: unknown; devis_id?: string }>(req);

  if (body.devis_id) {
    // Les devis déjà émis restent téléchargeables, même après résiliation.
    const { data: row } = await db
      .from("devis")
      .select("numero, data, created_at, client_nom")
      .eq("id", body.devis_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row) throw new HttpError(404, "Devis introuvable.");
    const d = normaliserDevis(row.data);
    const bytes = await buildDevisPdf(d, { numero: row.numero, date: new Date(row.created_at) });
    return pdfResponse(req, bytes, nomFichierDevis(row.numero, row.client_nom), { "X-Devis-Numero": row.numero });
  }

  if (!(await hasEntitlement(user.id, "pro"))) {
    throw new HttpError(403, "L'éditeur de devis est inclus dans l'abonnement Pro (19 €/mois).");
  }

  const d = normaliserDevis(body.devis);
  const bloquants = verifierDevis(d).filter((p) => p.bloquant);
  if (bloquants.length) {
    throw new HttpError(422, "Mentions obligatoires manquantes : " + bloquants.map((b) => b.message).join(" ; "), bloquants);
  }

  const now = new Date();
  const t = calculerTotaux(d);
  let numero = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: seq, error: seqErr } = await db.rpc("next_devis_sequence", { p_user: user.id });
    if (seqErr) throw new HttpError(500, "Numérotation indisponible.");
    numero = `D${now.getFullYear()}-${String(seq).padStart(4, "0")}`;
    const { error } = await db.from("devis").insert({
      user_id: user.id,
      numero,
      sequence: seq,
      client_nom: d.cl_nom,
      intitule: d.ch_intitule,
      total_ht: t.totalHT,
      total_ttc: t.totalTTC,
      data: d,
      created_at: now.toISOString(),
    });
    if (!error) break;
    if (error.code !== "23505" || attempt === 2) throw new HttpError(500, "Archivage du devis impossible.");
  }

  const bytes = await buildDevisPdf(d, { numero, date: now });
  return pdfResponse(req, bytes, nomFichierDevis(numero, d.cl_nom), { "X-Devis-Numero": numero });
});
