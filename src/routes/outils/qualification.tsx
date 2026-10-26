import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, CircleX, Printer } from "lucide-react";
import { Button, ButtonLink, Card, Checkbox, Choices, Container, Field, Notice, PageHeader, Select } from "@/components/ui";
import { seo } from "@/lib/seo";
import { METIERS } from "@rules/metiers.ts";
import { DIPLOMES, evaluerQualification, type Diplome, type QualifInput, type QualifResult } from "@rules/qualification.ts";
import { QUALIFICATION } from "@rules/reglementation.ts";
import { useAuth } from "@/lib/auth";
import { saveSubmission } from "@/lib/api";
import { storageGet, storageSet } from "@/lib/utils";

export const Route = createFileRoute("/outils/qualification")({
  head: () =>
    seo({
      title: "Test de qualification artisan du bâtiment",
      description:
        "Diplôme ou 3 ans d'expérience : vérifiez en 2 minutes si vous pouvez immatriculer votre activité du bâtiment, métier par métier.",
      path: "/outils/qualification",
    }),
  component: Page,
});

const KEY = "batipro.qualif.v2";
const VIDE: QualifInput = { metier: "", diplome: "aucun", experienceAns: 0, diplomeUE: false };

function Page() {
  const { user } = useAuth();
  const [f, setF] = useState<QualifInput>(VIDE);
  const [res, setRes] = useState<QualifResult | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setF(storageGet(KEY, VIDE)), []);
  useEffect(() => storageSet(KEY, f), [f]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.metier) return;
    const r = evaluerQualification(f);
    setRes(r);
    setSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (user) setSaved(await saveSubmission("qualif", `${r.metierLabel} — ${r.titre}`, { input: f, result: r }));
  }

  return (
    <>
      <PageHeader
        title="Ai-je le droit d'exercer ce métier ?"
        intro={
          <>
            La plupart des métiers du bâtiment sont réglementés : il faut un CAP/BEP ou trois ans d'expérience pour s'installer.
            Contrôle factuel selon le <span className="ref">{QUALIFICATION.source}</span>.
          </>
        }
      />
      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_1.1fr]">
        <form onSubmit={submit} className="space-y-6">
          <Field label="Votre métier" htmlFor="metier">
            <Select id="metier" required value={f.metier} onChange={(e) => setF({ ...f, metier: e.target.value })}>
              <option value="">Choisissez…</option>
              {METIERS.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Votre diplôme le plus élevé dans ce métier">
            <Choices<Diplome>
              name="diplome"
              value={f.diplome}
              onChange={(v) => setF({ ...f, diplome: v })}
              options={DIPLOMES.map((d) => ({ value: d.value, label: d.label }))}
            />
          </Field>
          <Field
            label={`Années d'expérience dans ce métier : ${f.experienceAns} an${f.experienceAns > 1 ? "s" : ""}`}
            htmlFor="exp"
            hint="Salarié, apprenti, indépendant ou dirigeant : tout compte, à condition d'exercer le métier lui-même."
          >
            <input
              id="exp"
              type="range"
              min={0}
              max={15}
              value={f.experienceAns}
              onChange={(e) => setF({ ...f, experienceAns: Number(e.target.value) })}
              className="accent-bleu"
            />
          </Field>
          <Checkbox
            id="ue"
            checked={f.diplomeUE}
            onChange={(v) => setF({ ...f, diplomeUE: v })}
            label="J'ai une qualification équivalente obtenue dans un autre pays de l'UE ou de l'EEE"
          />
          <Button type="submit" disabled={!f.metier} className="w-full sm:w-auto">
            Vérifier ma qualification
          </Button>
        </form>

        <div>
          {res ? (
            <Resultat res={res} saved={saved} connected={!!user} />
          ) : (
            <Card className="bg-beton-2/40 ring-0">
              <p className="font-semibold">Ce que vous obtenez</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ardoise-2">
                <li>Le verdict selon la loi, avec la raison exacte</li>
                <li>Les obligations propres à votre métier (habilitations, amiante, carte BTP)</li>
                <li>Les solutions si vous n'êtes pas encore qualifié</li>
              </ul>
            </Card>
          )}
        </div>
      </Container>
    </>
  );
}

function Resultat({ res, saved, connected }: { res: QualifResult; saved: boolean; connected: boolean }) {
  const meta = {
    eligible: { Icon: CheckCircle2, cls: "text-vert", bg: "bg-vert-pale" },
    presque: { Icon: CircleAlert, cls: "text-balise", bg: "bg-balise-pale" },
    non: { Icon: CircleX, cls: "text-rouge", bg: "bg-rouge-pale" },
  }[res.status];
  return (
    <Card className="space-y-5">
      <div className={`-m-5 mb-0 flex items-start gap-3 rounded-t-md p-5 sm:-m-6 sm:mb-0 sm:p-6 ${meta.bg}`}>
        <meta.Icon className={`h-7 w-7 shrink-0 ${meta.cls}`} aria-hidden />
        <div>
          <p className="text-[13px] font-medium text-ardoise-2">{res.metierLabel}</p>
          <h2 className="display text-3xl">{res.titre}</h2>
        </div>
      </div>
      <ul className="space-y-1.5">
        {res.raisons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {res.conseils.length > 0 && (
        <div>
          <p className="font-semibold">À faire</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-ardoise-2">
            {res.conseils.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="font-semibold">Obligations propres à ce métier</p>
        <ul className="mt-2 space-y-3">
          {res.exigences.map((e) => (
            <li key={e.label} className="border-l-2 border-bleu pl-3">
              <p className="font-medium">{e.label}</p>
              <p className="text-[14px] text-ardoise-2">{e.detail}</p>
            </li>
          ))}
        </ul>
      </div>
      <Notice tone="info">
        Ce test ne remplace pas le contrôle de la Chambre de Métiers et de l'Artisanat lors de l'immatriculation.
      </Notice>
      {connected ? (
        saved && <p className="text-[14px] text-vert">Résultat enregistré dans votre espace.</p>
      ) : (
        <p className="text-[14px] text-ardoise-2">
          <Link to="/connexion" search={{ mode: "inscription", redirect: "/outils/qualification" }} className="font-semibold text-bleu underline">
            Créez un compte gratuit
          </Link>{" "}
          pour retrouver ce résultat et enchaîner sur le dossier.
        </p>
      )}
      <div className="no-print flex flex-wrap gap-2">
        {res.status === "eligible" && <ButtonLink to="/outils/statut">Choisir mon statut</ButtonLink>}
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Imprimer ou enregistrer en PDF
        </Button>
      </div>
    </Card>
  );
}
