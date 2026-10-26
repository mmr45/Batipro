import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ButtonLink, Container, Notice, Ref } from "@/components/ui";
import { seo } from "@/lib/seo";
import { SITE_URL } from "@/lib/utils";
import { evaluerAssurance } from "@rules/assurance.ts";
import { exigencesPour, getMetier, METIERS_GUIDES } from "@rules/metiers.ts";
import {
  ACRE,
  ASSURANCE,
  DECHETS,
  MICRO_PLAFOND_PRESTATIONS,
  MICRO_TAUX_2026,
  QUALIFICATION,
  REGLES_VERSION,
  TVA_FRANCHISE_PRESTATIONS,
  formatMontant,
} from "@rules/reglementation.ts";

export const Route = createFileRoute("/guides/$metier")({
  loader: ({ params }) => {
    const m = getMetier(params.metier);
    if (!m || m.slug === "autre") throw notFound();
    return m;
  },
  head: ({ loaderData: m }) =>
    m
      ? {
          ...seo({
            title: `Devenir ${m.label.toLowerCase()} indépendant en 2026 : le guide complet`,
            description: `Qualification, statut, immatriculation, assurance décennale et devis conformes pour vous installer comme ${m.label.toLowerCase()} à votre compte.`,
            path: `/guides/${m.slug}`,
          }),
          scripts: [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: `Devenir ${m.label.toLowerCase()} indépendant en 2026`,
                dateModified: REGLES_VERSION,
                inLanguage: "fr-FR",
                publisher: { "@type": "Organization", name: "Bâtipro", url: SITE_URL },
                mainEntityOfPage: `${SITE_URL}/guides/${m.slug}`,
              }),
            },
          ],
        }
      : {},
  component: Guide,
});

function Guide() {
  const m = Route.useLoaderData();
  const assur = evaluerAssurance({ metier: m.slug, ca: "lt50", effectif: "0", sinistres: "0", risques: [] });
  const exig = exigencesPour(m.slug);
  const autres = METIERS_GUIDES.filter((x) => x.slug !== m.slug);
  const sommaire = ["La qualification", "Les obligations du métier", "Le statut", "L'immatriculation", "L'assurance décennale", "Le premier devis"];

  return (
    <article>
      <div className="border-b border-ardoise/10 bg-papier">
        <Container className="py-12">
          <Link to="/guides" className="text-[14px] font-medium text-bleu">Guides par métier</Link>
          <h1 className="display mt-2 max-w-4xl text-5xl sm:text-6xl">Devenir {m.label.toLowerCase()} à son compte</h1>
          <p className="mt-4 max-w-2xl text-lg text-ardoise-2">
            Tout ce qu'il faut pour lancer votre activité de {m.accroche}, avec les règles applicables au {new Date(REGLES_VERSION).toLocaleDateString("fr-FR")}.
          </p>
        </Container>
      </div>
      <Container className="grid gap-10 py-10 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Sommaire" className="hidden lg:block">
          <ol className="sticky top-24 space-y-2 text-[14.5px]">
            {sommaire.map((s, i) => (
              <li key={s}><a href={`#s${i + 1}`} className="text-ardoise-2 hover:text-bleu">{i + 1}. {s}</a></li>
            ))}
          </ol>
        </nav>
        <div className="guide max-w-3xl space-y-12 [&_p]:mt-3 [&_p]:text-ardoise-2">
          <section id="s1">
            <h2>1. La qualification</h2>
            {m.reglemente ? (
              <>
                <p>
                  Le métier de {m.label.toLowerCase()} est une activité réglementée <Ref>Code de l'artisanat, art. L121-1</Ref>. Pour vous
                  immatriculer, il faut justifier soit d'un CAP, d'un BEP ou d'un diplôme supérieur dans le métier, soit de{" "}
                  {QUALIFICATION.experienceMinAns} ans d'expérience effective, comme salarié, indépendant ou dirigeant.
                </p>
                <p>
                  Sans l'un ni l'autre, vous pouvez passer le CAP en candidat libre ou par la VAE, ou exercer avec une personne
                  qualifiée qui contrôle effectivement l'activité.
                </p>
              </>
            ) : (
              <p>Cette activité n'exige pas de qualification pour s'immatriculer.</p>
            )}
            <div className="mt-5"><ButtonLink to="/outils/qualification">Vérifier ma qualification</ButtonLink></div>
          </section>

          <section id="s2">
            <h2>2. Les obligations du métier</h2>
            <ul className="mt-4 space-y-4">
              {exig.map((e) => (
                <li key={e.label} className="border-l-2 border-bleu pl-4">
                  <p className="!mt-0 font-semibold !text-ardoise">{e.label}</p>
                  <p className="!mt-1">{e.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <section id="s3">
            <h2>3. Le statut</h2>
            <p>
              La micro-entreprise est la plus simple pour démarrer : cotisations de {String(MICRO_TAUX_2026.prestationsArtisan).replace(".", ",")} %
              du chiffre d'affaires encaissé, et pas de TVA tant que vous restez sous {formatMontant(TVA_FRANCHISE_PRESTATIONS.base)}.
              Elle est limitée à {formatMontant(MICRO_PLAFOND_PRESTATIONS.valeur)} de prestations par an et ne permet pas de déduire
              vos achats.
            </p>
            <p>
              Si vous achetez beaucoup de matériaux ou d'outillage, l'entreprise individuelle au réel ou la SASU deviennent plus
              intéressantes. Depuis le 1er juillet 2026, l'ACRE réduit les cotisations micro de {ACRE.reductionMicro} % au démarrage.
            </p>
            <div className="mt-5"><ButtonLink to="/outils/statut" variant="secondary">Simuler mon statut</ButtonLink></div>
          </section>

          <section id="s4">
            <h2>4. L'immatriculation</h2>
            <p>
              Toutes les créations passent par le Guichet unique de l'INPI (procedures.inpi.fr). La Chambre de Métiers et de
              l'Artisanat vérifie ensuite votre qualification. Prévoyez : pièce d'identité, justificatif d'adresse du siège,
              diplôme ou preuves d'expérience, et déclaration de non-condamnation ; pour une SASU, les statuts, l'attestation de
              dépôt du capital et l'annonce légale.
            </p>
            <p>Code APE habituel : {m.ape}, {m.apeLabel.toLowerCase()}. Il est attribué par l'INSEE.</p>
          </section>

          <section id="s5">
            <h2>5. L'assurance décennale</h2>
            <p>
              Elle est obligatoire avant le premier chantier <Ref>{ASSURANCE.decennaleSource}</Ref>. Pour ce métier (risque{" "}
              {assur.niveauRisque}/5), comptez de l'ordre de {formatMontant(assur.primeBasse)} à {formatMontant(assur.primeHaute)} par an
              au démarrage, et une RC Pro d'au moins {assur.rcProConseilleK.toLocaleString("fr-FR")} k€ par sinistre.
            </p>
            <Notice tone="warn" className="mt-4">
              L'attestation doit lister précisément vos activités. Un chantier hors activité déclarée n'est pas couvert.
            </Notice>
          </section>

          <section id="s6">
            <h2>6. Le premier devis</h2>
            <p>
              Un devis de {m.label.toLowerCase()} doit notamment mentionner : SIRET et forme juridique (avec « EI » pour un
              entrepreneur individuel), l'assureur décennale et sa couverture géographique <Ref>{ASSURANCE.mentionDevisSource}</Ref>,
              le détail chiffré et le taux de TVA de chaque ligne, la gestion des déchets <Ref>{DECHETS.source}</Ref> et, face à un
              particulier, le médiateur de la consommation.
            </p>
            {m.outillage && <p>Pour chiffrer juste, intégrez le temps de préparation et l'amortissement du matériel ({m.outillage}).</p>}
            <div className="mt-5"><ButtonLink to="/outils/devis">Faire un devis conforme</ButtonLink></div>
          </section>

          <Notice tone="info">
            Ce guide donne un cadre général et ne remplace pas l'avis d'un expert-comptable, d'un avocat, d'un assureur ou de la CMA.
          </Notice>

          <nav aria-label="Autres métiers">
            <p className="font-semibold">Autres métiers</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {autres.map((x) => (
                <Link key={x.slug} to="/guides/$metier" params={{ metier: x.slug }} className="rounded-sm bg-papier px-3 py-1.5 text-[14px] ring-1 ring-ardoise/10 hover:ring-bleu">
                  {x.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </Container>
    </article>
  );
}
