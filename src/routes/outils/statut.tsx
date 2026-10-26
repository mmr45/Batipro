import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, ButtonLink, Card, Choices, Container, Field, Notice, PageHeader } from "@/components/ui";
import { seo } from "@/lib/seo";
import { STATUT_LABEL, TRANCHES_CA, evaluerStatut, type StatutInput, type StatutResult, type TrancheCA } from "@rules/statut.ts";
import { ACRE, MICRO_PLAFOND_PRESTATIONS, MICRO_TAUX_2026, TVA_FRANCHISE_PRESTATIONS, formatEuro, formatMontant } from "@rules/reglementation.ts";
import { useAuth } from "@/lib/auth";
import { saveSubmission } from "@/lib/api";
import { dateFr, storageGet, storageSet } from "@/lib/utils";

export const Route = createFileRoute("/outils/statut")({
  head: () =>
    seo({
      title: "Micro, EI ou SASU : quel statut pour un artisan du bâtiment ?",
      description:
        "Simulateur gratuit : plafonds 2026, franchise de TVA, cotisations micro et ACRE. Une pré-orientation argumentée en cinq questions.",
      path: "/outils/statut",
    }),
  component: Page,
});

type Form = { ca: TrancheCA | ""; associes: "oui" | "non" | ""; patrimoine: "oui" | "non" | ""; social: StatutInput["social"] | ""; achats: "oui" | "non" | "" };
const VIDE: Form = { ca: "", associes: "", patrimoine: "", social: "", achats: "" };
const KEY = "batipro.statut.v2";

function Page() {
  const { user } = useAuth();
  const [f, setF] = useState<Form>(VIDE);
  const [res, setRes] = useState<StatutResult | null>(null);
  useEffect(() => setF(storageGet(KEY, VIDE)), []);
  useEffect(() => storageSet(KEY, f), [f]);

  const complete = Object.values(f).every(Boolean);
  const answered = Object.values(f).filter(Boolean).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return;
    const input: StatutInput = {
      ca: f.ca as TrancheCA,
      associes: f.associes === "oui",
      patrimoine: f.patrimoine === "oui",
      social: f.social as StatutInput["social"],
      achatsImportants: f.achats === "oui",
    };
    const r = evaluerStatut(input);
    setRes(r);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (user) await saveSubmission("statut", `${r.label} (confiance ${r.confiance} %)`, { input, result: r });
  }

  const ouiNon = [
    { value: "oui" as const, label: "Oui" },
    { value: "non" as const, label: "Non" },
  ];

  return (
    <>
      <PageHeader
        title="Quel statut pour démarrer ?"
        intro="Cinq questions pour une pré-orientation entre micro-entreprise, EI au réel et SASU, avec les seuils et taux 2026."
      />
      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_1fr]">
        <form onSubmit={submit} className="space-y-7">
          <p className="text-[14px] text-ardoise-3">{answered} réponse{answered > 1 ? "s" : ""} sur 5</p>
          <Field label="Chiffre d'affaires prévu la première année">
            <Choices name="ca" value={f.ca} onChange={(v) => setF({ ...f, ca: v })} options={TRANCHES_CA} />
          </Field>
          <Field label="Voulez-vous vous associer avec quelqu'un ?">
            <Choices name="associes" value={f.associes} onChange={(v) => setF({ ...f, associes: v })} options={ouiNon} />
          </Field>
          <Field label="La protection de votre patrimoine personnel est-elle une priorité ?">
            <Choices name="patrimoine" value={f.patrimoine} onChange={(v) => setF({ ...f, patrimoine: v })} options={ouiNon} />
          </Field>
          <Field label="Quelle protection sociale préférez-vous ?">
            <Choices
              name="social"
              value={f.social}
              onChange={(v) => setF({ ...f, social: v })}
              columns={3}
              options={[
                { value: "tns", label: "Indépendant", sub: "Cotisations plus faibles" },
                { value: "assimile", label: "Assimilé-salarié", sub: "Meilleure couverture" },
                { value: "indifferent", label: "Peu importe" },
              ]}
            />
          </Field>
          <Field label="Allez-vous acheter beaucoup de matériaux ou d'outillage ?" hint="En micro, vous ne déduisez pas vos achats et ne récupérez pas la TVA.">
            <Choices name="achats" value={f.achats} onChange={(v) => setF({ ...f, achats: v })} options={ouiNon} />
          </Field>
          <Button type="submit" disabled={!complete}>
            Voir mon orientation
          </Button>
        </form>
        <div>{res ? <Resultat r={res} /> : <Reperes />}</div>
      </Container>
    </>
  );
}

function Reperes() {
  return (
    <Card className="bg-beton-2/40 ring-0">
      <p className="font-semibold">Les repères 2026</p>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-[14.5px]">
        <dt className="text-ardoise-2">Plafond micro, prestations</dt>
        <dd className="font-semibold">{formatMontant(MICRO_PLAFOND_PRESTATIONS.valeur)}</dd>
        <dt className="text-ardoise-2">Franchise de TVA, prestations</dt>
        <dd className="font-semibold">{formatMontant(TVA_FRANCHISE_PRESTATIONS.base)}</dd>
        <dt className="text-ardoise-2">Cotisations micro, artisan</dt>
        <dd className="font-semibold">{String(MICRO_TAUX_2026.prestationsArtisan).replace(".", ",")} % du CA</dd>
        <dt className="text-ardoise-2">ACRE micro depuis le {dateFr(ACRE.dateChangement)}</dt>
        <dd className="font-semibold">−{ACRE.reductionMicro} %</dd>
      </dl>
    </Card>
  );
}

function Resultat({ r }: { r: StatutResult }) {
  const e = r.estimationMicro;
  const autres = (Object.keys(r.scores) as (keyof typeof r.scores)[]).filter((k) => k !== r.statut);
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-[14px] text-ardoise-2">Pré-orientation, confiance {r.confiance} %</p>
        <h2 className="display text-4xl">{r.label}</h2>
        <p className="mt-1 text-ardoise-2">{r.resume}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-beton" aria-hidden>
        <div className="h-full bg-bleu" style={{ width: `${r.confiance}%` }} />
      </div>
      <ul className="list-disc space-y-1 pl-5">
        {r.raisons.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {r.alertes.map((a) => (
        <Notice key={a} tone="warn">
          {a}
        </Notice>
      ))}
      {r.validationExpert && (
        <Notice tone="info" title="Faites valider par un expert-comptable">
          Votre situation est proche de la limite entre deux statuts : un rendez-vous d'une heure évite une erreur coûteuse.
        </Notice>
      )}
      {r.statut === "micro" && (
        <div className="rounded-sm bg-beton/60 p-4">
          <p className="font-semibold">Exemple pour {formatMontant(e.exempleCA)} encaissés sur un an</p>
          <p className="mt-1 text-ardoise-2">
            Cotisations : {formatEuro(e.cotisationsAnnuelles, 0)} ({String(e.tauxCotisations).replace(".", ",")} %), ou{" "}
            {formatEuro(e.cotisationsAvecAcre, 0)} avec l'ACRE la première période ({String(e.tauxAvecAcre).replace(".", ",")} %).
            S'y ajoutent la taxe de chambre de métiers ({String(MICRO_TAUX_2026.taxeCmaArtisan).replace(".", ",")} %) et l'impôt
            sur le revenu, ou le versement libératoire ({String(MICRO_TAUX_2026.versementLiberatoirePrestations).replace(".", ",")} %).
          </p>
        </div>
      )}
      <p className="text-[14px] text-ardoise-3">
        Écart avec les autres options : {autres.map((k) => `${STATUT_LABEL[k]} (${r.scores[k] - r.scores[r.statut]} pts)`).join(", ")}.
      </p>
      <div className="no-print flex flex-wrap gap-2">
        <ButtonLink to="/outils/inpi">Préparer mon dossier de création</ButtonLink>
        <Button variant="secondary" onClick={() => window.print()}>
          Imprimer
        </Button>
      </div>
    </Card>
  );
}
