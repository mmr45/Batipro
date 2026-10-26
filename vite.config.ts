import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Site 100 % statique : les pages publiques sont pré-rendues en HTML au build
// (SEO), les pages connectées tournent en SPA. Tout le backend vit dans
// Supabase (Auth, Postgres + RLS, Edge Functions) : aucun serveur Node à héberger.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart({
      prerender: { enabled: true, crawlLinks: true, autoSubfolderIndex: true },
      // Pages réservées aux comptes connectés : pré-rendues en coquille, puis hydratées.
      pages: [
        { path: "/espace" },
        { path: "/admin" },
        { path: "/connexion" },
        { path: "/404", prerender: { outputPath: "/404.html" } },
      ],
    }),
    viteReact(),
    tailwindcss(),
  ],
});
