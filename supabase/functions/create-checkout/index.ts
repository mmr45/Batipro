// Crée une session Stripe Checkout pour le compte connecté.
// L'identité vient du JWT, jamais du body : impossible d'acheter « pour » un autre compte.
import { HttpError, adminClient, json, readJson, requireUser, serve, siteUrl, type ProductKey } from "../_shared/http.ts";
import { PRICES, getOrCreateCustomer, stripe } from "../_shared/stripe.ts";

serve(async (req) => {
  const user = await requireUser(req);
  const { plan } = await readJson<{ plan?: string }>(req);
  if (plan !== "dossier" && plan !== "pro") throw new HttpError(400, "Offre inconnue.");
  const key = plan as ProductKey;

  const { data: existing } = await adminClient()
    .from("entitlements")
    .select("product_key")
    .eq("user_id", user.id)
    .eq("product_key", key)
    .eq("active", true)
    .maybeSingle();
  if (existing) throw new HttpError(409, key === "pro" ? "Votre abonnement Pro est déjà actif." : "Vous avez déjà le Pack Lancement.");

  const customer = await getOrCreateCustomer(user.id, user.email);
  const base = siteUrl(req);
  const meta = { plan: key, supabase_user_id: user.id };
  const { price, mode } = PRICES[key];

  const session = await stripe.checkout.sessions.create({
    mode,
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    metadata: meta,
    locale: "fr",
    allow_promotion_codes: true,
    billing_address_collection: "required",
    customer_update: { address: "auto", name: "auto" },
    tax_id_collection: { enabled: true },
    success_url: `${base}/espace?paiement=succes&offre=${key}`,
    cancel_url: `${base}/tarifs?paiement=annule`,
    ...(mode === "payment"
      ? { invoice_creation: { enabled: true, invoice_data: { metadata: meta } }, payment_intent_data: { metadata: meta } }
      : { subscription_data: { metadata: meta } }),
    custom_text: {
      submit: {
        message:
          mode === "payment"
            ? "Accès immédiat au contenu numérique : en validant, vous demandez son exécution sans attendre et renoncez à votre droit de rétractation (art. L221-28 13° du Code de la consommation)."
            : "Abonnement sans engagement, résiliable à tout moment depuis votre espace. L'accès démarre dès la validation du paiement.",
      },
    },
  });

  if (!session.url) throw new HttpError(502, "Stripe n'a pas renvoyé d'adresse de paiement.");
  return json(req, { url: session.url });
});
