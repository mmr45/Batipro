import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, LogOut, Menu, User, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, ButtonLink, Card, Container, Spinner, btn } from "./ui";
import { CONTACT_EMAIL, cn } from "@/lib/utils";
import { startCheckout } from "@/lib/api";
import { toast } from "sonner";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#1d5fa3" />
      <path d="M16 6 6 14.5V26h10z" fill="#e6eef8" />
      <path d="M16 6l10 8.5V26H16z" fill="#f26a1b" />
      <rect x="13.5" y="19" width="5" height="7" rx="1" fill="#154a80" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Bâtipro, accueil">
      <LogoMark />
      <span className="display text-[28px] leading-none">
        Bâti<span className="text-bleu">pro</span>
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
    <header className="sticky top-0 z-40 border-b border-ardoise/10 bg-papier/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "rounded-sm px-3 py-2 text-[15px] font-medium text-ardoise-2 hover:text-ardoise",
                path.startsWith(n.to) && "text-ardoise underline decoration-bleu decoration-2 underline-offset-8",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {ready && user ? (
            <>
              <ButtonLink to="/espace" variant="secondary">
                <User className="h-4 w-4" aria-hidden /> Mon espace
              </ButtonLink>
              <Button variant="ghost" onClick={() => signOut()} aria-label="Se déconnecter">
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </>
          ) : (
            <>
              <ButtonLink to="/connexion" variant="ghost">
                Se connecter
              </ButtonLink>
              <ButtonLink to="/outils/qualification">Tester ma qualification</ButtonLink>
            </>
          )}
        </div>
        <button className="rounded-sm p-2 lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </Container>
      {open && (
        <div className="border-t border-ardoise/10 bg-papier lg:hidden">
          <Container className="flex flex-col py-3">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="py-2.5 text-[16px] font-medium">
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 border-t border-ardoise/10 pt-3">
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
                  <Link to="/connexion" search={{ mode: "inscription" }} onClick={() => setOpen(false)} className={btn("primary", "flex-1")}>
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

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-ardoise text-white/80">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="display text-[28px] text-white">
              Bâti<span className="text-[#6fa8e6]">pro</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-[14px]">
            Créer son entreprise du bâtiment et faire des devis conformes, sans y passer ses soirées.
          </p>
        </div>
        <FooterCol title="Outils">
          <Link to="/outils/qualification">Test de qualification</Link>
          <Link to="/outils/statut">Simulateur de statut</Link>
          <Link to="/outils/inpi">Dossier de création</Link>
          <Link to="/outils/assurance">Assurance décennale</Link>
          <Link to="/outils/devis">Éditeur de devis</Link>
        </FooterCol>
        <FooterCol title="Ressources">
          <Link to="/guides">Guides par métier</Link>
          <Link to="/reglementation">Règles en vigueur</Link>
          <Link to="/tarifs">Tarifs</Link>
          <a href={`mailto:${CONTACT_EMAIL}`}>Nous écrire</a>
        </FooterCol>
        <FooterCol title="Légal">
          <Link to="/legal/$page" params={{ page: "mentions-legales" }}>Mentions légales</Link>
          <Link to="/legal/$page" params={{ page: "cgv" }}>Conditions générales</Link>
          <Link to="/legal/$page" params={{ page: "confidentialite" }}>Confidentialité</Link>
        </FooterCol>
      </Container>
      <Container className="border-t border-white/10 py-5 text-[13px] text-white/55">
        Bâtipro fournit des informations et des outils ; il ne remplace ni un expert-comptable, ni un avocat, ni la Chambre de
        Métiers et de l'Artisanat.
      </Container>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-semibold text-white">{title}</p>
      <div className="mt-3 flex flex-col gap-2 text-[14px] [&_a:hover]:text-white">{children}</div>
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
      <Card className="mx-auto max-w-lg text-center">
        <Lock className="mx-auto h-8 w-8 text-bleu" aria-hidden />
        <h2 className="display mt-3 text-3xl">Connectez-vous pour continuer</h2>
        <p className="mt-2 text-ardoise-2">{message ?? "Vos résultats et documents sont rattachés à votre compte."}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/connexion" search={{ redirect: here }} className={btn()}>
            Se connecter
          </Link>
          <Link to="/connexion" search={{ mode: "inscription", redirect: here }} className={btn("secondary")}>
            Créer un compte gratuit
          </Link>
        </div>
      </Card>
    );
  return <>{children}</>;
}

const OFFRES = {
  dossier: { titre: "Inclus dans le Pack Lancement", prix: "89 € une fois", cta: "Acheter le Pack Lancement" },
  pro: { titre: "Inclus dans l'abonnement Pro", prix: "19 € par mois, sans engagement", cta: "Activer l'abonnement Pro" },
} as const;

/** Affiche le contenu si le droit est actif, sinon l'offre correspondante. */
export function Paywall({ product, children, description }: { product: "dossier" | "pro"; children: ReactNode; description: string }) {
  const { access, ready } = useAuth();
  const [loading, setLoading] = useState(false);
  if (!ready) return <Spinner />;
  if (access[product]) return <>{children}</>;
  const o = OFFRES[product];
  return (
    <Card className="mx-auto max-w-xl">
      <Lock className="h-7 w-7 text-bleu" aria-hidden />
      <h2 className="display mt-3 text-3xl">{o.titre}</h2>
      <p className="mt-2 text-ardoise-2">{description}</p>
      <p className="mt-4 font-semibold">{o.prix}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
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
    </Card>
  );
}
