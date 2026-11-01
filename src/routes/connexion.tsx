import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BadgeCheck, Check, FileSignature, ShieldCheck } from "lucide-react";
import { Button, Checkbox, Field, Input, Notice, revision } from "@/components/ui";
import { Logo, LogoMark } from "@/components/layout";
import { seo } from "@/lib/seo";
import { sb, SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

type Mode = "connexion" | "inscription" | "oubli" | "nouveau";

export const Route = createFileRoute("/connexion")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode; redirect?: string } => ({
    mode: ["connexion", "inscription", "oubli", "nouveau"].includes(String(s.mode)) ? (s.mode as Mode) : undefined,
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") && !s.redirect.startsWith("//") ? s.redirect : undefined,
  }),
  head: () => seo({ title: "Connexion", description: "Accédez à votre espace Bâtipro.", path: "/connexion", noindex: true }),
  component: Page,
});

const TITRES: Record<Mode, string> = {
  connexion: "Se connecter",
  inscription: "Créer un compte",
  oubli: "Mot de passe oublié",
  nouveau: "Nouveau mot de passe",
};

function traduire(msg: string): string {
  if (/invalid login/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/already registered|already exists/i.test(msg)) return "Un compte existe déjà avec cet email : connectez-vous.";
  if (/email not confirmed/i.test(msg)) return "Confirmez d'abord votre email avec le lien reçu.";
  if (/password should be at least|weak/i.test(msg)) return "Mot de passe trop faible : 8 caractères minimum, avec lettres et chiffres.";
  if (/rate limit/i.test(msg)) return "Trop de tentatives. Patientez quelques minutes.";
  if (/access_denied|cancel/i.test(msg)) return "Connexion Google annulée.";
  if (/provider is not enabled|unsupported provider/i.test(msg)) return "La connexion Google n'est pas encore activée. Utilisez votre email.";
  return msg;
}

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, recovering } = useAuth();
  const [mode, setMode] = useState<Mode>("connexion");
  useEffect(() => {
    if (search.mode) setMode(search.mode);
  }, [search.mode]);
  const [f, setF] = useState({ prenom: "", nom: "", email: "", password: "", cgu: false });
  const [busy, setBusy] = useState(false);
  const [busyGoogle, setBusyGoogle] = useState(false);
  // Le bouton Google n'apparaît que si le fournisseur est activé côté Supabase :
  // sinon le visiteur tomberait sur une page d'erreur brute.
  const [googleDispo, setGoogleDispo] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const target = search.redirect ?? "/espace";

  useEffect(() => {
    if (recovering) setMode("nouveau");
  }, [recovering]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLIC_KEY }, signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg: { external?: Record<string, boolean> } | null) => setGoogleDispo(cfg?.external?.google === true))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  // Retour de Google avec une erreur (refus, annulation) : on l'affiche puis on nettoie l'adresse.
  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const err = url.searchParams.get("error_description") ?? hash.get("error_description") ?? url.searchParams.get("error") ?? hash.get("error");
    if (!err) return;
    toast.error(traduire(err));
    for (const k of ["error", "error_code", "error_description"]) url.searchParams.delete(k);
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, []);
  useEffect(() => {
    if (user && mode !== "nouveau" && !recovering) navigate({ to: target });
  }, [user, mode, recovering, navigate, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setInfo(null);
    const client = sb();
    try {
      if (mode === "connexion") {
        const { error } = await client.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
      } else if (mode === "inscription") {
        if (!f.cgu) throw new Error("Acceptez les conditions pour créer votre compte.");
        if (f.password.length < 8) throw new Error("Mot de passe trop court : 8 caractères minimum.");
        const { data, error } = await client.auth.signUp({
          email: f.email.trim(),
          password: f.password,
          options: {
            data: { prenom: f.prenom.trim(), nom: f.nom.trim() },
            emailRedirectTo: `${window.location.origin}${target}`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo(`Compte créé. Un email de confirmation vient d'être envoyé à ${f.email} : cliquez sur le lien pour activer votre compte.`);
          setMode("connexion");
        }
      } else if (mode === "oubli") {
        const { error } = await client.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: `${window.location.origin}/connexion?mode=nouveau` });
        if (error) throw error;
        setInfo("Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.");
      } else {
        if (f.password.length < 8) throw new Error("Mot de passe trop court : 8 caractères minimum.");
        const { error } = await client.auth.updateUser({ password: f.password });
        if (error) throw error;
        toast.success("Mot de passe modifié");
        navigate({ to: "/espace" });
      }
    } catch (err) {
      toast.error(traduire((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusyGoogle(true);
    // Retour sur cette page : une erreur éventuelle s'y affiche, et la redirection
    // vers la page demandée se fait dès que la session est ouverte.
    const retour = `${window.location.origin}/connexion?redirect=${encodeURIComponent(target)}`;
    const { error } = await sb().auth.signInWithOAuth({ provider: "google", options: { redirectTo: retour } });
    if (error) {
      setBusyGoogle(false);
      toast.error(traduire(error.message) || "Connexion Google indisponible pour le moment.");
    }
  }

  const sousTitre: Record<Mode, string> = {
    connexion: "Content de vous revoir. Retrouvez vos résultats, dossiers et devis.",
    inscription: "Gratuit, sans carte bancaire. Vos résultats et dossiers sont rattachés à votre compte.",
    oubli: "Indiquez votre email : nous vous envoyons un lien pour choisir un nouveau mot de passe.",
    nouveau: "Choisissez un nouveau mot de passe d'au moins 8 caractères.",
  };

  return (
    <div className="px-2 py-2 sm:px-3 sm:py-3">
      <div className="grid min-h-[calc(100dvh-5.5rem)] overflow-hidden rounded-[28px] bg-papier shadow-[0_0_0_1px_rgb(11_18_32/0.06)] lg:grid-cols-[1fr_1.05fr]">
        <div className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-[25rem]">
            <LogoMark className="h-10 w-10" />
            <h1 className="display mt-6 text-[32px] sm:text-[36px]">{TITRES[mode]}</h1>
            <p className="mt-2 text-[15px] text-encre-2">{sousTitre[mode]}</p>

            <div className="mt-8 space-y-4">
              {googleDispo && (mode === "connexion" || mode === "inscription") && (
                <>
                  <Button variant="secondary" size="lg" className="w-full" onClick={google} loading={busyGoogle}>
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
                      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
                      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
                      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
                      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
                    </svg>
                    Continuer avec Google
                  </Button>
                  {mode === "inscription" && (
                    <p className="-mt-1 text-center text-[12.5px] leading-snug text-encre-3">
                      Avec Google, vous acceptez les{" "}
                      <Link to="/legal/$page" params={{ page: "cgv" }} target="_blank" className="underline decoration-encre/20 underline-offset-2 hover:text-encre-2">conditions générales</Link> et la{" "}
                      <Link to="/legal/$page" params={{ page: "confidentialite" }} target="_blank" className="underline decoration-encre/20 underline-offset-2 hover:text-encre-2">politique de confidentialité</Link>.
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[12.5px] font-medium text-encre-3">
                    <span className="h-px flex-1 bg-encre/[0.08]" />
                    ou avec votre email
                    <span className="h-px flex-1 bg-encre/[0.08]" />
                  </div>
                </>
              )}
              {info && <Notice tone="ok">{info}</Notice>}
              <form onSubmit={submit} className="space-y-4">
                {mode === "inscription" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prénom" htmlFor="prenom"><Input id="prenom" required value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} autoComplete="given-name" /></Field>
                    <Field label="Nom" htmlFor="nom"><Input id="nom" required value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} autoComplete="family-name" /></Field>
                  </div>
                )}
                {mode !== "nouveau" && (
                  <Field label="Email" htmlFor="email"><Input id="email" type="email" required placeholder="vous@exemple.fr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
                )}
                {mode !== "oubli" && (
                  <div className="relative">
                    <Field label={mode === "nouveau" ? "Nouveau mot de passe" : "Mot de passe"} htmlFor="pw" hint={mode !== "connexion" ? "8 caractères minimum." : undefined}>
                      <Input id="pw" type="password" required minLength={mode === "connexion" ? undefined : 8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete={mode === "connexion" ? "current-password" : "new-password"} />
                    </Field>
                    {mode === "connexion" && (
                      <button type="button" className="absolute right-0 top-0 text-[13px] font-semibold text-bleu hover:text-bleu-fonce" onClick={() => setMode("oubli")}>
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                )}
                {mode === "inscription" && (
                  <Checkbox
                    id="cgu"
                    checked={f.cgu}
                    onChange={(v) => setF({ ...f, cgu: v })}
                    label={
                      <>
                        J'accepte les{" "}
                        <Link to="/legal/$page" params={{ page: "cgv" }} target="_blank" className="font-medium text-bleu underline decoration-bleu/30 underline-offset-2">conditions générales</Link> et la{" "}
                        <Link to="/legal/$page" params={{ page: "confidentialite" }} target="_blank" className="font-medium text-bleu underline decoration-bleu/30 underline-offset-2">politique de confidentialité</Link>.
                      </>
                    }
                  />
                )}
                <Button type="submit" variant="encre" size="lg" loading={busy} className="w-full">
                  {{ connexion: "Se connecter", inscription: "Créer mon compte", oubli: "Envoyer le lien", nouveau: "Enregistrer le mot de passe" }[mode]}
                </Button>
              </form>
              <p className="pt-2 text-center text-[14px] text-encre-2">
                {mode === "connexion" ? (
                  <>
                    Pas encore de compte ?{" "}
                    <button className="font-semibold text-bleu hover:text-bleu-fonce" onClick={() => setMode("inscription")}>Créer un compte</button>
                  </>
                ) : (
                  <>
                    {mode === "inscription" ? "Déjà inscrit ? " : ""}
                    <button className="font-semibold text-bleu hover:text-bleu-fonce" onClick={() => setMode("connexion")}>
                      {mode === "inscription" ? "Se connecter" : "Retour à la connexion"}
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <aside className="relative isolate hidden overflow-hidden bg-nuit p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden className="grille-nuit masque-radial pointer-events-none absolute inset-0" />
          <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 -z-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(47_91_234/0.5),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-20 -z-10 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_106_31/0.25),transparent)]" />
          <Logo inverse />
          <PileDocuments />
          <div>
            <p className="display max-w-md text-[34px] leading-[1.1]">
              Votre entreprise du bâtiment, <span className="texte-degrade">de l'idée au premier devis.</span>
            </p>
            <ul className="mt-10 space-y-4">
              {[
                { I: BadgeCheck, t: "Qualification et statut vérifiés", d: "Selon le Code de l'artisanat et les taux 2026." },
                { I: ShieldCheck, t: "Dossier INPI et décennale prêts", d: "Toutes vos pièces réunies en un seul PDF." },
                { I: FileSignature, t: "Devis conformes en quelques minutes", d: "Les mentions obligatoires générées pour vous." },
              ].map(({ I, t, d }) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-bleu-clair ring-1 ring-inset ring-white/10">
                    <I className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="text-[14px] text-white/55">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="flex items-center gap-2 text-[13px] text-white/45">
            <Check className="h-3.5 w-3.5 text-[#3ddc97]" strokeWidth={3} aria-hidden /> Règles vérifiées le {revision()}
          </p>
        </aside>
      </div>
    </div>
  );
}

/** Les trois pièces du parcours, empilées en 3D isométrique. Décoratif. */
function PileDocuments() {
  const feuilles = [
    { n: 0, t: "Dossier INPI", c: "from-[#1b2550] to-[#141b38]", trait: "bg-white/25" },
    { n: 1, t: "Attestation décennale", c: "from-[#2a3f9e] to-[#1f2f7a]", trait: "bg-white/30" },
    { n: 2, t: "Devis D2026-0042", c: "from-[#2f5bea] to-[#5a3fd6]", trait: "bg-white/40" },
  ];
  return (
    <div aria-hidden className="pointer-events-auto absolute right-28 top-28 hidden h-48 w-40 [perspective:1100px] xl:block 2xl:right-36">
      <div className="pile-3d relative h-full w-full">
        {feuilles.map((f) => (
          <div
            key={f.t}
            style={{ "--n": f.n } as React.CSSProperties}
            className={`bg-gradient-to-br ${f.c} p-4 shadow-[0_30px_50px_-20px_rgb(0_0_0/0.6)] ring-1 ring-inset ring-white/15`}
          >
            <p className="text-[11px] font-semibold text-white/85">{f.t}</p>
            <div className="mt-3 space-y-1.5">
              <div className={`h-1.5 w-4/5 rounded-full ${f.trait}`} />
              <div className={`h-1.5 w-3/5 rounded-full ${f.trait}`} />
              <div className={`h-1.5 w-2/3 rounded-full ${f.trait}`} />
            </div>
            {f.n === 2 && (
              <div className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#3ddc97] text-nuit">
                <Check className="h-4 w-4" strokeWidth={3} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
