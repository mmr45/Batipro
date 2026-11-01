/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { ButtonLink, Container } from "@/components/ui";
import css from "@/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#ffffff" },
    ],
    links: [
      { rel: "stylesheet", href: css },
      { rel: "preload", href: "/fonts/inter-latin-opsz-normal.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-papier focus:px-3 focus:py-2 focus:font-semibold focus:shadow-lg">
            Aller au contenu
          </a>
          <SiteHeader />
          <main id="contenu">
            <Outlet />
          </main>
          <SiteFooter />
          <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)", borderRadius: "14px" } }} />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

export function NotFound() {
  return (
    <div className="relative overflow-hidden border-b border-encre/[0.06] bg-papier">
      <div aria-hidden className="terrain masque-radial pointer-events-none absolute inset-0 bg-transparent" />
      <Container className="relative py-24 text-center sm:py-36">
        <p className="display texte-degrade-clair text-[96px] leading-none sm:text-[140px]">404</p>
        <h1 className="display mx-auto mt-6 max-w-3xl text-[36px] sm:text-[52px]">Cette page n'est pas sur le plan.</h1>
        <p className="mx-auto mt-4 max-w-xl text-[18px] text-encre-2">L'adresse n'existe pas, ou elle a changé lors de la refonte du site.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-2">
          <ButtonLink to="/" variant="encre" size="lg">Retour à l'accueil</ButtonLink>
          <ButtonLink to="/guides" variant="secondary" size="lg">Voir les guides métiers</ButtonLink>
        </div>
      </Container>
    </div>
  );
}
