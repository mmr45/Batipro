import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Valeurs publiques (clé « anon » / publishable) : elles peuvent figurer dans
// le code du navigateur. La sécurité repose sur les policies RLS de la base.
export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://pznuuwydfqvsuilimjgm.supabase.co";
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnV1d3lkZnF2c3VpbGltamdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxODA5NjcsImV4cCI6MjA5ODc1Njk2N30.FsbtveO1ZYGlaXsub4X3s6yi61nU0oyJqmrSODKOpDM";

let client: SupabaseClient | null = null;

/** Client Supabase côté navigateur uniquement (le pré-rendu ne doit pas ouvrir de session). */
export function sb(): SupabaseClient {
  if (typeof window === "undefined") throw new Error("Supabase n'est utilisable que dans le navigateur.");
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    });
  }
  return client;
}

export const SUPABASE_PUBLIC_KEY = SUPABASE_KEY;
