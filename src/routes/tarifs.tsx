import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink, Container, Notice, PageHeader } from "@/components/ui";
import { FaqList, FAQ_ACCUEIL } from "@/components/faq";
import { seo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { startCheckout } from "@/lib/api";
import { useMounted } from "@/lib/utils";

export const Route = createFileRoute("/tarifs")({
  validateSearch: (s: Record<string, unknown>): { paiement?: string } => ({ paiement: typeof s.paiement === "string" ? s.paiement : undefined }),
  head: () =>
    seo({
      title: "Tarifs",
      description: "Test de qualification et simulateur gratuits. Pack Lancement 89 € une fois. Abonnement Pro 19 €/mois sans engagement pour les devis.",
      path: "/tarifs",
    }),
  component: Page,
});

const OFFRES = [
  {
    nom: "Gratuit",
    prix: "0 €",
    rythme: "pour toujours",
    pour: "Savoir où vous en êtes",
    inclus: ["Test de qualification par métier", "Simulateur de statut avec seuils 2026", "Guides métiers complets"],
    plan: null,
  },
  {
    nom: "Pack Lancement",
    prix: "89 €",
    rythme: "une seule fois",
    pour: "Créer l'entreprise",
    inclus: ["Dossier de création pour le Guichet unique INPI", "Stockage sécurisé des pièces justificatives", "Déclaration de non-condamnation pré-remplie", "Dimensionnement décennale et RC Pro", "Facture envoyée par email"],
    plan: "dossier" as const,
  },
  {
    nom: "Pro",
    prix: "19 €",
    rythme: "par mois, sans engagement",
    pour: "Faire tourner l'activité",
    inclus: ["Devis conformes en illimité", "Mentions mises à jour quand la loi change", "Numérotation continue et archive", "Votre logo sur les devis", "Résiliable en un clic"],
    plan: "pro" as const,
  },
];

function Page() {
  const { user, access } = useAuth();
  const navigate = useNavigate();
  const { paiement } = Route.useSearch();
  const [busy, setBusy] = useState<string | null>(null);
  const mounted = useMounted();

  async function acheter(plan: "dossier" | "pro") {
    if (!user) return navigate({ to: "/connexion", search: { mode: "inscription", redirect: "/tarifs" } });
    setBusy(plan);
    try {
      await startCheckout(plan);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Tarifs" intro="Vous payez au moment où l'outil vous fait gagner du temps : à la création, puis à chaque devis." />
      <Container className="py-10">
        {mounted && paiement === "annule" && <Notice tone="warn" className="mb-6">Paiement annulé : aucun montant n'a été débité.</Notice>}
        <div className="grid gap-4 lg:grid-cols-3">
          {OFFRES.map((o) => {
            const actif = o.plan ? access[o.plan] : false;
            return (
              <div key={o.nom} className={`flex flex-col rounded-md bg-papier p-6 ring-1 ${o.plan === "dossier" ? "ring-2 ring-bleu" : "ring-ardoise/10"}`}>
                <p className="text-[14px] font-medium text-ardoise-3">{o.pour}</p>
                <h2 className="display mt-1 text-4xl">{o.nom}</h2>
                <p className="mt-4">
                  <span className="display text-6xl">{o.prix}</span> <span className="text-ardoise-2">{o.rythme}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2">
                  {o.inclus.map((i) => (
                    <li key={i} className="flex gap-2 text-[15px]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-vert" aria-hidden />{i}</li>
                  ))}
                </ul>
                <div className="mt-6">
                  {!o.plan ? (
                    <ButtonLink to="/outils/qualification" variant="secondary" className="w-full">Commencer</ButtonLink>
                  ) : actif ? (
                    <ButtonLink to="/espace" variant="secondary" className="w-full">Déjà actif — mon espace</ButtonLink>
                  ) : (
                    <Button className="w-full" loading={busy === o.plan} onClick={() => acheter(o.plan!)}>
                      {o.plan === "pro" ? "S'abonner" : "Acheter le pack"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-6 max-w-3xl text-[14px] text-ardoise-3">
          Prix finaux, sans frais cachés. Paiement sécurisé par Stripe. Le Pack Lancement et l'abonnement Pro sont indépendants. Pour le Pack Lancement,
          contenu numérique fourni immédiatement : vous renoncez à votre droit de rétractation en validant le paiement.
        </p>
        <h2 className="display mt-16 text-4xl">Questions fréquentes</h2>
        <div className="mt-6 max-w-3xl"><FaqList items={FAQ_ACCUEIL} /></div>
      </Container>
    </>
  );
}
