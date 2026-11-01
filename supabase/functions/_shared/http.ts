// Helpers HTTP communs aux Edge Functions : CORS, réponses JSON, auth.
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Domaines autorisés à appeler les fonctions depuis un navigateur. */
export function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  return (
    ALLOWED_ORIGINS.includes(origin) ||
    origin === "https://batipro-ten.vercel.app" ||
    /^http:\/\/localhost:\d+$/.test(origin) ||
    // Prévisualisations Vercel du projet uniquement (batipro-xxx.vercel.app)
    /^https:\/\/batipro(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
  );
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0] ?? "https://batipro-ten.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "content-disposition, x-devis-numero",
    Vary: "Origin",
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

export function pdfResponse(req: Request, bytes: Uint8Array, filename: string, extra: Record<string, string> = {}) {
  const safe = filename.replace(/[^\w.-]+/g, "_");
  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      ...corsHeaders(req),
      ...extra,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safe}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Vérifie le JWT de l'appelant. Toute la suite utilise l'id renvoyé, jamais une valeur du body. */
export async function requireUser(req: Request): Promise<User> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Authentification requise.");
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Session expirée, reconnectez-vous.");
  return data.user;
}

export type ProductKey = "dossier" | "pro";

export async function hasEntitlement(userId: string, key: ProductKey): Promise<boolean> {
  const { data, error } = await adminClient()
    .from("entitlements")
    .select("product_key")
    .eq("user_id", userId)
    .eq("product_key", key)
    .eq("active", true)
    .limit(1);
  if (error) throw new HttpError(500, "Impossible de vérifier vos droits d'accès.");
  return (data ?? []).length > 0;
}

export function siteUrl(req: Request): string {
  const env = Deno.env.get("SITE_URL");
  if (env) return env.replace(/\/$/, "");
  // L'en-tête Origin n'est repris que s'il est autorisé : les adresses de retour
  // Stripe ne peuvent pas pointer vers un site tiers.
  const origin = req.headers.get("Origin") ?? "";
  if (isAllowedOrigin(origin)) return origin;
  return "https://batipro-ten.vercel.app";
}

/** Enveloppe commune : CORS, méthode POST, erreurs propres. */
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, { error: "Méthode non autorisée." }, 405);
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json(req, { error: e.message, details: e.details }, e.status);
      console.error(e);
      return json(req, { error: "Erreur serveur inattendue. Réessayez dans un instant." }, 500);
    }
  });
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
