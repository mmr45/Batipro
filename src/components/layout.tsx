import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, LogOut, Menu, User, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, ButtonLink, Cartouche, Container, Spinner, btn, revision } from "./ui";
import { CONTACT_EMAIL, cn } from "@/lib/utils";
import { startCheckout } from "@/lib/api";
import { toast } from "sonner";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="3" fill="#1d5fa3" />
      <path d="M16 6 6 14.5V26h10z" fill="#e4edf7" />
      <path d="M16 6l10 8.5V26H16z" fill="#ef6418" />
      <rect x="13.5" y="19" width="5" height="7" rx="0.5" fill="#0e2c4c" />
    </svg>
  );
}

export function Logo({ inverse }: { inverse?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Bâtipro, accueil">
      <LogoMark className="h-8 w-8" />
      <span className={cn("display text-[23px] leading-none", inverse && "text-white")}>
        Bâti<span className={inverse ? "text-[#8fbcf0]" : "text-bleu"}>pro</span>
      </span>
    </Link>
  );
}

const NAV = [
  { to: "/outils/qualification", label: "Qualification" },
  { to: "/outils/statut", label: "Statut" },
  { to: "/outils/devis", label: "Devis" },
  { to: "/guides", label: "Guides métiers" },
  { to: "/tarifs", label: "Tarifs" },
] as const;

export function SiteHeader() {
  const { user, ready, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-encre/10 bg-papier/95 backdrop-blur-sm supports-[backdrop-filter]:bg-papier/85">
      <Container className="flex h-[68px] items-center justify-between gap-6">
        <Logo />
        <nav className="hidden h-full items-stretch lg:flex" aria-label="Navigation principale">
          {NAV.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center px-3.5 text-[15px] font-medium text-encre-2 transition-colors hover:text-encre",
                  active && "text-encre after:absolute after:inset-x-3.5 after:bottom-0 after:h-[3px] after:bg-balise",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {ready && user ? (
            <>
              <ButtonLink to="/espace" variant="secondary">
                <User className="h-4 w-4" aria-hidden /> Mon espace
              </ButtonLink>
              <Button variant="ghost" onClick={() => signOut()} aria-label="Se déconnecter" title="Se déconnecter">
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </>
          ) : (
            <>
              <Link to="/connexion" className="px-3 py-2 text-[15px] font-semibold text-encre hover:text-bleu">
                Se connecter
              </Link>
              <ButtonLink to="/outils/qualification" variant="encre">Tester ma qualification</ButtonLink>
            </>
          )}
        </div>
        <button className="-mr-2 p-2 lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="menu-mobile" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}>
          {open ? <X /> : <Menu />}
        </button>
      </Container>
      {open && (
        <div id="menu-mobile" className="border-t border-encre/10 bg-papier lg:hidden">
          <Container className="flex flex-col py-2">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="border-b border-encre/5 py-3.5 text-[17px] font-semibold">
                {n.label}
              </Link>
            ))}
            <div className="flex gap-2 py-4">
              {user ? (
                <>
                  <ButtonLink to="/espace" onClick={() => setOpen(false)} className="flex-1">
                    Mon espace
                  </ButtonLink>
                  <Button variant="secondary" onClick={() => signOut()}>
                    Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <ButtonLink to="/connexion" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
                    Se connecter
                  </ButtonLink>
                  <Link to="/connexion" search={{ mode: "inscription" }} onClick={() => setOpen(false)} className={btn("encre", "flex-1")}>
                    Créer un compte
                  </Link>
                </>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  );
}

/** Pied de page dessiné comme le cartouche d'un plan. */
export function SiteFooter() {
  const cell = "border-white/12 p-5 sm:p-6";
  return (
    <footer className="mt-24 bg-encre text-white/75 [--cote-bg:var(--color-encre)]">
      <Container className="py-12">
        <div className="grid border border-white/15 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div className={cn(cell, "border-b lg:border-b-0 lg:border-r")}>
            <Logo inverse />
            <p className="mt-4 max-w-xs text-[14.5px] leading-relaxed">
              Créer son entreprise du bâtiment et faire des devis conformes, sans y passer ses soirées.
            </p>
          </div>
          <FooterCol title="Outils" className={cn(cell, "border-b sm:border-r lg:border-b-0")}>
            <Link to="/outils/qualification">Test de qualification</Link>
            <Link to="/outils/statut">Simulateur de statut</Link>
            <Link to="/outils/inpi">Dossier de création</Link>
            <Link to="/outils/assurance">Assurance décennale</Link>
            <Link to="/outils/devis">Éditeur de devis</Link>
          </FooterCol>
          <FooterCol title="Ressources" className={cn(cell, "border-b lg:border-b-0 lg:border-r")}>
            <Link to="/guides">Guides par métier</Link>
            <Link to="/reglementation">Règles en vigueur</Link>
            <Link to="/tarifs">Tarifs</Link>
            <a href={`mailto:${CONTACT_EMAIL}`}>Nous écrire</a>
          </FooterCol>
          <FooterCol title="Légal" className={cell}>
            <Link to="/legal/$page" params={{ page: "mentions-legales" }}>Mentions légales</Link>
            <Link to="/legal/$page" params={{ page: "cgv" }}>Conditions générales</Link>
            <Link to="/legal/$page" params={{ page: "confidentialite" }}>Confidentialité</Link>
          </FooterCol>
        </div>
        <Cartouche
          dark
          className="border-t-0 max-sm:grid-flow-row max-sm:grid-cols-2 max-sm:divide-x-0 max-sm:[&>div]:border-b max-sm:[&>div]:border-white/15"
          cells={[
            ["Projet", "Bâtipro"],
            ["Conçu par", "O. Fauconnier, apprenti peintre"],
            ["Lieu", "Orléans, Loiret"],
            ["Règles vérifiées le", revision()],
          ]}
        />
        <p className="mt-6 max-w-3xl text-[13px] leading-relaxed text-white/50">
          Bâtipro fournit des informations et des outils. Il ne remplace ni un expert-comptable, ni un avocat, ni la Chambre de
          Métiers et de l'Artisanat.
        </p>
      </Container>
    </footer>
  );
}

function FooterCol({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[13px] text-white/45">{title}</p>
      <div className="mt-3 flex flex-col gap-2 text-[15px] text-white [&_a:hover]:text-[#8fbcf0] [&_a]:w-fit">{children}</div>
    </div>
  );
}

/** Bandeau rubalise : signale une zone fermée (connexion ou offre requise). */
function Rubalise() {
  return (
    <div
      aria-hidden
      className="h-2 w-full"
      style={{ background: "repeating-linear-gradient(-45deg, var(--color-balise) 0 12px, #fff 12px 24px)" }}
    />
  );
}

/** Réserve un contenu aux comptes connectés (côté interface ; le serveur revérifie). */
export function RequireAuth({ children, message }: { children: ReactNode; message?: string }) {
  const { ready, user } = useAuth();
  const here = typeof window !== "undefined" ? window.location.pathname : "/";
  if (!ready) return <Spinner />;
  if (!user)
    return (
      <div className="feuille mx-auto max-w-xl overflow-hidden">
        <Rubalise />
        <div className="p-6 sm:p-8">
          <Lock className="h-6 w-6 text-encre" aria-hidden />
          <h2 className="display mt-4 text-[30px]">Connectez-vous pour continuer</h2>
          <p className="mt-2 text-encre-2">{message ?? "Vos résultats et vos documents sont rattachés à votre compte : vous les retrouvez sur tous vos appareils."}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/connexion" search={{ mode: "inscription", redirect: here }} className={btn("encre")}>
              Créer un compte gratuit
            </Link>
            <Link to="/connexion" search={{ redirect: here }} className={btn("secondary")}>
              J'ai déjà un compte
            </Link>
          </div>
        </div>
      </div>
    );
  return <>{children}</>;
}

const OFFRES = {
  dossier: { titre: "Pack Lancement", prix: "89 €", rythme: "une seule fois", cta: "Acheter le Pack Lancement" },
  pro: { titre: "Abonnement Pro", prix: "19 €", rythme: "par mois, sans engagement", cta: "Activer l'abonnement Pro" },
} as const;

/** Affiche le contenu si le droit est actif, sinon l'offre correspondante. */
export function Paywall({ product, children, description }: { product: "dossier" | "pro"; children: ReactNode; description: string }) {
  const { access, ready } = useAuth();
  const [loading, setLoading] = useState(false);
  if (!ready) return <Spinner />;
  if (access[product]) return <>{children}</>;
  const o = OFFRES[product];
  return (
    <div className="feuille mx-auto max-w-xl overflow-hidden">
      <Rubalise />
      <div className="p-6 sm:p-8">
        <p className="text-[14px] font-medium text-encre-3">Inclus dans l'offre</p>
        <h2 className="display mt-1 text-[34px]">{o.titre}</h2>
        <p className="mt-3 text-encre-2">{description}</p>
        <p className="mt-6 flex items-baseline gap-2">
          <span className="display text-[44px]">{o.prix}</span>
          <span className="text-encre-2">{o.rythme}</span>
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="encre"
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
          <ButtonLink to="/tarifs" variant="secondary">
            Comparer les offres
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
