import Stripe from "npm:stripe@23";
import { adminClient, HttpError, type ProductKey } from "./http.ts";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Les Price IDs ne sont pas secrets ; ils restent surchargeables par variable
// d'environnement pour pouvoir tester en mode test sans toucher au code.
export const PRICES: Record<ProductKey, { price: string; mode: "payment" | "subscription"; label: string }> = {
  dossier: {
    price: Deno.env.get("STRIPE_PRICE_DOSSIER") ?? "price_1Tpek2Fsuo9AuDccEP098jXv",
    mode: "payment",
    label: "Pack Lancement (89 €)",
  },
  pro: {
    price: Deno.env.get("STRIPE_PRICE_PRO") ?? "price_1TpekTFsuo9AuDcckdohxA5o",
    mode: "subscription",
    label: "Abonnement Pro (19 €/mois)",
  },
};

export function planFromPrice(priceId: string | null | undefined): ProductKey | null {
  if (!priceId) return null;
  return (Object.keys(PRICES) as ProductKey[]).find((k) => PRICES[k].price === priceId) ?? null;
}

/** Retrouve ou crée le client Stripe d'un compte (un seul client par compte). */
export async function getOrCreateCustomer(userId: string, email: string | undefined): Promise<string> {
  const db = adminClient();
  const { data } = await db.from("stripe_customers").select("customer_id").eq("user_id", userId).maybeSingle();
  if (data?.customer_id) return data.customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });
  const { error } = await db.from("stripe_customers").insert({ user_id: userId, customer_id: customer.id });
  if (error) {
    // Course possible entre deux onglets : on relit la valeur gagnante.
    const again = await db.from("stripe_customers").select("customer_id").eq("user_id", userId).maybeSingle();
    if (again.data?.customer_id) return again.data.customer_id;
    throw new HttpError(500, "Impossible d'enregistrer le client de paiement.");
  }
  return customer.id;
}

export async function userIdForCustomer(customerId: string | null | undefined): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await adminClient()
    .from("stripe_customers")
    .select("user_id")
    .eq("customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}
