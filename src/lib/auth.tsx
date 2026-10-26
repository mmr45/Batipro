import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { sb } from "./supabase";

export interface Profile {
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
}

export interface Access {
  dossier: boolean;
  pro: boolean;
  proPeriodEnd: string | null;
  proCancelAtPeriodEnd: boolean;
}

interface AuthState {
  ready: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  access: Access;
  isAdmin: boolean;
  recovering: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const NO_ACCESS: Access = { dossier: false, pro: false, proPeriodEnd: null, proCancelAtPeriodEnd: false };

const Ctx = createContext<AuthState>({
  ready: false,
  session: null,
  user: null,
  profile: null,
  access: NO_ACCESS,
  isAdmin: false,
  recovering: false,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [access, setAccess] = useState<Access>(NO_ACCESS);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setAccess(NO_ACCESS);
      setIsAdmin(false);
      return;
    }
    const client = sb();
    const [p, a, adm] = await Promise.all([
      client.from("profiles").select("prenom, nom, telephone").eq("user_id", s.user.id).maybeSingle(),
      client.rpc("my_access"),
      client.rpc("is_admin"),
    ]);
    setProfile((p.data as Profile) ?? null);
    const row = Array.isArray(a.data) ? a.data[0] : a.data;
    setAccess(
      row
        ? {
            dossier: !!row.dossier,
            pro: !!row.pro,
            proPeriodEnd: row.pro_period_end ?? null,
            proCancelAtPeriodEnd: !!row.pro_cancel_at_period_end,
          }
        : NO_ACCESS,
    );
    setIsAdmin(adm.data === true);
  }, []);

  useEffect(() => {
    const client = sb();
    let mounted = true;
    client.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await load(data.session).catch(() => {});
      setReady(true);
    });
    const { data: sub } = client.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      // Différé : ne jamais appeler Supabase de façon synchrone dans ce callback.
      setTimeout(() => load(s).catch(() => {}), 0);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      profile,
      access,
      isAdmin,
      recovering,
      refresh: () => load(session),
      signOut: async () => {
        await sb().auth.signOut();
        setRecovering(false);
      },
    }),
    [ready, session, profile, access, isAdmin, recovering, load],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}

export function displayName(user: User | null, profile: Profile | null) {
  const n = [profile?.prenom, profile?.nom].filter(Boolean).join(" ");
  return n || user?.email || "";
}
