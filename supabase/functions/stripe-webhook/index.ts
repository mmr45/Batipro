// Webhook Stripe — SEUL point d'écriture des droits d'accès (entitlements).
// Événements attendus (déjà configurés sur l'endpoint Stripe live) :
//   checkout.session.completed, invoice.paid,
//   customer.subscription.updated, customer.subscription.deleted
// Recommandé en plus : checkout.session.async_payment_succeeded,
//   customer.subscription.created, charge.refunded
import type Stripe from "npm:stripe@23";
import { adminClient } from "../_shared/http.ts";
import { cryptoProvider, planFromPrice, stripe, userIdForCustomer } from "../_shared/stripe.ts";

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const db = adminClient();

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

async function upsertEntitlement(row: {
  user_id: string;
  product_key: "dossier" | "pro";
  active: boolean;
  status?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_checkout_session_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}) {
  const { error } = await db.from("entitlements").upsert({ source: "stripe", ...row }, { onConflict: "user_id,product_key" });
  if (error) throw new Error(`Écriture entitlement impossible : ${error.message}`);
}

async function linkCustomer(userId: string, customerId: string | null) {
  if (!customerId) return;
  await db.from("stripe_customers").upsert({ user_id: userId, customer_id: customerId }, { onConflict: "user_id" });
}

function idOf(x: string | { id: string } | null | undefined): string | null {
  if (!x) return null;
  return typeof x === "string" ? x : x.id;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = idOf(sub.customer);
  const userId = sub.metadata?.supabase_user_id || (await userIdForCustomer(customerId));
  if (!userId) {
    console.warn("Abonnement sans compte associé", sub.id);
    return;
  }
  const item = sub.items?.data?.[0];
  const plan = planFromPrice(item?.price?.id) ?? (sub.metadata?.plan as "pro" | undefined) ?? "pro";
  if (plan !== "pro") return;
  // Selon la version d'API, la fin de période est portée par l'item ou par l'abonnement.
  const periodEnd =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    null;
  await linkCustomer(userId, customerId);
  await upsertEntitlement({
    user_id: userId,
    product_key: "pro",
    active: ACTIVE_STATUSES.has(sub.status),
    status: sub.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end,
  });
}

async function handleCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id || session.client_reference_id;
  const plan = session.metadata?.plan;
  if (!userId || (plan !== "dossier" && plan !== "pro")) {
    console.warn("Session sans métadonnées exploitables", session.id);
    return;
  }
  const customerId = idOf(session.customer);
  await linkCustomer(userId, customerId);

  if (plan === "dossier") {
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return; // paiement différé : attendre async_payment_succeeded
    await upsertEntitlement({
      user_id: userId,
      product_key: "dossier",
      active: true,
      status: "paid",
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
    });
  } else {
    const subId = idOf(session.subscription as string | { id: string } | null);
    if (subId) await syncSubscription(await stripe.subscriptions.retrieve(subId));
  }
}

async function handleRefund(charge: Stripe.Charge) {
  if (!charge.refunded) return; // remboursement partiel : on ne retire pas l'accès
  const piId = idOf(charge.payment_intent as string | { id: string } | null);
  if (!piId) return;
  const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
  const s = sessions.data[0];
  const userId = s?.metadata?.supabase_user_id;
  if (s && userId && s.metadata?.plan === "dossier") {
    await upsertEntitlement({ user_id: userId, product_key: "dossier", active: false, status: "refunded" });
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });
  const signature = req.headers.get("Stripe-Signature");
  if (!signature || !WEBHOOK_SECRET) return new Response("Signature manquante", { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (e) {
    console.error("Signature Stripe invalide", e);
    return new Response("Signature invalide", { status: 400 });
  }

  // Idempotence : Stripe peut renvoyer le même événement plusieurs fois.
  const { error: dup } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup) {
    if (dup.code === "23505") return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    console.error("stripe_events", dup);
    return new Response("Erreur base", { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckout(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice & {
          subscription?: string | { id: string } | null;
          parent?: { subscription_details?: { subscription?: string | { id: string } } };
        };
        const subId = idOf(inv.parent?.subscription_details?.subscription ?? inv.subscription ?? null);
        if (subId) await syncSubscription(await stripe.subscriptions.retrieve(subId));
        break;
      }
      case "charge.refunded":
        await handleRefund(event.data.object as Stripe.Charge);
        break;
      default:
        break;
    }
  } catch (e) {
    // On libère l'événement pour que le renvoi automatique de Stripe le retraite.
    await db.from("stripe_events").delete().eq("id", event.id);
    console.error(`Traitement ${event.type} échoué`, e);
    return new Response("Erreur de traitement", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
