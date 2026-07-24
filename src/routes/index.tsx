import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

// La page d'accueil complète (hero, simulateur, générateur de devis, etc.)
// est un fichier autonome (public/batipro.html) qui gère déjà son propre
// <head>, ses styles et ses scripts (Supabase, jsPDF...). On l'affiche ici
// en iframe plein écran pour ne rien casser dans son fonctionnement existant.
function HomePage() {
  return (
    <iframe
      src="/batipro.html"
      title="Bâtipro"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  );
}
