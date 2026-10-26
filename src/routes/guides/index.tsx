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

/** Niveau de risque pour l'assureur, lu comme une jauge à 5 cases. */
function Jauge({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`Risque ${n} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={"h-3 w-2.5 " + (i <= n ? (n >= 4 ? "bg-balise" : "bg-encre") : "bg-encre/12")} />
      ))}
    </span>
  );
}

function Page() {
  return (
    <>
      <PageHeader
        title="Guides par métier"
        rubrique="Nomenclature"
        planche={`${METIERS_GUIDES.length} métiers`}
        intro="Ce qu'il faut pour s'installer à son compte, métier par métier : qualification, obligations propres, statut, décennale et devis."
      />
      <Container className="py-12">
        <div className="overflow-x-auto">
          <table className="w-full border-t-2 border-encre text-left">
            <thead>
              <tr className="border-b border-encre/15 text-[13.5px] text-encre-3">
                <th scope="col" className="py-3 pr-4 font-medium">Métier</th>
                <th scope="col" className="hidden py-3 pr-4 font-medium md:table-cell">Spécialité</th>
                <th scope="col" className="hidden py-3 pr-4 font-medium sm:table-cell">Code APE</th>
                <th scope="col" className="py-3 pr-4 font-medium">Risque</th>
                <th scope="col" className="hidden w-8 py-3 sm:table-cell"><span className="sr-only">Ouvrir</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-encre/10">
              {METIERS_GUIDES.map((m) => (
                <tr key={m.slug} className="group relative transition-colors hover:bg-papier">
                  <th scope="row" className="py-4 pr-4">
                    <Link to="/guides/$metier" params={{ metier: m.slug }} className="display-etroit text-[21px] sm:text-[24px] after:absolute after:inset-0 group-hover:text-bleu">
                      {m.label}
                    </Link>
                  </th>
                  <td className="hidden py-4 pr-4 text-[15px] text-encre-2 md:table-cell">{m.accroche}</td>
                  <td className="hidden py-4 pr-4 sm:table-cell"><span className="ref !text-[13px] !text-encre">{m.ape}</span></td>
                  <td className="py-4 pr-4"><Jauge n={m.risque} /></td>
                  <td className="hidden py-4 text-encre-3 group-hover:text-bleu sm:table-cell"><ArrowUpRight className="h-5 w-5" aria-hidden /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 max-w-2xl text-[14px] text-encre-3">
          Le risque décennale est l'estimation utilisée par l'outil d'assurance : il influe sur les plafonds conseillés et le budget
          annuel. Le code APE est indicatif, l'INSEE l'attribue lors de l'immatriculation.
        </p>
      </Container>
    </>
  );
}
