/// <reference types="vite/client" />
import { HeadContent, Outlet, Scripts, createRootRoute, Link } from "@tanstack/react-router";
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
      { name: "theme-color", content: "#1d5fa3" },
    ],
    links: [
      { rel: "stylesheet", href: css },
      { rel: "preload", href: "/fonts/big-shoulders-display-latin-800-normal.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "preload", href: "/fonts/inter-latin-400-normal.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" },
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
          <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-papier focus:p-2">
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
    <Container className="py-24">
      <h1 className="display text-6xl">Page introuvable</h1>
      <p className="mt-3 text-ardoise-2">Cette adresse n'existe pas ou a été déplacée lors de la refonte du site.</p>
      <div className="mt-6 flex gap-2">
        <ButtonLink to="/">Retour à l'accueil</ButtonLink>
        <Link to="/guides" className="px-4 py-2.5 font-semibold text-bleu">
          Voir les guides métiers
        </Link>
      </div>
    </Container>
  );
}
