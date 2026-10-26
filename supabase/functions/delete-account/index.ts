// Suppression définitive du compte (RGPD, art. 17) : résilie l'abonnement,
// efface les fichiers puis le compte (les tables suivent en cascade).
// Les devis archivés étant liés au compte, ils sont supprimés aussi :
// l'utilisateur est invité à les télécharger avant.
import { adminClient, json, readJson, requireUser, serve, HttpError } from "../_shared/http.ts";
import { stripe } from "../_shared/stripe.ts";
import { PIECES } from "../_shared/rules/inpi.ts";

serve(async (req) => {
  const user = await requireUser(req);
  const { confirmation } = await readJson<{ confirmation?: string }>(req);
  if (confirmation !== "SUPPRIMER") throw new HttpError(400, "Confirmation manquante.");
  const db = adminClient();

  const { data: ents } = await db
    .from("entitlements")
    .select("stripe_subscription_id, active")
    .eq("user_id", user.id)
    .eq("product_key", "pro");
  for (const e of ents ?? []) {
    if (e.active && e.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(e.stripe_subscription_id);
      } catch (err) {
        console.warn("Résiliation Stripe impossible", err);
      }
    }
  }

  const paths: string[] = [];
  for (const p of PIECES) {
    const { data: files } = await db.storage.from("justificatifs").list(`${user.id}/${p.key}`, { limit: 100 });
    for (const f of files ?? []) paths.push(`${user.id}/${p.key}/${f.name}`);
  }
  if (paths.length) await db.storage.from("justificatifs").remove(paths);

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(500, "Suppression du compte impossible, contactez-nous.");
  return json(req, { ok: true });
});
