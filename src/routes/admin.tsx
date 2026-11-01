import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  CreditCard,
  Download,
  FileSignature,
  FileText,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge, Button, Card, Container, IconTile, Notice, Spinner } from "@/components/ui";
import { RequireAuth } from "@/components/layout";
import { seo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { sb } from "@/lib/supabase";
import { cn, dateFr } from "@/lib/utils";
import { formatEuro } from "@rules/reglementation.ts";

export const Route = createFileRoute("/admin")({
  head: () => seo({ title: "Administration", description: "Tableau de bord interne.", path: "/admin", noindex: true }),
  component: Page,
});

/** Prix publics affichés sur /tarifs, utilisés ici pour estimer le chiffre d'affaires. */
const PRIX = { dossier: 89, pro: 19 } as const;

const ETAPES = [
  { type: "qualif", label: "Qualification" },
  { type: "statut", label: "Statut juridique" },
  { type: "inpi", label: "Dossier INPI" },
  { type: "assurance", label: "Décennale" },
  { type: "devis", label: "Devis" },
] as const;
const LIBELLE: Record<string, string> = Object.fromEntries(ETAPES.map((e) => [e.type, e.label]));

interface Compte {
  user_id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  email_confirme: boolean;
  est_admin: boolean;
  dossier: boolean;
  dossier_le: string | null;
  pro: boolean;
  pro_statut: string | null;
  pro_fin: string | null;
  pro_resilie: boolean;
  pro_depuis: string | null;
  stripe_customer: string | null;
  submissions: number;
  devis: number;
  derniere_activite: string | null;
}

interface Soumission {
  user_id: string;
  type: string;
  summary: string | null;
  created_at: string;
}

interface Devis {
  id: string;
  user_id: string;
  numero: string;
  client_nom: string;
  intitule: string;
  total_ttc: number;
  created_at: string;
}

type Filtre = "tous" | "payants" | "dossier" | "pro" | "gratuits" | "inactifs";
const FILTRES: { k: Filtre; label: string }[] = [
  { k: "tous", label: "Tous" },
  { k: "payants", label: "Clients" },
  { k: "dossier", label: "Pack Lancement" },
  { k: "pro", label: "Pro" },
  { k: "gratuits", label: "Gratuits" },
  { k: "inactifs", label: "Inactifs 30 j" },
];

const JOUR = 86_400_000;

function nomDe(c: Compte) {
  return [c.prenom, c.nom].filter(Boolean).join(" ") || c.email.split("@")[0];
}

function depuis(iso: string | null) {
  if (!iso) return "jamais";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const j = Math.floor(s / 86400);
  if (j < 30) return `il y a ${j} j`;
  return dateFr(iso);
}

function heureFr(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------
function Page() {
  return (
    <RequireAuth>
      <Admin />
    </RequireAuth>
  );
}

function Admin() {
  const { isAdmin, ready, user } = useAuth();
  const [comptes, setComptes] = useState<Compte[] | null>(null);
  const [soumissions, setSoumissions] = useState<Soumission[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);
  const [majLe, setMajLe] = useState<Date | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCharge(true);
    setErr(null);
    const client = sb();
    const [o, s, d] = await Promise.all([
      client.rpc("admin_overview"),
      client.from("submissions").select("user_id, type, summary, created_at").order("created_at", { ascending: false }).limit(2000),
      client.from("devis").select("id, user_id, numero, client_nom, intitule, total_ttc, created_at").order("created_at", { ascending: false }).limit(2000),
    ]);
    setCharge(false);
    if (o.error) return setErr(o.error.message);
    setComptes(((o.data ?? []) as Compte[]).map((c) => ({ ...c, submissions: Number(c.submissions), devis: Number(c.devis) })));
    setSoumissions((s.data as Soumission[]) ?? []);
    setDevis((d.data as Devis[]) ?? []);
    setMajLe(new Date());
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  // Échap ferme la fiche
  useEffect(() => {
    if (!ouvert) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(null);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [ouvert]);

  if (!ready) return <Container className="py-14"><Spinner /></Container>;
  if (!isAdmin)
    return (
      <Container className="py-14">
        <Notice tone="error" title="Accès refusé">Ce compte ({user?.email}) n'est pas administrateur.</Notice>
      </Container>
    );

  const compte = comptes?.find((c) => c.user_id === ouvert) ?? null;

  return (
    <div className="min-h-[70vh] bg-enduit pb-20">
      <Entete majLe={majLe} charge={charge} onRefresh={load} comptes={comptes} />
      <Container className="-mt-16 space-y-6">
        {err && <Notice tone="error" title="Chargement impossible">{err}</Notice>}
        {!comptes ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[132px] rounded-2xl" />)}
          </div>
        ) : (
          <>
            <Indicateurs comptes={comptes} devis={devis} />
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <Inscriptions comptes={comptes} />
              <Entonnoir comptes={comptes} soumissions={soumissions} />
            </div>
            <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
              <TableComptes comptes={comptes} onOpen={setOuvert} />
              <Fil comptes={comptes} soumissions={soumissions} devis={devis} onOpen={setOuvert} />
            </div>
          </>
        )}
      </Container>
      {compte && (
        <Fiche
          compte={compte}
          soumissions={soumissions.filter((s) => s.user_id === compte.user_id)}
          devis={devis.filter((d) => d.user_id === compte.user_id)}
          onClose={() => setOuvert(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// En-tête sombre
// ---------------------------------------------------------------------
function Entete({ majLe, charge, onRefresh, comptes }: { majLe: Date | null; charge: boolean; onRefresh: () => void; comptes: Compte[] | null }) {
  return (
    <div className="relative overflow-hidden bg-nuit pb-24 pt-10 text-white sm:pt-14">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/3 h-96 w-[50rem] rounded-full bg-[radial-gradient(closest-side,rgb(47_91_234/0.35),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(255_106_31/0.18),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <Container className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <Badge tone="nuit" dot>Espace interne</Badge>
          <h1 className="display mt-4 text-[34px] text-white sm:text-[46px]">Administration</h1>
          <p className="mt-2 text-[15px] text-white/60">
            Comptes, ventes et activité de Bâtipro. Lecture seule : l'accès est revérifié par la base à chaque chargement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {majLe && <span className="mr-1 text-[13px] text-white/50">Mis à jour à {majLe.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>}
          <Button variant="verre" onClick={onRefresh} disabled={charge}>
            <RefreshCw className={cn("h-4 w-4", charge && "animate-spin")} aria-hidden /> Actualiser
          </Button>
          <Button variant="inverse" onClick={() => comptes && exporterCsv(comptes)} disabled={!comptes}>
            <Download className="h-4 w-4" aria-hidden /> Exporter (CSV)
          </Button>
        </div>
      </Container>
    </div>
  );
}

// ---------------------------------------------------------------------
// Indicateurs
// ---------------------------------------------------------------------
function Indicateurs({ comptes, devis }: { comptes: Compte[]; devis: Devis[] }) {
  const now = Date.now();
  const nouveaux7 = comptes.filter((c) => now - new Date(c.created_at).getTime() < 7 * JOUR).length;
  const packs = comptes.filter((c) => c.dossier).length;
  const pros = comptes.filter((c) => c.pro);
  const resilies = pros.filter((c) => c.pro_resilie).length;
  const payants = comptes.filter((c) => c.dossier || c.pro).length;
  const devis30 = devis.filter((d) => now - new Date(d.created_at).getTime() < 30 * JOUR).length;
  const conversion = comptes.length ? Math.round((payants / comptes.length) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi icon={<Users aria-hidden />} tone="bleu" label="Comptes" valeur={comptes.length} detail={`+${nouveaux7} sur 7 jours · ${conversion} % clients`} />
      <Kpi
        icon={<FileText aria-hidden />}
        tone="orange"
        label="Pack Lancement"
        valeur={packs}
        detail={`≈ ${formatEuro(packs * PRIX.dossier, 0)} encaissés`}
      />
      <Kpi
        icon={<CreditCard aria-hidden />}
        tone="violet"
        label="Abonnés Pro"
        valeur={pros.length}
        detail={`≈ ${formatEuro(pros.length * PRIX.pro, 0)} / mois${resilies ? ` · ${resilies} résiliation(s)` : ""}`}
      />
      <Kpi icon={<FileSignature aria-hidden />} tone="vert" label="Devis émis" valeur={devis.length} detail={`${devis30} sur 30 jours`} />
    </div>
  );
}

function Kpi({ icon, tone, label, valeur, detail }: { icon: ReactNode; tone: "bleu" | "orange" | "vert" | "violet"; label: string; valeur: number; detail: string }) {
  return (
    <Card className="relative overflow-hidden !p-5 shadow-[var(--shadow-lg)]">
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] font-medium text-encre-2">{label}</p>
        <IconTile tone={tone} className="h-9 w-9 rounded-[10px] [&_svg]:h-[18px] [&_svg]:w-[18px]">{icon}</IconTile>
      </div>
      <p className="display mt-3 text-[38px] tabular-nums leading-none">{valeur.toLocaleString("fr-FR")}</p>
      <p className="mt-2 text-[12.5px] text-encre-3">{detail}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Graphique des inscriptions (30 jours)
// ---------------------------------------------------------------------
function Inscriptions({ comptes }: { comptes: Compte[] }) {
  const jours = useMemo(() => {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    const t0 = debut.getTime() - 29 * JOUR;
    const n = Array.from({ length: 30 }, (_, i) => ({ date: new Date(t0 + i * JOUR), inscrits: 0, clients: 0 }));
    for (const c of comptes) {
      const i = Math.floor((new Date(c.created_at).getTime() - t0) / JOUR);
      if (i >= 0 && i < 30) {
        n[i].inscrits++;
        if (c.dossier || c.pro) n[i].clients++;
      }
    }
    return n;
  }, [comptes]);
  const max = Math.max(1, ...jours.map((j) => j.inscrits));
  const total = jours.reduce((s, j) => s + j.inscrits, 0);

  return (
    <Card className="!p-5 sm:!p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-semibold">Inscriptions</h2>
          <p className="text-[13px] text-encre-3">30 derniers jours · {total} compte(s)</p>
        </div>
        <div className="flex gap-3 text-[12.5px] text-encre-2">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bleu" /> Inscrits</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-balise" /> Devenus clients</span>
        </div>
      </div>
      <div className="mt-6 flex h-40 items-end gap-[3px]" role="img" aria-label={`${total} inscriptions sur les 30 derniers jours`}>
        {jours.map((j) => (
          <div key={j.date.getTime()} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className="relative w-full overflow-hidden rounded-t-[4px] bg-gradient-to-t from-bleu to-[#6d8bff] transition-[height] duration-700"
              style={{ height: j.inscrits ? `${(j.inscrits / max) * 100}%` : "3px", opacity: j.inscrits ? 1 : 0.15 }}
            >
              {j.clients > 0 && <div className="absolute inset-x-0 bottom-0 bg-balise" style={{ height: `${(j.clients / j.inscrits) * 100}%` }} />}
            </div>
            <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-encre px-2 py-1 text-[11.5px] text-white group-hover:block">
              {j.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {j.inscrits}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-encre-3">
        <span>{jours[0].date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
        <span>Aujourd'hui</span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Entonnoir du parcours
// ---------------------------------------------------------------------
function Entonnoir({ comptes, soumissions }: { comptes: Compte[]; soumissions: Soumission[] }) {
  const parType = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const s of soumissions) {
      if (!m.has(s.type)) m.set(s.type, new Set());
      m.get(s.type)!.add(s.user_id);
    }
    return m;
  }, [soumissions]);
  const total = Math.max(1, comptes.length);
  const lignes = [
    { label: "Comptes créés", n: comptes.length },
    ...ETAPES.map((e) => ({ label: e.label, n: parType.get(e.type)?.size ?? 0 })),
  ];

  return (
    <Card className="!p-5 sm:!p-6">
      <h2 className="text-[16px] font-semibold">Parcours</h2>
      <p className="text-[13px] text-encre-3">Comptes ayant terminé chaque étape</p>
      <ul className="mt-5 space-y-3">
        {lignes.map((l) => {
          const pct = Math.round((l.n / total) * 100);
          return (
            <li key={l.label}>
              <div className="flex justify-between text-[13.5px]">
                <span className="text-encre-2">{l.label}</span>
                <span className="tabular-nums"><strong className="font-semibold">{l.n}</strong> <span className="text-encre-3">· {pct} %</span></span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-enduit-2">
                <div className="h-full rounded-full bg-gradient-to-r from-bleu to-[#6d4cff] transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------
// Tableau des comptes
// ---------------------------------------------------------------------
function TableComptes({ comptes, onOpen }: { comptes: Compte[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [tri, setTri] = useState<"recent" | "activite" | "nom">("recent");

  const liste = useMemo(() => {
    const now = Date.now();
    const s = q.trim().toLowerCase();
    const r = comptes.filter((c) => {
      if (s && !`${c.email} ${c.prenom ?? ""} ${c.nom ?? ""} ${c.telephone ?? ""}`.toLowerCase().includes(s)) return false;
      switch (filtre) {
        case "payants": return c.dossier || c.pro;
        case "dossier": return c.dossier;
        case "pro": return c.pro;
        case "gratuits": return !c.dossier && !c.pro;
        case "inactifs": return !c.derniere_activite || now - new Date(c.derniere_activite).getTime() > 30 * JOUR;
        default: return true;
      }
    });
    const t = (x: string | null) => (x ? new Date(x).getTime() : 0);
    if (tri === "activite") r.sort((a, b) => t(b.derniere_activite) - t(a.derniere_activite));
    else if (tri === "nom") r.sort((a, b) => nomDe(a).localeCompare(nomDe(b), "fr"));
    return r;
  }, [comptes, q, filtre, tri]);

  return (
    <Card className="overflow-hidden !p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-encre/[0.07] p-4 sm:p-5">
        <h2 className="mr-auto text-[16px] font-semibold">Comptes <span className="font-normal text-encre-3">({liste.length})</span></h2>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Rechercher un compte</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-encre-3" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, email, téléphone…"
            className="h-9 w-full rounded-[10px] bg-enduit pl-9 pr-3 text-[14px] outline-none ring-1 ring-inset ring-encre/10 transition focus:bg-papier focus:ring-2 focus:ring-bleu"
          />
        </label>
        <select
          value={tri}
          onChange={(e) => setTri(e.target.value as typeof tri)}
          aria-label="Trier"
          className="h-9 rounded-[10px] bg-enduit px-3 text-[14px] outline-none ring-1 ring-inset ring-encre/10 focus:ring-2 focus:ring-bleu"
        >
          <option value="recent">Plus récents</option>
          <option value="activite">Dernière activité</option>
          <option value="nom">Nom (A → Z)</option>
        </select>
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-4 pt-3 sm:px-5">
        {FILTRES.map((f) => (
          <button
            key={f.k}
            onClick={() => setFiltre(f.k)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-[13px] font-medium transition-colors",
              filtre === f.k ? "bg-encre text-white" : "text-encre-2 hover:bg-enduit-2",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="mt-2 w-full min-w-[46rem] text-left text-[14px]">
          <thead className="border-y border-encre/[0.07] bg-enduit/50 text-[12.5px] text-encre-3">
            <tr>
              <th className="px-5 py-2.5 font-medium">Compte</th>
              <th className="font-medium">Offres</th>
              <th className="font-medium">Parcours</th>
              <th className="font-medium">Inscrit</th>
              <th className="px-5 font-medium">Activité</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-encre/[0.05]">
            {liste.map((c) => (
              <tr key={c.user_id} onClick={() => onOpen(c.user_id)} className="cursor-pointer transition-colors hover:bg-bleu-pale/40">
                <td className="px-5 py-3">
                  <button className="flex items-center gap-3 text-left" onClick={(e) => { e.stopPropagation(); onOpen(c.user_id); }}>
                    <Avatar c={c} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-medium">
                        {nomDe(c)}
                        {c.est_admin && <ShieldCheck className="h-3.5 w-3.5 text-bleu" aria-label="Administrateur" />}
                      </span>
                      <span className="block max-w-[16rem] truncate text-[13px] text-encre-3">{c.email}</span>
                    </span>
                  </button>
                </td>
                <td><Offres c={c} /></td>
                <td className="tabular-nums text-encre-2">{c.submissions} étape(s) · {c.devis} devis</td>
                <td className="text-encre-2">{dateFr(c.created_at)}</td>
                <td className="px-5 text-encre-2">{depuis(c.derniere_activite)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {liste.length === 0 && <p className="px-5 py-12 text-center text-[14px] text-encre-3">Aucun compte ne correspond.</p>}
      </div>
    </Card>
  );
}

function Avatar({ c, grand }: { c: Compte; grand?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]",
        grand ? "h-14 w-14 text-[20px]" : "h-9 w-9 text-[14px]",
        c.pro ? "bg-[linear-gradient(135deg,#8b6cff,#5b3fd9)]" : c.dossier ? "bg-[linear-gradient(135deg,#ff8a4c,#e2560f)]" : "bg-[linear-gradient(135deg,#4f7bff,#1f3fc4)]",
      )}
    >
      {nomDe(c)[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function Offres({ c }: { c: Compte }) {
  if (!c.dossier && !c.pro) return <span className="text-[13px] text-encre-3">Gratuit</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {c.dossier && <Badge tone="orange">Pack</Badge>}
      {c.pro && <Badge tone={c.pro_resilie ? "neutre" : "bleu"}>{c.pro_resilie ? "Pro (résilié)" : "Pro"}</Badge>}
    </span>
  );
}

// ---------------------------------------------------------------------
// Fil d'activité
// ---------------------------------------------------------------------
type Evenement = { date: string; user_id: string; texte: string; icon: ReactNode; tone: "bleu" | "orange" | "vert" | "violet" };

function Fil({ comptes, soumissions, devis, onOpen }: { comptes: Compte[]; soumissions: Soumission[]; devis: Devis[]; onOpen: (id: string) => void }) {
  const evts = useMemo(() => {
    const nom = new Map(comptes.map((c) => [c.user_id, nomDe(c)]));
    const e: Evenement[] = [];
    for (const c of comptes) {
      e.push({ date: c.created_at, user_id: c.user_id, texte: "a créé son compte", icon: <UserPlus aria-hidden />, tone: "bleu" });
      if (c.dossier && c.dossier_le) e.push({ date: c.dossier_le, user_id: c.user_id, texte: "a acheté le Pack Lancement", icon: <FileText aria-hidden />, tone: "orange" });
      if (c.pro && c.pro_depuis) e.push({ date: c.pro_depuis, user_id: c.user_id, texte: "s'est abonné à Pro", icon: <CreditCard aria-hidden />, tone: "violet" });
    }
    for (const s of soumissions)
      if (s.type !== "devis") e.push({ date: s.created_at, user_id: s.user_id, texte: `a terminé « ${LIBELLE[s.type] ?? s.type} »`, icon: <Activity aria-hidden />, tone: "vert" });
    for (const d of devis)
      e.push({ date: d.created_at, user_id: d.user_id, texte: `a émis le devis ${d.numero} (${formatEuro(Number(d.total_ttc), 0)})`, icon: <FileSignature aria-hidden />, tone: "vert" });
    return e
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 25)
      .map((x) => ({ ...x, nom: nom.get(x.user_id) ?? "Compte supprimé" }));
  }, [comptes, soumissions, devis]);

  return (
    <Card className="!p-5 sm:!p-6 max-h-[32rem] overflow-y-auto xl:max-h-[46rem]">
      <h2 className="text-[16px] font-semibold">Activité récente</h2>
      {evts.length === 0 ? (
        <p className="mt-4 text-[14px] text-encre-3">Rien pour l'instant.</p>
      ) : (
        <ol className="relative mt-5 space-y-4 before:absolute before:bottom-2 before:left-[17px] before:top-2 before:w-px before:bg-encre/10">
          {evts.map((x, i) => (
            <li key={i} className="relative flex gap-3">
              <IconTile tone={x.tone} className="relative h-9 w-9 rounded-full bg-clip-padding [&_svg]:h-4 [&_svg]:w-4">{x.icon}</IconTile>
              <div className="min-w-0 pt-0.5 text-[13.5px]">
                <button onClick={() => onOpen(x.user_id)} className="font-semibold hover:text-bleu">{x.nom}</button>{" "}
                <span className="text-encre-2">{x.texte}</span>
                <p className="text-[12px] text-encre-3">{heureFr(x.date)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------
// Fiche d'un compte (panneau latéral)
// ---------------------------------------------------------------------
function Fiche({ compte: c, soumissions, devis, onClose }: { compte: Compte; soumissions: Soumission[]; devis: Devis[]; onClose: () => void }) {
  const derniere = new Map<string, Soumission>();
  for (const s of soumissions) if (!derniere.has(s.type)) derniere.set(s.type, s);
  const totalDevis = devis.reduce((s, d) => s + Number(d.total_ttc), 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Fiche de ${nomDe(c)}`}>
      <button aria-label="Fermer" className="absolute inset-0 bg-nuit/40 backdrop-blur-[2px] animate-[fade-up_200ms_ease-out_both]" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[30rem] flex-col overflow-y-auto bg-papier shadow-[var(--shadow-xl)] animate-[panneau_260ms_cubic-bezier(0.16,1,0.3,1)_both]">
        <style>{`@keyframes panneau{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}`}</style>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-encre/[0.07] bg-papier/90 px-6 py-3 backdrop-blur">
          <p className="text-[13px] font-medium text-encre-3">Fiche compte</p>
          <button onClick={onClose} className="rounded-md p-1.5 text-encre-2 hover:bg-enduit-2" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-7 p-6">
          <div className="flex items-center gap-4">
            <Avatar c={c} grand />
            <div className="min-w-0">
              <h2 className="display flex items-center gap-2 text-[24px]">
                {nomDe(c)}
                {c.est_admin && <Badge tone="bleu">Admin</Badge>}
              </h2>
              <p className="truncate text-[14px] text-encre-2">{c.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${c.email}`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-enduit px-3 text-[13.5px] font-medium hover:bg-enduit-2"><Mail className="h-4 w-4" aria-hidden /> Écrire</a>
            {c.telephone && <a href={`tel:${c.telephone}`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-enduit px-3 text-[13.5px] font-medium hover:bg-enduit-2"><Phone className="h-4 w-4" aria-hidden /> {c.telephone}</a>}
            {c.stripe_customer && (
              <a href={`https://dashboard.stripe.com/customers/${encodeURIComponent(c.stripe_customer)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-enduit px-3 text-[13.5px] font-medium hover:bg-enduit-2">
                <CreditCard className="h-4 w-4" aria-hidden /> Voir dans Stripe <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-enduit p-4 text-[13.5px]">
            <Info k="Inscrit le" v={dateFr(c.created_at)} />
            <Info k="Dernière connexion" v={depuis(c.last_sign_in_at)} />
            <Info k="Connexion par" v={c.provider === "google" ? "Google" : "Email"} />
            <Info k="Email confirmé" v={c.email_confirme ? "Oui" : "Non"} />
          </dl>

          <section>
            <h3 className="text-[14px] font-semibold">Offres</h3>
            <div className="mt-3 space-y-2">
              <LigneOffre titre="Pack Lancement" actif={c.dossier} detail={c.dossier && c.dossier_le ? `Acheté le ${dateFr(c.dossier_le)}` : "Non acheté"} />
              <LigneOffre
                titre="Abonnement Pro"
                actif={c.pro}
                detail={
                  !c.pro
                    ? c.pro_statut ? `Inactif (${c.pro_statut})` : "Non abonné"
                    : c.pro_resilie && c.pro_fin ? `Résilié, accès jusqu'au ${dateFr(c.pro_fin)}`
                    : c.pro_fin ? `Renouvellement le ${dateFr(c.pro_fin)}`
                    : "Actif"
                }
              />
            </div>
          </section>

          <section>
            <h3 className="text-[14px] font-semibold">Parcours</h3>
            <ul className="mt-3 divide-y divide-encre/[0.06] rounded-xl ring-1 ring-inset ring-encre/[0.08]">
              {ETAPES.filter((e) => e.type !== "devis").map((e) => {
                const s = derniere.get(e.type);
                return (
                  <li key={e.type} className="flex gap-3 px-4 py-3 text-[13.5px]">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", s ? "bg-vert" : "bg-encre/15")} aria-hidden />
                    <div className="min-w-0">
                      <p className="font-medium">{e.label}</p>
                      <p className="text-encre-2">{s ? s.summary || "Terminé" : "Pas encore fait"}</p>
                      {s && <p className="text-[12px] text-encre-3">{heureFr(s.created_at)}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <h3 className="text-[14px] font-semibold">Devis ({devis.length})</h3>
              {devis.length > 0 && <span className="text-[13px] text-encre-3">{formatEuro(totalDevis, 0)} TTC au total</span>}
            </div>
            {devis.length === 0 ? (
              <p className="mt-2 text-[13.5px] text-encre-3">Aucun devis émis.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {devis.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg bg-enduit px-3 py-2.5 text-[13.5px]">
                    <div className="min-w-0">
                      <span className="ref !text-[12px] !text-encre">{d.numero}</span>
                      <p className="truncate text-encre-2">{d.client_nom}{d.intitule && ` · ${d.intitule}`}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatEuro(Number(d.total_ttc), 0)}</p>
                      <p className="text-[12px] text-encre-3">{dateFr(d.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="ref !text-[11px] !text-encre-3">ID {c.user_id}</p>
        </div>
      </aside>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[12px] text-encre-3">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function LigneOffre({ titre, actif, detail }: { titre: string; actif: boolean; detail: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl px-4 py-3 ring-1 ring-inset", actif ? "bg-vert-pale/60 ring-vert/15" : "ring-encre/[0.08]")}>
      <div>
        <p className="text-[14px] font-medium">{titre}</p>
        <p className="text-[13px] text-encre-2">{detail}</p>
      </div>
      <Badge tone={actif ? "vert" : "neutre"} dot>{actif ? "Actif" : "Inactif"}</Badge>
    </div>
  );
}

// ---------------------------------------------------------------------
// Export CSV (ouvrable dans Excel : séparateur « ; » et BOM UTF-8)
// ---------------------------------------------------------------------
function exporterCsv(comptes: Compte[]) {
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // évite l'injection de formules dans Excel
    return `"${s.replace(/"/g, '""')}"`;
  };
  const entete = ["Prénom", "Nom", "Email", "Téléphone", "Inscrit le", "Dernière connexion", "Connexion", "Pack Lancement", "Pro", "Pro résilié", "Étapes", "Devis"];
  const lignes = comptes.map((c) => [
    c.prenom, c.nom, c.email, c.telephone,
    c.created_at.slice(0, 10), c.last_sign_in_at?.slice(0, 10), c.provider,
    c.dossier ? "oui" : "non", c.pro ? "oui" : "non", c.pro_resilie ? "oui" : "non",
    c.submissions, c.devis,
  ]);
  const csv = "﻿" + [entete, ...lignes].map((l) => l.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `batipro-comptes-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
