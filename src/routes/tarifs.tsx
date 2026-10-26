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

  const lignes: [string, boolean, boolean, boolean][] = [
    ["Test de qualification par métier", true, true, true],
    ["Simulateur de statut et cotisations 2026", true, true, true],
    ["Guides métiers", true, true, true],
    ["Dossier de création pour le Guichet unique INPI", false, true, false],
    ["Pièces justificatives stockées et jointes au PDF", false, true, false],
    ["Dimensionnement décennale et RC Pro", false, true, false],
    ["Devis conformes en illimité", false, false, true],
    ["Numérotation continue et archive des devis", false, false, true],
    ["Mentions mises à jour quand la loi change", false, false, true],
  ];

  return (
    <>
      <PageHeader
        title="Tarifs"
        rubrique="Bordereau des prix"
        planche="3 offres"
        intro="Vous payez au moment où l'outil vous fait gagner du temps : une fois à la création, puis chaque mois pour vos devis."
      />
      <Container className="py-12">
        {mounted && paiement === "annule" && <Notice tone="warn" className="mb-8">Paiement annulé : aucun montant n'a été débité.</Notice>}
        <div className="grid gap-px border border-encre/15 bg-encre/15 lg:grid-cols-3">
          {OFFRES.map((o, i) => {
            const actif = o.plan ? access[o.plan] : false;
            const fort = o.plan === "dossier";
            return (
              <div key={o.nom} className={`relative flex flex-col bg-papier p-6 sm:p-8 ${fort ? "lg:-my-3 lg:shadow-[0_0_0_3px_var(--color-encre)] lg:z-10" : ""}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="ref !text-[12.5px] !text-balise">Poste {String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[13.5px] text-encre-3">{o.pour}</span>
                </div>
                <h2 className="display mt-4 text-[34px]">{o.nom}</h2>
                <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-y border-encre/10 py-4">
                  <span className="display whitespace-nowrap text-[64px] leading-none">{o.prix}</span>
                  <span className="text-[15px] text-encre-2">{o.rythme}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {o.inclus.map((x) => (
                    <li key={x} className="flex gap-2.5 text-[15.5px] leading-snug">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-vert" strokeWidth={2.5} aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {!o.plan ? (
                    <ButtonLink to="/outils/qualification" variant="secondary" className="w-full">Commencer gratuitement</ButtonLink>
                  ) : actif ? (
                    <ButtonLink to="/espace" variant="secondary" className="w-full">Déjà actif, voir mon espace</ButtonLink>
                  ) : (
                    <Button variant={fort ? "encre" : "primary"} className="w-full" loading={busy === o.plan} onClick={() => acheter(o.plan!)}>
                      {o.plan === "pro" ? "S'abonner au Pro" : "Acheter le Pack Lancement"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-encre-3">
          Prix finaux, sans frais cachés. Paiement sécurisé par Stripe, facture envoyée par email. Le Pack Lancement et l'abonnement Pro
          sont indépendants. Pour le Pack Lancement, le contenu numérique est fourni immédiatement : vous renoncez à votre droit de
          rétractation en validant le paiement.
        </p>

        <h2 className="display mt-20 text-[30px] sm:text-[36px]">Le détail, poste par poste</h2>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-t-2 border-encre text-left text-[15px]">
            <thead>
              <tr className="border-b border-encre/15 text-[13.5px] text-encre-3">
                <th scope="col" className="py-3 pr-4 font-medium">Désignation</th>
                <th scope="col" className="w-32 py-3 text-center font-medium">Gratuit</th>
                <th scope="col" className="w-32 py-3 text-center font-medium">Lancement</th>
                <th scope="col" className="w-32 py-3 text-center font-medium">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-encre/10">
              {lignes.map(([k, ...v]) => (
                <tr key={k}>
                  <th scope="row" className="py-3 pr-4 font-medium">{k}</th>
                  {v.map((on, j) => (
                    <td key={j} className="py-3 text-center">
                      {on ? <Check className="mx-auto h-4 w-4 text-vert" strokeWidth={2.75} aria-label="Inclus" /> : <span className="text-encre-3" aria-label="Non inclus">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <h2 className="display text-[30px] sm:text-[36px]">Questions fréquentes</h2>
          <FaqList items={FAQ_ACCUEIL} />
        </div>
      </Container>
    </>
  );
}
