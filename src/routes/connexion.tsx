import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button, Card, Checkbox, Container, Field, Input, Notice } from "@/components/ui";
import { seo } from "@/lib/seo";
import { sb } from "@/lib/supabase";
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
  const [info, setInfo] = useState<string | null>(null);
  const target = search.redirect ?? "/espace";

  useEffect(() => {
    if (recovering) setMode("nouveau");
  }, [recovering]);
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
    const { error } = await sb().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}${target}` } });
    if (error) toast.error("Connexion Google indisponible pour le moment.");
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md">
        <h1 className="display text-5xl">{TITRES[mode]}</h1>
        {mode === "inscription" && <p className="mt-2 text-ardoise-2">Gratuit, sans carte bancaire. Vos résultats et dossiers sont rattachés à votre compte.</p>}
        <Card className="mt-6 space-y-4">
          {info && <Notice tone="ok">{info}</Notice>}
          <form onSubmit={submit} className="space-y-4">
            {mode === "inscription" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prénom" htmlFor="prenom"><Input id="prenom" required value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} autoComplete="given-name" /></Field>
                <Field label="Nom" htmlFor="nom"><Input id="nom" required value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} autoComplete="family-name" /></Field>
              </div>
            )}
            {mode !== "nouveau" && (
              <Field label="Email" htmlFor="email"><Input id="email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
            )}
            {mode !== "oubli" && (
              <Field label={mode === "nouveau" ? "Nouveau mot de passe" : "Mot de passe"} htmlFor="pw" hint={mode !== "connexion" ? "8 caractères minimum." : undefined}>
                <Input id="pw" type="password" required minLength={mode === "connexion" ? undefined : 8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete={mode === "connexion" ? "current-password" : "new-password"} />
              </Field>
            )}
            {mode === "inscription" && (
              <Checkbox
                id="cgu"
                checked={f.cgu}
                onChange={(v) => setF({ ...f, cgu: v })}
                label={
                  <>
                    J'accepte les{" "}
                    <Link to="/legal/$page" params={{ page: "cgv" }} target="_blank" className="text-bleu underline">conditions générales</Link> et la{" "}
                    <Link to="/legal/$page" params={{ page: "confidentialite" }} target="_blank" className="text-bleu underline">politique de confidentialité</Link>.
                  </>
                }
              />
            )}
            <Button type="submit" loading={busy} className="w-full">
              {{ connexion: "Se connecter", inscription: "Créer mon compte", oubli: "Envoyer le lien", nouveau: "Enregistrer le mot de passe" }[mode]}
            </Button>
          </form>
          {(mode === "connexion" || mode === "inscription") && (
            <>
              <div className="flex items-center gap-3 text-[13px] text-ardoise-3"><span className="h-px flex-1 bg-ardoise/10" />ou<span className="h-px flex-1 bg-ardoise/10" /></div>
              <Button variant="secondary" className="w-full" onClick={google}>Continuer avec Google</Button>
            </>
          )}
          <div className="flex flex-wrap justify-between gap-2 border-t border-ardoise/10 pt-4 text-[14px]">
            {mode === "connexion" ? (
              <>
                <button className="font-semibold text-bleu" onClick={() => setMode("inscription")}>Créer un compte</button>
                <button className="text-ardoise-2 underline" onClick={() => setMode("oubli")}>Mot de passe oublié ?</button>
              </>
            ) : (
              <button className="font-semibold text-bleu" onClick={() => setMode("connexion")}>J'ai déjà un compte</button>
            )}
          </div>
        </Card>
      </div>
    </Container>
  );
}
