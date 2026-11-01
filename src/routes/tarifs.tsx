import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Lock, Minus, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink, Container, Notice, PageHeader, SectionHead } from "@/components/ui";
import { CONTACT_EMAIL, cn } from "@/lib/utils";
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
    inclus: ["Fiche de saisie dans l'ordre du Guichet unique INPI", "Pièces converties en PDF, une par case à téléverser", "Déclaration de non-condamnation et de filiation pré-remplie", "Dimensionnement décennale et RC Pro", "Facture envoyée par email"],
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
    ["Fiche de saisie pour le Guichet unique INPI", false, true, false],
    ["Pièces converties en PDF, prêtes à téléverser", false, true, false],
    ["Dimensionnement décennale et RC Pro", false, true, false],
    ["Devis conformes en illimité", false, false, true],
    ["Numérotation continue et archive des devis", false, false, true],
    ["Mentions mises à jour quand la loi change", false, false, true],
  ];

  return (
    <>
      <PageHeader
        title="Des prix simples, payés au bon moment."
        rubrique="Tarifs"
        intro="Rien pour démarrer, une fois à la création, puis chaque mois pour vos devis. Les deux offres payantes sont indépendantes."
      />
      <Container className="py-12 sm:py-16">
        {mounted && paiement === "annule" && <Notice tone="warn" className="mb-8">Paiement annulé : aucun montant n'a été débité.</Notice>}
        <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {OFFRES.map((o) => {
            const actif = o.plan ? access[o.plan] : false;
            const fort = o.plan === "dossier";
            return (
              <div
                key={o.nom}
                className={cn(
                  "relief relative flex flex-col rounded-[24px] p-7 sm:p-8",
                  fort
                    ? "bord-lumineux bg-nuit text-white [--reflet:rgb(255_255_255/0.1)] shadow-[0_30px_60px_-20px_rgb(11_18_32/0.45)] max-lg:my-3 lg:-my-4 lg:py-12"
                    : "bg-papier shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-sm)]",
                )}
              >
                {fort && (
                  <>
                    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[24px]">
                      <div className="absolute -top-24 left-1/2 h-64 w-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(47_91_234/0.5),transparent)]" />
                    </div>
                    <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center whitespace-nowrap gap-1.5 rounded-full bg-balise px-3 py-1 text-[12px] font-semibold text-white shadow-[0_4px_12px_rgb(255_106_31/0.4)]">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden /> Recommandé pour se lancer
                    </span>
                  </>
                )}
                <p className={cn("text-[14px] font-semibold", fort ? "text-bleu-clair" : "text-bleu")}>{o.pour}</p>
                <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.025em]">{o.nom}</h2>
                <p className="mt-6">
                  <span className="display block whitespace-nowrap text-[56px] leading-none tabular-nums">{o.prix}</span>
                  <span className={cn("mt-2 block text-[14.5px]", fort ? "text-white/60" : "text-encre-2")}>{o.rythme}</span>
                </p>
                <div className="mt-7">
                  {!o.plan ? (
                    <ButtonLink to="/outils/qualification" variant="secondary" size="lg" className="w-full">Commencer gratuitement</ButtonLink>
                  ) : actif ? (
                    <ButtonLink to="/espace" variant={fort ? "inverse" : "secondary"} size="lg" className="w-full">Déjà actif, voir mon espace</ButtonLink>
                  ) : (
                    <Button variant={fort ? "inverse" : "encre"} size="lg" className="w-full" loading={busy === o.plan} onClick={() => acheter(o.plan!)}>
                      {o.plan === "pro" ? "S'abonner au Pro" : "Acheter le Pack Lancement"}
                    </Button>
                  )}
                </div>
                <div className={cn("my-7 h-px", fort ? "bg-white/10" : "bg-encre/[0.07]")} />
                <ul className="flex-1 space-y-3">
                  {o.inclus.map((x) => (
                    <li key={x} className="flex gap-3 text-[15px] leading-snug">
                      <span className={cn("mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full", fort ? "bg-white/10 text-[#3ddc97]" : "bg-vert-pale text-vert")}>
                        <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden />
                      </span>
                      <span className={fort ? "text-white/85" : undefined}>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { I: Lock, t: "Paiement sécurisé par Stripe", d: "Vos coordonnées bancaires ne transitent jamais par Bâtipro." },
            { I: ReceiptText, t: "Facture envoyée par email", d: "Avec votre numéro de TVA si vous en avez un." },
            { I: ShieldCheck, t: "Sans engagement", d: "L'abonnement Pro se résilie en un clic." },
          ].map(({ I, t, d }) => (
            <div key={t} className="flex gap-3 rounded-2xl bg-papier/60 p-4 shadow-[inset_0_0_0_1px_rgb(11_18_32/0.06)]">
              <I className="mt-0.5 h-5 w-5 shrink-0 text-encre-3" aria-hidden />
              <div>
                <p className="text-[14.5px] font-semibold">{t}</p>
                <p className="text-[13.5px] text-encre-2">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-[13.5px] leading-relaxed text-encre-3">
          Prix finaux, sans frais cachés. Pour le Pack Lancement, le contenu numérique est fourni immédiatement : vous renoncez à votre
          droit de rétractation en validant le paiement. Bâtipro est un service privé, indépendant de l'INPI : la déclaration de création
          se fait sur procedures.inpi.fr, gratuitement pour un entrepreneur individuel, et reste possible sans Bâtipro. Les frais légaux
          d'une société (greffe, annonce légale) ne sont pas compris.
        </p>

        <div className="mt-24">
          <SectionHead eyebrow="Comparatif" title="Le détail, ligne par ligne." />
          <div className="mt-8 overflow-x-auto rounded-2xl bg-papier shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-sm)]">
            <table className="w-full min-w-[40rem] text-left text-[15px]">
              <thead>
                <tr className="border-b border-encre/[0.07] text-[13.5px]">
                  <th scope="col" className="px-6 py-4 font-medium text-encre-3">Fonctionnalité</th>
                  <th scope="col" className="w-36 py-4 text-center font-semibold">Gratuit</th>
                  <th scope="col" className="w-36 bg-bleu-pale/50 py-4 text-center font-semibold text-bleu-fonce">Lancement</th>
                  <th scope="col" className="w-36 py-4 text-center font-semibold">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-encre/[0.05]">
                {lignes.map(([k, ...v]) => (
                  <tr key={k} className="transition-colors hover:bg-enduit/50">
                    <th scope="row" className="px-6 py-3.5 font-medium">{k}</th>
                    {v.map((on, j) => (
                      <td key={j} className={cn("py-3.5 text-center", j === 1 && "bg-bleu-pale/30")}>
                        {on ? (
                          <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-vert-pale text-vert">
                            <Check className="h-3 w-3" strokeWidth={3.5} aria-label="Inclus" />
                          </span>
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-encre/20" aria-label="Non inclus" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-24 grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <div>
            <SectionHead eyebrow="FAQ" title="Questions fréquentes" />
            <p className="mt-4 text-[15px] text-encre-2">
              Une autre question ?{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-bleu hover:text-bleu-fonce">Écrivez-nous</a>.
            </p>
          </div>
          <FaqList items={FAQ_ACCUEIL} />
        </div>
      </Container>
    </>
  );
}
