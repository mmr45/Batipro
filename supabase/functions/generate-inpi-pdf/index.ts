// Génère le dossier de création (Pack Lancement requis) à partir de la
// dernière soumission INPI du compte, avec les pièces déposées dans le
// bucket privé « justificatifs ».
import { HttpError, adminClient, hasEntitlement, pdfResponse, requireUser, serve } from "../_shared/http.ts";
import { buildInpiPdf, type PieceJointe } from "../_shared/inpi-pdf.ts";
import { PIECES, normaliserInpi, type PieceKey } from "../_shared/rules/inpi.ts";

const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

serve(async (req) => {
  const user = await requireUser(req);
  if (!(await hasEntitlement(user.id, "dossier"))) {
    throw new HttpError(403, "Le dossier de création est inclus dans le Pack Lancement (89 €).");
  }
  const db = adminClient();
  const { data: sub } = await db
    .from("submissions")
    .select("id, payload, created_at")
    .eq("user_id", user.id)
    .eq("type", "inpi")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) throw new HttpError(404, "Aucun dossier enregistré : complétez d'abord le formulaire.");

  const d = normaliserInpi((sub.payload as Record<string, unknown>)?.data ?? sub.payload);
  const ref = `BP-${String(sub.id).slice(0, 8).toUpperCase()}`;

  const pieces: PieceJointe[] = [];
  let total = 0;
  for (const p of PIECES) {
    const { data: files } = await db.storage.from("justificatifs").list(`${user.id}/${p.key}`, { limit: 5 });
    for (const f of files ?? []) {
      if (!f.name || f.name.startsWith(".")) continue;
      const { data: blob } = await db.storage.from("justificatifs").download(`${user.id}/${p.key}/${f.name}`);
      if (!blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      total += bytes.length;
      if (total > MAX_TOTAL_BYTES) break;
      pieces.push({ key: p.key as PieceKey, nom: f.name, mime: blob.type || (f.metadata as { mimetype?: string })?.mimetype || "", bytes });
    }
  }

  const bytes = await buildInpiPdf(d, ref, pieces);
  return pdfResponse(req, bytes, `dossier-creation-${ref}.pdf`);
});
