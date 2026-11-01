import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, CheckCircle2, Download, FileSignature, FileText, Lock, Plus, Scale, Settings, ShieldCheck } from "lucide-react";
import { Badge, Button, ButtonLink, Card, Container, Field, IconTile, Input, Notice, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
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
    <Container className="py-10 sm:py-14">
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
    <div className="space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f7bff,#1f3fc4)] text-[20px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),var(--shadow-md)]">
            {(profile?.prenom?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
          </span>
          <div>
            <h1 className="display text-[30px] sm:text-[38px]">Bonjour{profile?.prenom ? ` ${profile.prenom}` : ""}</h1>
            <p className="text-[14.5px] text-encre-2">{displayName(user, profile)} · {user?.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && <ButtonLink to="/admin" variant="secondary">Administration</ButtonLink>}
          <ButtonLink to="/outils/devis" variant="encre"><Plus className="h-4 w-4" aria-hidden /> Nouveau devis</ButtonLink>
        </div>
      </div>
      {attente && <Notice tone="info" title="Paiement en cours de confirmation">Votre accès s'active automatiquement dans quelques secondes.</Notice>}

      <div className="grid gap-4 md:grid-cols-2">
        <Offre
          titre="Pack Lancement"
          icon={<FileText aria-hidden />}
          actif={access.dossier}
          texteActif="Acheté : dossier de création et assurance débloqués."
          texteInactif="89 € une fois : fiche de saisie INPI, pièces prêtes à téléverser et dimensionnement de la décennale."
          produit="dossier"
        />
        <Offre
          titre="Abonnement Pro"
          icon={<FileSignature aria-hidden />}
          actif={access.pro}
          texteActif={
            access.proCancelAtPeriodEnd && access.proPeriodEnd
              ? `Résilié : accès jusqu'au ${dateFr(access.proPeriodEnd)}.`
              : access.proPeriodEnd
                ? `Prochain renouvellement le ${dateFr(access.proPeriodEnd)}.`
                : "Devis conformes illimités."
          }
          texteInactif="19 € par mois, sans engagement : devis conformes illimités."
          produit="pro"
        />
      </div>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display text-[24px] sm:text-[28px]">Mon parcours</h2>
            {res && (
              <p className="mt-1 text-[14.5px] text-encre-2">
                {[res.qualif, res.statut, res.inpi, res.assurance].filter(Boolean).length} étape(s) sur 4 terminée(s)
              </p>
            )}
          </div>
          {res && (
            <div className="h-2 w-48 overflow-hidden rounded-full bg-enduit-2" aria-hidden>
              <div
                className="h-full rounded-full bg-gradient-to-r from-bleu to-[#6d4cff] transition-[width] duration-700"
                style={{ width: `${([res.qualif, res.statut, res.inpi, res.assurance].filter(Boolean).length / 4) * 100}%` }}
              />
            </div>
          )}
        </div>
        {!res ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[118px] rounded-2xl" />)}
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Etape titre="Qualification" icon={<BadgeCheck aria-hidden />} r={res.qualif} to="/outils/qualification" />
            <Etape titre="Statut juridique" icon={<Scale aria-hidden />} r={res.statut} to="/outils/statut" />
            <Etape titre="Dossier de création" icon={<FileText aria-hidden />} r={res.inpi} to="/outils/inpi" verrou={!access.dossier}>
              {res.inpi && access.dossier && <TelechargerInpi />}
            </Etape>
            <Etape titre="Assurance décennale" icon={<ShieldCheck aria-hidden />} r={res.assurance} to="/outils/assurance" verrou={!access.dossier} />
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display text-[24px] sm:text-[28px]">Mes devis</h2>
            <p className="mt-1 text-[14.5px] text-encre-2">Chaque devis généré est archivé avec son numéro.</p>
          </div>
          <ButtonLink to="/outils/devis" variant="secondary"><Plus className="h-4 w-4" aria-hidden /> Nouveau devis</ButtonLink>
        </div>
        <Card className="mt-5 overflow-x-auto p-0 sm:p-0">
          {devis === null ? (
            <div className="px-5"><Spinner /></div>
          ) : devis.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <IconTile tone="orange" className="h-12 w-12 rounded-2xl"><FileSignature aria-hidden /></IconTile>
              <p className="mt-4 font-semibold">Aucun devis pour l'instant</p>
              <p className="mt-1 max-w-sm text-[14.5px] text-encre-2">Votre premier devis conforme se prépare en quelques minutes, mentions légales comprises.</p>
              <ButtonLink to="/outils/devis" className="mt-5">Créer mon premier devis</ButtonLink>
            </div>
          ) : (
            <table className="w-full min-w-[36rem] text-left text-[14.5px]">
              <thead className="border-b border-encre/[0.07] bg-enduit/50 text-[12.5px] text-encre-3">
                <tr><th className="px-5 py-3 font-medium">Numéro</th><th className="font-medium">Client</th><th className="font-medium">Date</th><th className="text-right font-medium">TTC</th><th className="px-5" /></tr>
              </thead>
              <tbody className="divide-y divide-encre/[0.05]">
                {devis.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-enduit/40">
                    <td className="px-5 py-3.5"><span className="ref rounded-md bg-enduit px-2 py-1 !text-[12px] !text-encre">{d.numero}</span></td>
                    <td>{d.client_nom}<span className="block text-[13px] text-encre-3">{d.intitule}</span></td>
                    <td className="text-encre-2">{dateFr(d.created_at)}</td>
                    <td className="text-right font-semibold tabular-nums">{formatEuro(Number(d.total_ttc))}</td>
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

function Offre({ titre, icon, actif, texteActif, texteInactif, produit }: { titre: string; icon: React.ReactNode; actif: boolean; texteActif: string; texteInactif: string; produit: "dossier" | "pro" }) {
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
    <div
      className={cn(
        "relative overflow-hidden rounded-[20px] p-6 sm:p-7",
        actif ? "bg-papier shadow-[0_0_0_1px_rgb(15_138_95/0.25),var(--shadow-md)]" : "bg-papier shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-sm)]",
      )}
    >
      {actif && <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(closest-side,rgb(15_138_95/0.12),transparent)]" />}
      <div className="flex items-start justify-between gap-3">
        <IconTile tone={actif ? "vert" : produit === "pro" ? "orange" : "bleu"}>{icon}</IconTile>
        <Badge tone={actif ? "vert" : "neutre"} dot>{actif ? "Actif" : "Non souscrit"}</Badge>
      </div>
      <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">{titre}</h3>
      <p className="mt-1 text-[14.5px] text-encre-2">{actif ? texteActif : texteInactif}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {actif ? (
          <Button variant="secondary" loading={busy} onClick={() => run(openBillingPortal)}>
            <Settings className="h-4 w-4" aria-hidden /> {produit === "pro" ? "Gérer l'abonnement et les factures" : "Mes factures"}
          </Button>
        ) : (
          <Button variant="encre" loading={busy} onClick={() => run(() => startCheckout(produit))}>{produit === "pro" ? "S'abonner" : "Acheter le pack"} <ArrowRight className="h-4 w-4" aria-hidden /></Button>
        )}
      </div>
    </div>
  );
}

function Etape({ titre, icon, r, to, verrou, children }: { titre: string; icon: React.ReactNode; r: Resume; to: "/outils/qualification" | "/outils/statut" | "/outils/inpi" | "/outils/assurance"; verrou?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-papier p-5 shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-xs)]">
      <IconTile tone={r ? "vert" : verrou ? "violet" : "bleu"}>{r ? <CheckCircle2 aria-hidden /> : verrou ? <Lock aria-hidden /> : icon}</IconTile>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{titre}</h3>
        <p className="mt-0.5 text-[14px] text-encre-2">{r ? `${r.summary} · ${dateFr(r.created_at)}` : verrou ? "Inclus dans le Pack Lancement." : "Pas encore fait."}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link to={to} className="inline-flex items-center gap-1 text-[14px] font-semibold text-bleu hover:text-bleu-fonce">
            {r ? "Refaire ou modifier" : "Commencer"} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}

function TelechargerInpi() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="inline-flex items-center gap-1 text-[14px] font-semibold text-encre-2 hover:text-encre disabled:opacity-50"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadPdf("generate-inpi-pdf", {}, "dossier-creation.zip");
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download className="h-4 w-4" aria-hidden /> Télécharger le dossier
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
      <h2 className="display text-[24px] sm:text-[28px]">Mon compte</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
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
        <Card className="space-y-3 shadow-[0_0_0_1px_rgb(209_44_44/0.18),var(--shadow-xs)] lg:col-span-2">
          <h3 className="font-semibold text-rouge">Supprimer mon compte</h3>
          <p className="text-[14.5px] text-encre-2">
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
