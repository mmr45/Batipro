import { sb, SUPABASE_URL, SUPABASE_PUBLIC_KEY } from "./supabase";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await sb().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, "Connectez-vous pour continuer.");
  return { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLIC_KEY, "Content-Type": "application/json" };
}

async function call(fn: string, body: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(0, "Connexion au serveur impossible. Vérifiez votre réseau puis réessayez.");
  }
  if (!res.ok) {
    let message = `Le serveur a répondu avec une erreur (${res.status}).`;
    let details: unknown;
    try {
      const j = await res.json();
      if (j?.error) message = j.error;
      details = j?.details;
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(res.status, message, details);
  }
  return res;
}

export async function callJson<T>(fn: string, body?: unknown): Promise<T> {
  return (await call(fn, body)).json() as Promise<T>;
}

/** Appelle une fonction qui renvoie un PDF et déclenche le téléchargement. */
export async function downloadPdf(fn: string, body: unknown, fallbackName: string): Promise<{ numero?: string }> {
  const res = await call(fn, body);
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") ?? "";
  const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { numero: res.headers.get("x-devis-numero") ?? undefined };
}

export async function startCheckout(plan: "dossier" | "pro") {
  const { url } = await callJson<{ url: string }>("create-checkout", { plan });
  window.location.assign(url);
}

export async function openBillingPortal() {
  const { url } = await callJson<{ url: string }>("create-portal-session");
  window.location.assign(url);
}

export async function saveSubmission(type: "qualif" | "statut" | "inpi" | "assurance", summary: string, data: unknown) {
  const client = sb();
  const { data: s } = await client.auth.getSession();
  if (!s.session) return false;
  const { error } = await client.from("submissions").insert({ type, summary, payload: { data } });
  return !error;
}

export async function lastSubmission<T>(type: "qualif" | "statut" | "inpi" | "assurance") {
  const { data } = await sb()
    .from("submissions")
    .select("summary, payload, created_at")
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { summary: data.summary as string, created_at: data.created_at as string, data: (data.payload?.data ?? null) as T | null };
}
