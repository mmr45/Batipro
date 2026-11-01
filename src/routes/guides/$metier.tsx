import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge, ButtonLink, Container, Notice, Ref, revision } from "@/components/ui";
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
      <div className="relative overflow-hidden border-b border-encre/[0.06] bg-papier">
        <div aria-hidden className="terrain masque-radial pointer-events-none absolute inset-0 bg-transparent" />
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(47_91_234/0.10),transparent)]" />
        <Container className="relative grid gap-10 pb-12 pt-8 sm:pb-14 sm:pt-10 lg:grid-cols-[1fr_20rem] lg:items-end">
          <div className="max-w-3xl">
            <Link to="/guides" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-encre-2 hover:text-bleu">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Guides par métier
            </Link>
            <div className="mt-6"><Badge tone="bleu" dot>Guide à jour au {revision()}</Badge></div>
            <h1 className="display mt-4 text-[38px] sm:text-[56px]">Devenir {m.label.toLowerCase()} à son compte</h1>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-encre-2 sm:text-[18px]">
              Tout ce qu'il faut pour lancer votre activité de {m.accroche}, avec les règles applicables aujourd'hui.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-encre/[0.07] shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-sm)]">
            {([
              ["Code APE", m.ape],
              ["Réglementé", m.reglemente ? "Oui" : "Non"],
              ["Risque", `${m.risque}/5`],
            ] as const).map(([k, v]) => (
              <div key={k} className="bg-papier px-4 py-3.5">
                <dt className="text-[12px] font-medium text-encre-3">{k}</dt>
                <dd className="mt-0.5 text-[16px] font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </div>
      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Sommaire" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-encre-3">Sommaire</p>
            <ol className="mt-3 space-y-0.5 border-l border-encre/10 text-[14px]">
              {sommaire.map((s, i) => (
                <li key={s}>
                  <a href={`#s${i + 1}`} className="-ml-px flex gap-2.5 border-l border-transparent py-1.5 pl-4 text-encre-2 transition-colors hover:border-bleu hover:text-encre">
                    <span className="tabular-nums text-encre-3">{i + 1}.</span>
                    {s}
                  </a>
                </li>
              ))}
            </ol>
            <div className="mt-8 rounded-2xl bg-[linear-gradient(135deg,var(--color-bleu-pale),#fff4ec)] p-4">
              <p className="text-[14px] font-semibold">Prêt à vous lancer ?</p>
              <p className="mt-1 text-[13px] leading-snug text-encre-2">Vérifiez votre qualification en 3 minutes.</p>
              <Link to="/outils/qualification" className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold text-bleu">
                Faire le test <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </nav>
        <div className="guide max-w-3xl space-y-14 text-[16.5px] leading-[1.7] [&_p]:mt-3 [&_p]:text-encre-2">
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
                <li key={e.label} className="rounded-2xl bg-papier p-5 shadow-[0_0_0_1px_rgb(11_18_32/0.07)]">
                  <p className="!mt-0 font-semibold !text-encre">{e.label}</p>
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

          <nav aria-label="Autres métiers" className="border-t border-encre/[0.07] pt-10">
            <p className="text-[15px] font-semibold">Autres métiers</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {autres.map((x) => (
                <Link key={x.slug} to="/guides/$metier" params={{ metier: x.slug }} className="block rounded-full bg-papier px-3.5 py-1.5 text-[14px] font-semibold shadow-[0_0_0_1px_rgb(11_18_32/0.1)] transition-colors hover:bg-encre hover:text-white">
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
