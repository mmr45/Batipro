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
      { rel: "preload", href: "/fonts/archivo-latin-wdth-normal.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
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
          <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-papier focus:px-3 focus:py-2 focus:font-semibold">
            Aller au contenu
          </a>
          <SiteHeader />
          <main id="contenu">
            <Outlet />
          </main>
          <SiteFooter />
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}

export function NotFound() {
  return (
    <div className="terrain border-b border-encre/10">
      <Container className="py-24 sm:py-32">
        <p className="ref !text-[13px] !text-balise">Erreur 404</p>
        <h1 className="display mt-3 max-w-3xl text-[48px] sm:text-[72px]">Cette page n'est pas sur le plan.</h1>
        <p className="mt-5 max-w-xl text-[18px] text-encre-2">L'adresse n'existe pas, ou elle a changé lors de la refonte du site.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <ButtonLink to="/" variant="encre">Retour à l'accueil</ButtonLink>
          <ButtonLink to="/guides" variant="secondary">Voir les guides métiers</ButtonLink>
        </div>
      </Container>
    </div>
  );
}
