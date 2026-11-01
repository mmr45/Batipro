import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  FileSignature,
  FileText,
  Lock,
  LogOut,
  Menu,
  Scale,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, ButtonLink, Container, IconTile, Spinner, btn, revision } from "./ui";
import { CONTACT_EMAIL, cn } from "@/lib/utils";
import { startCheckout } from "@/lib/api";
import { toast } from "sonner";

// ---------------------------------------------------------------------
// Marque
// ---------------------------------------------------------------------
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="bp-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f7bff" />
          <stop offset="1" stopColor="#1f3fc4" />
        </linearGradient>
        <linearGradient id="bp-h" x1="16" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8.5" fill="url(#bp-g)" />
      <rect x=".5" y=".5" width="31" height="31" rx="8" fill="url(#bp-h)" stroke="#fff" strokeOpacity=".14" />
      <path d="M8.2 15.6 16 9.2l7.8 6.4" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 15.4v7.4h10v-7.4" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14.2" y="18.2" width="3.6" height="4.6" rx="1" fill="#ff6a1f" />
    </svg>
  );
}

export function Logo({ inverse }: { inverse?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5 rounded-lg" aria-label="Bâtipro, accueil">
      <LogoMark className="h-8 w-8 transition-transform duration-300 group-hover:-rotate-6" />
      <span className={cn("text-[19px] font-[680] leading-none tracking-[-0.04em]", inverse ? "text-white" : "text-encre")}>Bâtipro</span>
    </Link>
  );
}

// ---------------------------------------------------------------------
// En-tête
// ---------------------------------------------------------------------
export const OUTILS = [
  { to: "/outils/qualification", label: "Test de qualification", desc: "Savoir si la CMA validera votre métier", Icon: BadgeCheck, offre: "Gratuit" },
  { to: "/outils/statut", label: "Simulateur de statut", desc: "Micro, EI ou SASU : cotisations et net", Icon: Scale, offre: "Gratuit" },
  { to: "/outils/inpi", label: "Dossier de création", desc: "Vos réponses au Guichet unique INPI, prêtes à reporter", Icon: FileText, offre: "Lancement" },
  { to: "/outils/assurance", label: "Assurance décennale", desc: "Plafonds et budget avant d'appeler", Icon: ShieldCheck, offre: "Lancement" },
  { to: "/outils/devis", label: "Éditeur de devis", desc: "Mentions légales générées selon le chantier", Icon: FileSignature, offre: "Pro" },
] as const;

const NAV = [
  { to: "/guides", label: "Guides métiers" },
  { to: "/reglementation", label: "Règles 2026" },
  { to: "/tarifs", label: "Tarifs" },
] as const;

function MenuOutils({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actif = path.startsWith("/outils");

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const enter = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const leave = () => {
    timer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="menu-outils"
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-2 text-[14.5px] font-medium transition-colors hover:bg-encre/[0.04] hover:text-encre",
          actif || open ? "text-encre" : "text-encre-2",
        )}
      >
        Outils
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-60 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <div
        id="menu-outils"
        className={cn(
          "absolute left-1/2 top-full z-50 w-[36rem] -translate-x-1/2 pt-3 transition-[opacity,transform] duration-200",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="overflow-hidden rounded-2xl bg-papier shadow-[0_0_0_1px_rgb(11_18_32/0.08),var(--shadow-xl)]">
          <div className="grid grid-cols-2 gap-1 p-2">
            {OUTILS.map((o) => (
              <Link key={o.to} to={o.to} className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-enduit">
                <IconTile tone={o.offre === "Gratuit" ? "vert" : o.offre === "Pro" ? "orange" : "bleu"}>
                  <o.Icon aria-hidden />
                </IconTile>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-encre">{o.label}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-encre-3">{o.desc}</span>
                </span>
              </Link>
            ))}
            <Link to="/tarifs" className="flex flex-col justify-center rounded-xl bg-[linear-gradient(135deg,var(--color-bleu-pale),#fff4ec)] p-3">
              <span className="text-[13px] font-semibold text-encre">Qualification et statut gratuits</span>
              <span className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-bleu">
                Voir les offres <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { user, ready, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "entete-site sticky top-0 z-40 transition-[background-color,box-shadow] duration-200",
        scrolled || open
          ? "bg-papier/80 shadow-[0_1px_0_rgb(11_18_32/0.07)] backdrop-blur-xl backdrop-saturate-150"
          : "bg-papier shadow-[0_1px_0_rgb(11_18_32/0.05)]",
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navigation principale">
            <MenuOutils path={path} />
            {NAV.map((n) => {
              const active = path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[14.5px] font-medium transition-colors hover:bg-encre/[0.04] hover:text-encre",
                    active ? "text-encre" : "text-encre-2",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {ready && user ? (
            <>
              <ButtonLink to="/espace" variant="secondary" size="sm" className="h-9 px-3.5">
                <User className="h-4 w-4" aria-hidden /> Mon espace
              </ButtonLink>
              <Button variant="ghost" size="sm" className="h-9 w-9 px-0" onClick={() => signOut()} aria-label="Se déconnecter" title="Se déconnecter">
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </>
          ) : (
            <>
              <Link to="/connexion" className="rounded-lg px-3 py-2 text-[14.5px] font-medium text-encre-2 transition-colors hover:text-encre">
                Se connecter
              </Link>
              <ButtonLink to="/outils/qualification" variant="encre" size="sm" className="h-9 px-4">
                Commencer gratuitement
              </ButtonLink>
            </>
          )}
        </div>
        <button
          className="-mr-2 rounded-lg p-2 text-encre lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </Container>
      {open && (
        <div id="menu-mobile" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-encre/[0.06] bg-papier lg:hidden">
          <Container className="flex flex-col py-3">
            <p className="px-1 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-encre-3">Outils</p>
            {OUTILS.map((o) => (
              <Link key={o.to} to={o.to} className="flex items-center gap-3 rounded-xl px-1 py-2.5">
                <IconTile tone={o.offre === "Gratuit" ? "vert" : o.offre === "Pro" ? "orange" : "bleu"} className="h-9 w-9 [&_svg]:h-[18px] [&_svg]:w-[18px]">
                  <o.Icon aria-hidden />
                </IconTile>
                <span className="text-[15.5px] font-semibold">{o.label}</span>
              </Link>
            ))}
            <div className="my-2 h-px bg-encre/[0.06]" />
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="px-1 py-3 text-[15.5px] font-semibold">
                {n.label}
              </Link>
            ))}
            <div className="flex gap-2 py-4">
              {user ? (
                <>
                  <ButtonLink to="/espace" className="flex-1" size="lg">
                    Mon espace
                  </ButtonLink>
                  <Button variant="secondary" size="lg" onClick={() => signOut()}>
                    Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <ButtonLink to="/connexion" variant="secondary" size="lg" className="flex-1">
                    Se connecter
                  </ButtonLink>
                  <Link to="/connexion" search={{ mode: "inscription" }} className={btn("encre", "flex-1", "lg")}>
                    Créer un compte
                  </Link>
                </>
              )}
            </div>
          </Container>
        </div>
      )}
      <div aria-hidden className="progression" />
    </header>
  );
}

// ---------------------------------------------------------------------
// Pied de page
// ---------------------------------------------------------------------
export function SiteFooter() {
  return (
    <footer className="relative mt-28 overflow-hidden bg-nuit text-white/70">
      <div aria-hidden className="grille-nuit masque-radial pointer-events-none absolute inset-0 opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(47_91_234/0.28),transparent)]"
      />
      <Container className="relative pb-10 pt-16 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo inverse />
            <p className="mt-5 max-w-xs text-[14.5px] leading-relaxed text-white/60">
              Créer son entreprise du bâtiment et faire des devis conformes, sans y passer ses soirées.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12.5px] font-medium text-white/75 ring-1 ring-inset ring-white/10">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3ddc97] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3ddc97]" />
              </span>
              Règles vérifiées le {revision()}
            </p>
          </div>
          <FooterCol title="Outils">
            {OUTILS.map((o) => (
              <Link key={o.to} to={o.to}>
                {o.label}
              </Link>
            ))}
          </FooterCol>
          <FooterCol title="Ressources">
            <Link to="/guides">Guides par métier</Link>
            <Link to="/reglementation">Règles en vigueur</Link>
            <Link to="/tarifs">Tarifs</Link>
            <a href={`mailto:${CONTACT_EMAIL}`}>Nous écrire</a>
          </FooterCol>
          <FooterCol title="Légal">
            <Link to="/legal/$page" params={{ page: "mentions-legales" }}>
              Mentions légales
            </Link>
            <Link to="/legal/$page" params={{ page: "cgv" }}>
              Conditions générales
            </Link>
            <Link to="/legal/$page" params={{ page: "confidentialite" }}>
              Confidentialité
            </Link>
          </FooterCol>
        </div>
        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-[13px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Bâtipro · Conçu à Orléans par un apprenti peintre en bâtiment.</p>
          <p className="max-w-xl sm:text-right">
            Bâtipro fournit des informations et des outils. Il ne remplace ni un expert-comptable, ni un avocat, ni la Chambre de Métiers et de
            l'Artisanat.
          </p>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-white">{title}</p>
      <div className="mt-4 flex flex-col gap-2.5 text-[14.5px] text-white/60 [&_a:hover]:text-white [&_a]:w-fit [&_a]:transition-colors">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Verrous
// ---------------------------------------------------------------------
function Verrou({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="relative mx-auto max-w-xl">
      <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,rgb(47_91_234/0.12),transparent)]" />
      <div className="feuille relative overflow-hidden p-6 sm:p-9">
        <div aria-hidden className="terrain masque-radial pointer-events-none absolute inset-x-0 top-0 h-40 bg-transparent" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-papier text-encre shadow-[0_0_0_1px_rgb(11_18_32/0.08),var(--shadow-md)]">
          {icon}
        </span>
        <div className="relative mt-6">{children}</div>
      </div>
    </div>
  );
}

/** Réserve un contenu aux comptes connectés (côté interface ; le serveur revérifie). */
export function RequireAuth({ children, message }: { children: ReactNode; message?: string }) {
  const { ready, user } = useAuth();
  const here = typeof window !== "undefined" ? window.location.pathname : "/";
  if (!ready) return <Spinner />;
  if (!user)
    return (
      <Verrou icon={<Lock className="h-5 w-5" aria-hidden />}>
        <h2 className="display text-[28px]">Connectez-vous pour continuer</h2>
        <p className="mt-2 text-encre-2">
          {message ?? "Vos résultats et vos documents sont rattachés à votre compte : vous les retrouvez sur tous vos appareils."}
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          <Link to="/connexion" search={{ mode: "inscription", redirect: here }} className={btn("encre", undefined, "lg")}>
            Créer un compte gratuit
          </Link>
          <Link to="/connexion" search={{ redirect: here }} className={btn("secondary", undefined, "lg")}>
            J'ai déjà un compte
          </Link>
        </div>
      </Verrou>
    );
  return <>{children}</>;
}

const OFFRES = {
  dossier: {
    titre: "Pack Lancement",
    prix: "89 €",
    rythme: "une seule fois",
    cta: "Débloquer le Pack Lancement",
    points: ["Fiche de saisie pour le Guichet unique INPI", "Pièces converties en PDF, prêtes à téléverser", "Dimensionnement de la décennale"],
  },
  pro: {
    titre: "Abonnement Pro",
    prix: "19 €",
    rythme: "par mois, sans engagement",
    cta: "Activer l'abonnement Pro",
    points: ["Devis conformes illimités", "Numérotation continue et archive", "Mentions à jour quand la loi change"],
  },
} as const;

/** Affiche le contenu si le droit est actif, sinon l'offre correspondante. */
export function Paywall({ product, children, description }: { product: "dossier" | "pro"; children: ReactNode; description: string }) {
  const { access, ready } = useAuth();
  const [loading, setLoading] = useState(false);
  if (!ready) return <Spinner />;
  if (access[product]) return <>{children}</>;
  const o = OFFRES[product];
  return (
    <Verrou icon={<Sparkles className="h-5 w-5 text-bleu" aria-hidden />}>
      <p className="eyebrow">Inclus dans l'offre</p>
      <h2 className="display mt-2 text-[30px]">{o.titre}</h2>
      <p className="mt-2 text-encre-2">{description}</p>
      <ul className="mt-5 space-y-2">
        {o.points.map((p) => (
          <li key={p} className="flex items-center gap-2.5 text-[15px]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-vert-pale text-vert">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
            </span>
            {p}
          </li>
        ))}
      </ul>
      <p className="mt-7 flex items-baseline gap-2">
        <span className="display text-[44px] tabular-nums">{o.prix}</span>
        <span className="text-encre-2">{o.rythme}</span>
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await startCheckout(product);
            } catch (e) {
              toast.error((e as Error).message);
              setLoading(false);
            }
          }}
        >
          {o.cta}
        </Button>
        <ButtonLink to="/tarifs" variant="secondary" size="lg">
          Comparer les offres
        </ButtonLink>
      </div>
      <p className="mt-5 flex items-center gap-1.5 text-[13px] text-encre-3">
        <Lock className="h-3.5 w-3.5" aria-hidden /> Paiement sécurisé par Stripe · Facture par email
      </p>
    </Verrou>
  );
}

