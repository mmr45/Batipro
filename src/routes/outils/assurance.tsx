import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button, ButtonLink, Card, Checkbox, Choices, Container, Field, Notice, PageHeader, Select } from "@/components/ui";
import { Paywall, RequireAuth } from "@/components/layout";
import { seo } from "@/lib/seo";
import { METIERS } from "@rules/metiers.ts";
import { evaluerAssurance, type AssurInput, type AssurResult, type RisqueOption } from "@rules/assurance.ts";
import { formatEuro } from "@rules/reglementation.ts";
import { saveSubmission } from "@/lib/api";
import { storageGet, storageSet } from "@/lib/utils";

export const Route = createFileRoute("/outils/assurance")({
  head: () =>
    seo({
      title: "Assurance décennale et RC Pro : dimensionner ses garanties",
      description: "Plafonds de garantie conseillés et budget annuel indicatif de la décennale selon votre métier, votre CA et vos chantiers.",
      path: "/outils/assurance",
    }),
  component: Page,
});

const KEY = "batipro.assurance.v2";
const VIDE: AssurInput = { metier: "", ca: "lt50", effectif: "0", sinistres: "0", risques: [] };
const RISQUES: { value: RisqueOption; label: string }[] = [
  { value: "hauteur", label: "Travaux en hauteur (plus de 6 m)" },
  { value: "erp", label: "Chantiers en ERP ou locaux tertiaires" },
  { value: "sous_traitance", label: "Recours à la sous-traitance" },
  { value: "amiante", label: "Amiante, plomb ou travaux dangereux" },
];

function Page() {
  return (
    <>
      <PageHeader
        planche="04 / 05"
        rubrique="Pack Lancement"
        title="Assurance décennale"
        intro={
          <>
            Obligatoire avant le premier chantier <span className="ref">art. L241-1 C. assur.</span>. Estimez vos besoins avant
            de demander des devis aux assureurs, pour comparer à garanties égales.
          </>
        }
      />
      <Container className="py-10">
        <RequireAuth>
          <Paywall product="dossier" description="Le dimensionnement de l'assurance décennale et de la RC Pro fait partie du Pack Lancement, avec le dossier de création.">
            <Outil />
          </Paywall>
        </RequireAuth>
      </Container>
    </>
  );
}

function Outil() {
  const [f, setF] = useState<AssurInput>(VIDE);
  const [res, setRes] = useState<AssurResult | null>(null);
  useEffect(() => setF(storageGet(KEY, { ...VIDE, metier: storageGet<{ metier: string }>("batipro.qualif.v2", { metier: "" }).metier })), []);
  useEffect(() => storageSet(KEY, f), [f]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.metier) return;
    const r = evaluerAssurance(f);
    setRes(r);
    await saveSubmission("assurance", `${r.metierLabel} — prime ${r.primeBasse}–${r.primeHaute} €/an`, { input: f, result: r });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
      <form onSubmit={submit} className="space-y-6">
        <Field label="Métier principal" htmlFor="metier">
          <Select id="metier" required value={f.metier} onChange={(e) => setF({ ...f, metier: e.target.value })}>
            <option value="">Choisissez…</option>
            {METIERS.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Chiffre d'affaires prévu sur 12 mois">
          <Choices
            name="ca"
            value={f.ca}
            onChange={(v) => setF({ ...f, ca: v })}
            options={[
              { value: "lt50", label: "Moins de 50 000 €" },
              { value: "50_150", label: "50 000 – 150 000 €" },
              { value: "150_500", label: "150 000 – 500 000 €" },
              { value: "gt500", label: "Plus de 500 000 €" },
            ]}
          />
        </Field>
        <Field label="Salariés prévus">
          <Choices
            name="effectif"
            columns={4}
            value={f.effectif}
            onChange={(v) => setF({ ...f, effectif: v })}
            options={[
              { value: "0", label: "Aucun" },
              { value: "1_2", label: "1 à 2" },
              { value: "3_5", label: "3 à 5" },
              { value: "6plus", label: "6 et plus" },
            ]}
          />
        </Field>
        <Field label="Sinistres déclarés ces 5 dernières années">
          <Choices
            name="sinistres"
            columns={3}
            value={f.sinistres}
            onChange={(v) => setF({ ...f, sinistres: v })}
            options={[
              { value: "0", label: "Aucun" },
              { value: "1", label: "Un" },
              { value: "2plus", label: "Deux ou plus" },
            ]}
          />
        </Field>
        <Field label="Particularités de vos chantiers">
          <div className="space-y-1">
            {RISQUES.map((r) => (
              <Checkbox
                key={r.value}
                id={`r-${r.value}`}
                label={r.label}
                checked={f.risques.includes(r.value)}
                onChange={(on) => setF({ ...f, risques: on ? [...f.risques, r.value] : f.risques.filter((x) => x !== r.value) })}
              />
            ))}
          </div>
        </Field>
        <Button type="submit" disabled={!f.metier}>
          Calculer mes garanties
        </Button>
      </form>

      {res ? (
        <Card className="space-y-5">
          <div>
            <p className="text-[14px] text-ardoise-2">{res.metierLabel}, risque {res.niveauRisque}/5</p>
            <h2 className="display text-4xl">
              {formatEuro(res.primeBasse, 0)} à {formatEuro(res.primeHaute, 0)} par an
            </h2>
            <p className="text-ardoise-2">Ordre de grandeur de la prime décennale + RC Pro, hors franchise.</p>
          </div>
          <table className="w-full text-left text-[14.5px]">
            <tbody className="divide-y divide-ardoise/10">
              {res.garanties.map((g) => (
                <tr key={g.label}>
                  <th scope="row" className="py-2.5 pr-3 align-top font-medium">
                    {g.label}
                    <span className="block text-[13px] font-normal text-ardoise-3">{g.note}</span>
                  </th>
                  <td className="py-2.5 align-top font-semibold whitespace-nowrap">{g.valeur}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="list-disc space-y-1 pl-5 text-[14px] text-ardoise-2">
            {res.raisons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {res.alertes.map((a) => (
            <Notice key={a} tone="warn">
              {a}
            </Notice>
          ))}
          <Notice tone="info">
            Estimation indicative : seul le devis d'un assureur ou d'un courtier engage. Comparez au moins trois offres à garanties
            identiques.
          </Notice>
          <div className="no-print flex flex-wrap gap-2">
            <ButtonLink to="/outils/devis">Préparer mes devis</ButtonLink>
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimer la synthèse
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-l-[3px] border-encre bg-transparent shadow-none sm:p-6">
          <p className="font-semibold">Pourquoi dimensionner avant d'appeler</p>
          <p className="mt-2 text-ardoise-2">
            Les offres « pas chères » ont souvent des plafonds bas ou des activités exclues. Avec des plafonds de référence, vous
            comparez des contrats équivalents et vous repérez les exclusions.
          </p>
        </Card>
      )}
    </div>
  );
}
