// Ouvre le portail client Stripe (factures, carte, résiliation de l'abonnement).
import { HttpError, adminClient, json, requireUser, serve, siteUrl } from "../_shared/http.ts";
import { stripe } from "../_shared/stripe.ts";

serve(async (req) => {
  const user = await requireUser(req);
  const { data } = await adminClient().from("stripe_customers").select("customer_id").eq("user_id", user.id).maybeSingle();
  if (!data?.customer_id) throw new HttpError(404, "Aucun paiement associé à ce compte pour le moment.");
  const session = await stripe.billingPortal.sessions.create({
    customer: data.customer_id,
    return_url: `${siteUrl(req)}/espace`,
    locale: "fr",
  });
  return json(req, { url: session.url });
});
