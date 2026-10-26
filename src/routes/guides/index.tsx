import { createFileRoute, Link } from "@tanstack/react-router";
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

function Page() {
  return (
    <>
      <PageHeader title="Guides par métier" intro="Ce qu'il faut pour s'installer à son compte, métier par métier, avec les règles en vigueur." />
      <Container className="py-10">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METIERS_GUIDES.map((m) => (
            <li key={m.slug}>
              <Link to="/guides/$metier" params={{ metier: m.slug }} className="group block h-full rounded-md bg-papier p-5 ring-1 ring-ardoise/10 hover:ring-bleu">
                <span className="display text-3xl group-hover:text-bleu">{m.label}</span>
                <span className="mt-1 block text-[14.5px] text-ardoise-2">Devenir {m.label.toLowerCase()} indépendant : {m.accroche}.</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
