import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Container, PageHeader } from "@/components/ui";
import { seo } from "@/lib/seo";
import { METIERS_GUIDES } from "@rules/metiers.ts";

export const Route = createFileRoute("/guides/")({
  head: () =>
    seo({
      title: "Guides : devenir artisan du bâtiment à son compte",
      description: "Qualification, statut, immatriculation, décennale et devis : un guide à jour pour chaque métier du bâtiment.",
      path: "/guides",
    }),
  component: Page,
});

/** Niveau de risque pour l'assureur, lu comme une jauge à 5 segments. */
function Jauge({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-2" role="img" aria-label={`Risque ${n} sur 5`}>
      <span className="inline-flex gap-[3px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={"h-1.5 w-4 rounded-full " + (i <= n ? (n >= 4 ? "bg-balise" : "bg-bleu") : "bg-encre/10")} />
        ))}
      </span>
      <span className="text-[12px] font-medium tabular-nums text-encre-3">{n}/5</span>
    </span>
  );
}

function Page() {
  return (
    <>
      <PageHeader
        title="Guides par métier"
        rubrique="Outil gratuit"
        intro="Ce qu'il faut pour s'installer à son compte, métier par métier : qualification, obligations propres, statut, décennale et devis."
      />
      <Container className="py-12 sm:py-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {METIERS_GUIDES.map((m) => (
            <li key={m.slug}>
              <Link
                to="/guides/$metier"
                params={{ metier: m.slug }}
                className="relief group relative flex h-full flex-col rounded-[20px] bg-papier p-6 shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-xs)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgb(11_18_32/0.1),var(--shadow-lg)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[19px] font-semibold tracking-[-0.02em] group-hover:text-bleu">{m.label}</h2>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-encre-3 transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-bleu" aria-hidden />
                </div>
                <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-encre-2">{m.accroche}</p>
                <div className="mt-5 flex items-center justify-between border-t border-encre/[0.06] pt-4">
                  <span className="ref rounded-md bg-enduit px-2 py-0.5 !text-[11.5px] !text-encre-2">APE {m.ape}</span>
                  <Jauge n={m.risque} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl text-[14px] leading-relaxed text-encre-3">
          Le risque décennale est l'estimation utilisée par l'outil d'assurance : il influe sur les plafonds conseillés et le budget
          annuel. Le code APE est indicatif, l'INSEE l'attribue lors de l'immatriculation.
        </p>
      </Container>
    </>
  );
}
