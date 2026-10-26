import { createFileRoute } from "@tanstack/react-router";
import { NotFound } from "./__root";

// Pré-rendu en /404.html : Vercel le sert pour toute adresse inconnue.
export const Route = createFileRoute("/404")({
  head: () => ({ meta: [{ title: "Page introuvable | Bâtipro" }, { name: "robots", content: "noindex" }] }),
  component: NotFound,
});
