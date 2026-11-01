// Génère le dossier de création (Pack Lancement requis) à partir de la
// dernière soumission INPI du compte. Renvoie une archive ZIP :
//   1-fiche-de-saisie.pdf                  réponses à reporter sur le Guichet unique
//   2-declaration-non-condamnation.pdf     à dater, signer et scanner
//   pieces/…pdf                            une pièce = un PDF, prêt pour sa case
import { HttpError, adminClient, corsHeaders, hasEntitlement, requireUser, serve } from "../_shared/http.ts";
import { buildDncPdf, buildFichePdf, pieceEnPdf, type PieceJointe } from "../_shared/inpi-pdf.ts";
import { PIECES, normaliserInpi, type PieceKey } from "../_shared/rules/inpi.ts";
import { zip, type ZipEntry } from "../_shared/zip.ts";

const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

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
  for (const p of PIECES.filter((x) => !x.generee)) {
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

  const entries: ZipEntry[] = [];
  const pretes = new Set<PieceKey>();
  const compte: Partial<Record<PieceKey, number>> = {};
  for (const p of pieces) {
    const bytes = await pieceEnPdf(p);
    if (!bytes) continue;
    pretes.add(p.key);
    const n = (compte[p.key] = (compte[p.key] ?? 0) + 1);
    const label = PIECES.find((x) => x.key === p.key)?.label ?? p.key;
    entries.push({ nom: `pieces/${slug(label)}${n > 1 ? `-${n}` : ""}.pdf`, data: bytes });
  }

  entries.unshift(
    { nom: "1-fiche-de-saisie.pdf", data: await buildFichePdf(d, ref, [...pretes]) },
    { nom: "2-declaration-non-condamnation-a-signer.pdf", data: await buildDncPdf(d) },
  );

  const nom = `dossier-creation-${ref}.zip`;
  return new Response(zip(entries) as unknown as BodyInit, {
    status: 200,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
});
