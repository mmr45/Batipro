// Suppression définitive du compte (RGPD, art. 17) : résilie l'abonnement,
// efface les fichiers puis le compte (les tables suivent en cascade).
// Les devis archivés étant liés au compte, ils sont supprimés aussi :
// l'utilisateur est invité à les télécharger avant.
import { adminClient, json, readJson, requireUser, serve, HttpError } from "../_shared/http.ts";
import { stripe } from "../_shared/stripe.ts";

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

  // Tous les fichiers du dossier du compte, quel que soit le sous-dossier.
  const paths: string[] = [];
  const bucket = db.storage.from("justificatifs");
  const pending = [user.id];
  while (pending.length && paths.length < 5000) {
    const dir = pending.shift()!;
    for (let offset = 0; ; offset += 100) {
      const { data: entries, error } = await bucket.list(dir, { limit: 100, offset });
      if (error) throw new HttpError(500, "Suppression des fichiers impossible, réessayez.");
      for (const e of entries ?? []) {
        // Un dossier n'a pas d'id dans la réponse de l'API Storage.
        if (e.id) paths.push(`${dir}/${e.name}`);
        else pending.push(`${dir}/${e.name}`);
      }
      if (!entries || entries.length < 100) break;
    }
  }
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await bucket.remove(paths.slice(i, i + 100));
    if (error) throw new HttpError(500, "Suppression des fichiers impossible, réessayez.");
  }

  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(500, "Suppression du compte impossible, contactez-nous.");
  return json(req, { ok: true });
});
