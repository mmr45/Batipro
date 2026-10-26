import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button, ButtonLink, Card, Container, Field, Input, Notice, Spinner } from "@/components/ui";
import { RequireAuth } from "@/components/layout";
import { seo } from "@/lib/seo";
import { displayName, useAuth } from "@/lib/auth";
import { sb } from "@/lib/supabase";
import { ApiError, callJson, downloadPdf, lastSubmission, openBillingPortal, startCheckout } from "@/lib/api";
import { dateFr } from "@/lib/utils";
import { formatEuro } from "@rules/reglementation.ts";

export const Route = createFileRoute("/espace")({
  validateSearch: (s: Record<string, unknown>): { paiement?: string; offre?: string } => ({
    paiement: typeof s.paiement === "string" ? s.paiement : undefined,
    offre: typeof s.offre === "string" ? s.offre : undefined,
  }),
  head: () => seo({ title: "Mon espace", description: "Vos résultats, dossiers, devis et abonnement.", path: "/espace", noindex: true }),
  component: Page,
});

function Page() {
  return (
    <Container className="py-10">
      <RequireAuth>
        <Espace />
      </RequireAuth>
    </Container>
  );
}

interface DevisRow {
  id: string;
  numero: string;
  client_nom: string;
  intitule: string;
  total_ttc: number;
  created_at: string;
}

type Resume = { summary: string; created_at: string } | null;

function Espace() {
  const { user, profile, access, refresh, isAdmin } = useAuth();
  const { paiement, offre } = Route.useSearch();
  const [res, setRes] = useState<{ qualif: Resume; statut: Resume; inpi: Resume; assurance: Resume } | null>(null);
  const [devis, setDevis] = useState<DevisRow[] | null>(null);
  const [attente, setAttente] = useState(false);
  useEffect(() => {
    if (paiement === "succes") setAttente(true);
  }, [paiement]);

  const load = useCallback(async () => {
    const [qualif, statut, inpi, assurance] = await Promise.all([
      lastSubmission("qualif"),
      lastSubmission("statut"),
      lastSubmission("inpi"),
      lastSubmission("assurance"),
    ]);
    setRes({ qualif, statut, inpi, assurance });
    const { data } = await sb().from("devis").select("id, numero, client_nom, intitule, total_ttc, created_at").order("created_at", { ascending: false }).limit(200);
    setDevis((data as DevisRow[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Après un paiement, le webhook Stripe peut mettre quelques secondes à arriver.
  useEffect(() => {
    if (!attente) return;
    const ok = offre === "pro" ? access.pro : offre === "dossier" ? access.dossier : access.pro || access.dossier;
    if (ok) {
      setAttente(false);
      toast.success("Paiement confirmé, votre accès est actif.");
      window.history.replaceState({}, "", "/espace");
      return;
    }
    let n = 0;
    const t = setInterval(() => {
      n++;
      refresh();
      if (n > 15) {
        clearInterval(t);
        setAttente(false);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [attente, access, offre, refresh]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-5xl">Bonjour {profile?.prenom || ""}</h1>
          <p className="text-ardoise-2">{displayName(user, profile)} — {user?.email}</p>
        </div>
        {isAdmin && <ButtonLink to="/admin" variant="secondary">Administration</ButtonLink>}
      </div>
      {attente && <Notice tone="info" title="Paiement en cours de confirmation">Votre accès s'active automatiquement dans quelques secondes.</Notice>}

      <div className="grid gap-4 md:grid-cols-2">
        <Offre
          titre="Pack Lancement"
          actif={access.dossier}
          texteActif="Acheté — dossier de création et assurance débloqués."
          texteInactif="89 € une fois : dossier INPI complet et dimensionnement de la décennale."
          produit="dossier"
        />
        <Offre
          titre="Abonnement Pro"
          actif={access.pro}
          texteActif={
            access.proCancelAtPeriodEnd && access.proPeriodEnd
              ? `Résilié : accès jusqu'au ${dateFr(access.proPeriodEnd)}.`
              : access.proPeriodEnd
                ? `Actif — prochain renouvellement le ${dateFr(access.proPeriodEnd)}.`
                : "Actif."
          }
          texteInactif="19 € par mois, sans engagement : devis conformes illimités."
          produit="pro"
        />
      </div>

      <section>
        <h2 className="display text-3xl">Mon parcours</h2>
        {!res ? (
          <Spinner />
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Etape titre="Qualification" r={res.qualif} to="/outils/qualification" />
            <Etape titre="Statut juridique" r={res.statut} to="/outils/statut" />
            <Etape titre="Dossier de création" r={res.inpi} to="/outils/inpi" verrou={!access.dossier}>
              {res.inpi && access.dossier && <TelechargerInpi />}
            </Etape>
            <Etape titre="Assurance décennale" r={res.assurance} to="/outils/assurance" verrou={!access.dossier} />
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="display text-3xl">Mes devis</h2>
          <ButtonLink to="/outils/devis">Nouveau devis</ButtonLink>
        </div>
        <Card className="mt-4 overflow-x-auto p-0 sm:p-0">
          {devis === null ? (
            <div className="px-5"><Spinner /></div>
          ) : devis.length === 0 ? (
            <p className="p-5 text-ardoise-2">Aucun devis émis pour l'instant. Chaque devis généré est archivé ici avec son numéro.</p>
          ) : (
            <table className="w-full min-w-[36rem] text-left text-[14.5px]">
              <thead className="border-b border-ardoise/10 text-[13px] text-ardoise-3">
                <tr><th className="px-5 py-3 font-medium">Numéro</th><th className="font-medium">Client</th><th className="font-medium">Date</th><th className="text-right font-medium">TTC</th><th className="px-5" /></tr>
              </thead>
              <tbody className="divide-y divide-ardoise/10">
                {devis.map((d) => (
                  <tr key={d.id}>
                    <td className="px-5 py-3 font-semibold">{d.numero}</td>
                    <td>{d.client_nom}<span className="block text-[13px] text-ardoise-3">{d.intitule}</span></td>
                    <td>{dateFr(d.created_at)}</td>
                    <td className="text-right tabular-nums">{formatEuro(Number(d.total_ttc))}</td>
                    <td className="px-5 text-right"><TelechargerDevis id={d.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <Compte />
    </div>
  );
}

function Offre({ titre, actif, texteActif, texteInactif, produit }: { titre: string; actif: boolean; texteActif: string; texteInactif: string; produit: "dossier" | "pro" }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <Card className={actif ? "ring-2 ring-vert/40" : ""}>
      <p className="text-[13px] font-semibold text-ardoise-3">{actif ? "Actif" : "Non souscrit"}</p>
      <h3 className="display text-3xl">{titre}</h3>
      <p className="mt-1 text-ardoise-2">{actif ? texteActif : texteInactif}</p>
      <div className="mt-4">
        {actif ? (
          produit === "pro" && <Button variant="secondary" loading={busy} onClick={() => run(openBillingPortal)}>Gérer l'abonnement et les factures</Button>
        ) : (
          <Button loading={busy} onClick={() => run(() => startCheckout(produit))}>{produit === "pro" ? "S'abonner" : "Acheter le pack"}</Button>
        )}
        {actif && produit === "dossier" && <Button variant="ghost" loading={busy} onClick={() => run(openBillingPortal)}>Mes factures</Button>}
      </div>
    </Card>
  );
}

function Etape({ titre, r, to, verrou, children }: { titre: string; r: Resume; to: "/outils/qualification" | "/outils/statut" | "/outils/inpi" | "/outils/assurance"; verrou?: boolean; children?: React.ReactNode }) {
  return (
    <Card>
      <h3 className="font-semibold">{titre}</h3>
      <p className="mt-1 text-[14.5px] text-ardoise-2">{r ? `${r.summary} — ${dateFr(r.created_at)}` : verrou ? "Inclus dans le Pack Lancement." : "Pas encore fait."}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={to} className="text-[14.5px] font-semibold text-bleu underline underline-offset-4">{r ? "Refaire ou modifier" : "Commencer"}</Link>
        {children}
      </div>
    </Card>
  );
}

function TelechargerInpi() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="ml-auto inline-flex items-center gap-1 text-[14.5px] font-semibold text-bleu disabled:opacity-50"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadPdf("generate-inpi-pdf", {}, "dossier-creation.pdf");
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download className="h-4 w-4" aria-hidden /> Télécharger le PDF
    </button>
  );
}

function TelechargerDevis({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ghost"
      loading={busy}
      aria-label="Télécharger le devis"
      onClick={async () => {
        setBusy(true);
        try {
          await downloadPdf("generate-devis-pdf", { devis_id: id }, "devis.pdf");
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {!busy && <Download className="h-4 w-4" aria-hidden />}
    </Button>
  );
}

function Compte() {
  const { user, profile, refresh, signOut } = useAuth();
  const [p, setP] = useState({ prenom: "", nom: "", telephone: "" });
  const [email, setEmail] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    setP({ prenom: profile?.prenom ?? "", nom: profile?.nom ?? "", telephone: profile?.telephone ?? "" });
    setEmail(user?.email ?? "");
  }, [profile, user]);

  async function saveProfile() {
    setBusy("profil");
    const { error } = await sb().from("profiles").update(p).eq("user_id", user!.id);
    setBusy(null);
    if (error) toast.error("Enregistrement impossible.");
    else {
      toast.success("Profil enregistré");
      refresh();
    }
  }
  async function saveEmail() {
    setBusy("email");
    const { error } = await sb().auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/espace` });
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Un lien de confirmation a été envoyé à la nouvelle adresse.");
  }
  async function resetPassword() {
    setBusy("pw");
    await sb().auth.resetPasswordForEmail(user!.email!, { redirectTo: `${window.location.origin}/connexion?mode=nouveau` });
    setBusy(null);
    toast.success("Lien de changement de mot de passe envoyé par email.");
  }
  async function supprimer() {
    setBusy("del");
    try {
      await callJson("delete-account", { confirmation: "SUPPRIMER" });
      await signOut();
      toast.success("Compte supprimé.");
      window.location.assign("/");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Suppression impossible.");
      setBusy(null);
    }
  }

  return (
    <section>
      <h2 className="display text-3xl">Mon compte</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="p_pre"><Input id="p_pre" value={p.prenom} onChange={(e) => setP({ ...p, prenom: e.target.value })} /></Field>
            <Field label="Nom" htmlFor="p_nom"><Input id="p_nom" value={p.nom} onChange={(e) => setP({ ...p, nom: e.target.value })} /></Field>
            <Field label="Téléphone" htmlFor="p_tel" className="sm:col-span-2"><Input id="p_tel" type="tel" value={p.telephone} onChange={(e) => setP({ ...p, telephone: e.target.value })} /></Field>
          </div>
          <Button loading={busy === "profil"} onClick={saveProfile}>Enregistrer</Button>
        </Card>
        <Card className="space-y-4">
          <Field label="Adresse email" htmlFor="p_em"><Input id="p_em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={busy === "email"} disabled={email.trim() === user?.email} onClick={saveEmail}>Changer d'email</Button>
            <Button variant="secondary" loading={busy === "pw"} onClick={resetPassword}>Changer de mot de passe</Button>
          </div>
        </Card>
        <Card className="space-y-3 lg:col-span-2">
          <h3 className="font-semibold">Supprimer mon compte</h3>
          <p className="text-[14.5px] text-ardoise-2">
            Efface définitivement votre compte, vos résultats, vos pièces justificatives et vos devis archivés, et résilie l'abonnement.
            Téléchargez d'abord les devis que vous devez conserver pour votre comptabilité.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Tapez SUPPRIMER pour confirmer" htmlFor="del"><Input id="del" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
            <Button variant="danger" disabled={confirm !== "SUPPRIMER"} loading={busy === "del"} onClick={supprimer}>Supprimer définitivement</Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
