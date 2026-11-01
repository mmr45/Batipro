import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Checkbox, Choices, Container, Field, Input, Notice, PageHeader, Select, StepTitle, Textarea } from "@/components/ui";
import { Paywall, RequireAuth } from "@/components/layout";
import { seo } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { sb } from "@/lib/supabase";
import { downloadPdf, lastSubmission, saveSubmission } from "@/lib/api";
import { storageGet, storageSet } from "@/lib/utils";
import { METIERS, getMetier } from "@rules/metiers.ts";
import {
  CONJOINT_LABEL,
  FORME_INPI_LABEL,
  INPI_VIDE,
  PIECES,
  aUnConjoint,
  aidePiece,
  coutsCreation,
  etapesApres,
  ficheSaisie,
  metierReglemente,
  piecesRequises,
  pointsDeVigilance,
  type InpiData,
  type PieceKey,
} from "@rules/inpi.ts";
import { ACRE } from "@rules/reglementation.ts";

export const Route = createFileRoute("/outils/inpi")({
  head: () =>
    seo({
      title: "Préparer son dossier d'immatriculation INPI",
      description: "Une fiche de saisie dans l'ordre du Guichet unique INPI, vos pièces converties en PDF et la déclaration de non-condamnation pré-remplie.",
      path: "/outils/inpi",
    }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader
        etape={3}
        rubrique="Pack Lancement"
        title="Dossier de création"
        intro="Répondez une fois aux questions que le Guichet unique de l'INPI va vous poser. Vous obtenez une fiche de saisie rangée dans l'ordre du formulaire, vos pièces converties en PDF (une par case à téléverser) et la déclaration de non-condamnation pré-remplie."
      />
      <Container className="py-10 sm:py-14">
        <RequireAuth>
          <Notice tone="info" className="mb-6" title="Bâtipro n'est pas l'INPI">
            La déclaration se fait sur procedures.inpi.fr, le seul site officiel. Elle est gratuite pour un entrepreneur individuel et vous pouvez la
            remplir sans nous. Ce dossier vous fait gagner du temps et évite les refus pour pièce manquante, mais Bâtipro ne transmet rien à votre place.
          </Notice>
          <Paywall product="dossier" description="Le dossier de création, avec stockage sécurisé de vos pièces, fait partie du Pack Lancement.">
            <Formulaire />
          </Paywall>
        </RequireAuth>
      </Container>
    </>
  );
}

const KEY = "batipro.inpi.v2";
const ETAPES = ["Vous", "L'entreprise", "Le siège", "Pièces et options"];
type Fichiers = Partial<Record<PieceKey, string[]>>;

function Formulaire() {
  const { user, profile } = useAuth();
  const [d, setD] = useState<InpiData>(INPI_VIDE);
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<Fichiers>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (patch: Partial<InpiData>) => setD((x) => ({ ...x, ...patch }));

  const refreshFiles = useCallback(async () => {
    if (!user) return;
    const out: Fichiers = {};
    for (const p of PIECES) {
      const { data } = await sb().storage.from("justificatifs").list(`${user.id}/${p.key}`);
      const names = (data ?? []).map((f) => f.name).filter((n) => n && !n.startsWith("."));
      if (names.length) out[p.key] = names;
    }
    setFiles(out);
  }, [user]);

  useEffect(() => {
    (async () => {
      const local = storageGet<InpiData>(KEY, INPI_VIDE);
      const remote = local.nom ? null : await lastSubmission<InpiData>("inpi");
      const base = { ...INPI_VIDE, ...(remote?.data ?? {}), ...local };
      const qualifMetier = storageGet<{ metier: string }>("batipro.qualif.v2", { metier: "" }).metier;
      setD({
        ...base,
        prenom: base.prenom || profile?.prenom || "",
        nom: base.nom || profile?.nom || "",
        email: base.email || user?.email || "",
        telephone: base.telephone || profile?.telephone || "",
        metier: base.metier || qualifMetier,
      });
    })();
    refreshFiles();
  }, [user, profile, refreshFiles]);
  useEffect(() => storageSet(KEY, d), [d]);

  const metier = getMetier(d.metier);
  const requises = piecesRequises(d);
  const vigilance = pointsDeVigilance(d, Object.keys(files) as PieceKey[]);

  function valide(): string | null {
    if (step === 0 && (!d.civilite || !d.prenom || !d.nom || !d.dateNaissance || !d.villeNaissance)) return "Complétez votre identité et votre naissance.";
    if (step === 0 && (!d.perePrenom || !d.pereNom || !d.merePrenom || !d.mereNomNaissance))
      return "Indiquez votre filiation : elle figure obligatoirement sur la déclaration de non-condamnation.";
    if (step === 1 && d.forme === "sasu" && !d.denomination.trim()) return "Indiquez la dénomination de la SASU.";
    if (step === 1 && metierReglemente(d.metier) && d.qualifPar === "salarie" && !d.qualifNom.trim()) return "Indiquez le nom du salarié qualifié.";
    if (step === 1 && (!d.metier || !d.activite || !d.dateDebut)) return "Indiquez le métier, l'activité et la date de début.";
    if (step === 1 && d.forme === "sasu" && !(Number(d.capital) >= 1)) return "Le capital d'une SASU est d'au moins 1 €.";
    if (step === 2 && (!d.adresse || !/^\d{5}$/.test(d.codePostal) || !d.ville)) return "Adresse du siège incomplète (code postal à 5 chiffres).";
    if (step === 2 && d.local !== "domicile" && (!d.adressePerso || !d.villePerso)) return "Indiquez aussi votre adresse personnelle : le Guichet unique la demande.";
    if (step === 3 && !d.honneur) return "Cochez la case de confirmation.";
    return null;
  }

  async function upload(key: PieceKey, file: File) {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Fichier trop lourd : 5 Mo maximum.");
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return toast.error("Formats acceptés : PDF, JPEG ou PNG.");
    const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
    const { error } = await sb().storage.from("justificatifs").upload(`${user.id}/${key}/${Date.now()}-${safe}`, file, { contentType: file.type });
    if (error) toast.error("Envoi impossible : " + error.message);
    else toast.success("Pièce ajoutée");
    refreshFiles();
  }

  async function remove(key: PieceKey, name: string) {
    if (!user) return;
    await sb().storage.from("justificatifs").remove([`${user.id}/${key}/${name}`]);
    refreshFiles();
  }

  async function generer() {
    const err = valide();
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const ok = await saveSubmission("inpi", `${FORME_INPI_LABEL[d.forme]} — ${d.prenom} ${d.nom}`, d);
      if (!ok) throw new Error("Enregistrement du dossier impossible.");
      await downloadPdf("generate-inpi-pdf", {}, "dossier-creation.zip");
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <Card className="space-y-6">
        <ol className="flex flex-wrap gap-2" aria-label="Étapes">
          {ETAPES.map((e, i) => (
            <li key={e}>
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${i === step ? "bg-bleu text-white" : i < step ? "bg-bleu-pale text-bleu" : "bg-enduit text-encre-3"}`}
                aria-current={i === step ? "step" : undefined}
              >
                {i + 1}. {e}
              </button>
            </li>
          ))}
        </ol>
        <StepTitle n={step + 1} total={4}>
          {ETAPES[step]}
        </StepTitle>

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Civilité" className="sm:col-span-2">
              <Choices name="civ" columns={2} value={d.civilite} onChange={(v) => set({ civilite: v })} options={[{ value: "M.", label: "Monsieur" }, { value: "Mme", label: "Madame" }]} />
            </Field>
            <Field label="Prénom" htmlFor="prenom"><Input id="prenom" value={d.prenom} onChange={(e) => set({ prenom: e.target.value })} autoComplete="given-name" /></Field>
            <Field label="Nom de naissance" htmlFor="nom"><Input id="nom" value={d.nom} onChange={(e) => set({ nom: e.target.value })} autoComplete="family-name" /></Field>
            <Field label="Nom d'usage (facultatif)" htmlFor="usage"><Input id="usage" value={d.nomUsage} onChange={(e) => set({ nomUsage: e.target.value })} /></Field>
            <Field label="Date de naissance" htmlFor="ddn"><Input id="ddn" type="date" value={d.dateNaissance} onChange={(e) => set({ dateNaissance: e.target.value })} /></Field>
            <Field label="Ville de naissance" htmlFor="vn"><Input id="vn" value={d.villeNaissance} onChange={(e) => set({ villeNaissance: e.target.value })} /></Field>
            <Field label="Pays de naissance" htmlFor="pn"><Input id="pn" value={d.paysNaissance} onChange={(e) => set({ paysNaissance: e.target.value })} /></Field>
            <Field label="Nationalité" htmlFor="nat"><Input id="nat" value={d.nationalite} onChange={(e) => set({ nationalite: e.target.value })} /></Field>
            <Field label="Téléphone" htmlFor="tel"><Input id="tel" type="tel" value={d.telephone} onChange={(e) => set({ telephone: e.target.value })} autoComplete="tel" /></Field>
            <Field label="Email" htmlFor="em"><Input id="em" type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="Situation matrimoniale" htmlFor="sm" hint="Marié(e) sous un régime de communauté : votre conjoint doit être informé des conséquences des dettes sur les biens communs.">
              <Select id="sm" value={d.situationMatrimoniale} onChange={(e) => set({ situationMatrimoniale: e.target.value as InpiData["situationMatrimoniale"] })}>
                <option value="">Choisissez…</option>
                <option value="celibataire">Célibataire</option>
                <option value="pacse">Pacsé(e)</option>
                <option value="marie_communaute">Marié(e), régime de communauté</option>
                <option value="marie_separation">Marié(e), séparation de biens</option>
              </Select>
            </Field>
            {aUnConjoint(d) && (
              <Field label="Votre conjoint ou partenaire travaille-t-il avec vous ?" htmlFor="cj" hint="Entreprise individuelle uniquement. S'il participe régulièrement à l'activité, il doit avoir un statut.">
                <Select id="cj" value={d.conjointRole} onChange={(e) => set({ conjointRole: e.target.value as InpiData["conjointRole"] })}>
                  {(Object.keys(CONJOINT_LABEL) as InpiData["conjointRole"][]).map((k) => <option key={k} value={k}>{CONJOINT_LABEL[k]}</option>)}
                </Select>
              </Field>
            )}
            <p className="pt-2 text-[14px] font-semibold sm:col-span-2">Filiation</p>
            <p className="-mt-3 text-[13px] text-encre-3 sm:col-span-2">Demandée par la déclaration de non-condamnation que le Guichet unique exige.</p>
            <Field label="Prénom du père" htmlFor="pp"><Input id="pp" value={d.perePrenom} onChange={(e) => set({ perePrenom: e.target.value })} /></Field>
            <Field label="Nom du père" htmlFor="pnm"><Input id="pnm" value={d.pereNom} onChange={(e) => set({ pereNom: e.target.value })} /></Field>
            <Field label="Prénom de la mère" htmlFor="mp"><Input id="mp" value={d.merePrenom} onChange={(e) => set({ merePrenom: e.target.value })} /></Field>
            <Field label="Nom de naissance de la mère" htmlFor="mnm"><Input id="mnm" value={d.mereNomNaissance} onChange={(e) => set({ mereNomNaissance: e.target.value })} /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Forme juridique" className="sm:col-span-2">
              <Choices name="forme" columns={3} value={d.forme} onChange={(v) => set({ forme: v })} options={(["micro", "ei", "sasu"] as const).map((k) => ({ value: k, label: FORME_INPI_LABEL[k] }))} />
            </Field>
            <Field label="Métier" htmlFor="met">
              <Select id="met" value={d.metier} onChange={(e) => set({ metier: e.target.value, ape: "" })}>
                <option value="">Choisissez…</option>
                {METIERS.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}
              </Select>
            </Field>
            <Field label="Date de début d'activité" htmlFor="deb"><Input id="deb" type="date" value={d.dateDebut} onChange={(e) => set({ dateDebut: e.target.value })} /></Field>
            <Field label="Description de l'activité" htmlFor="act" className="sm:col-span-2" hint="Soyez précis : c'est cette description que l'assureur décennale lira.">
              <Textarea id="act" value={d.activite} onChange={(e) => set({ activite: e.target.value })} placeholder={metier ? `Travaux de ${metier.accroche}` : ""} />
            </Field>
            <Field label={d.forme === "sasu" ? "Dénomination sociale" : "Nom commercial (facultatif)"} htmlFor="den" hint={d.forme === "sasu" ? "Le nom de la société, tel qu'il figure dans les statuts." : "Par défaut, vous exercez sous votre nom personnel."}>
              <Input id="den" value={d.denomination} onChange={(e) => set({ denomination: e.target.value })} />
            </Field>
            <Field label="Code APE indicatif" hint="Attribué définitivement par l'INSEE.">
              <p className="py-2.5 font-medium">{metier ? `${metier.ape} — ${metier.apeLabel}` : "—"}</p>
            </Field>
            {d.metier && metierReglemente(d.metier) && (
              <>
                <Field label="Qui détient la qualification ?" htmlFor="qp" hint="Métier réglementé : l'activité doit être exercée ou contrôlée par une personne qualifiée.">
                  <Select id="qp" value={d.qualifPar} onChange={(e) => set({ qualifPar: e.target.value as InpiData["qualifPar"] })}>
                    <option value="moi">Moi, le dirigeant</option>
                    <option value="salarie">Un salarié qualifié</option>
                  </Select>
                </Field>
                <Field label="Comment est-elle justifiée ?" htmlFor="qj">
                  <Select id="qj" value={d.qualifPreuve} onChange={(e) => set({ qualifPreuve: e.target.value as InpiData["qualifPreuve"] })}>
                    <option value="diplome">Diplôme ou titre du métier (CAP, BEP, BP…)</option>
                    <option value="experience">3 ans d'expérience dans le métier</option>
                  </Select>
                </Field>
                {d.qualifPar === "salarie" && (
                  <Field label="Nom et prénom du salarié qualifié" htmlFor="qn" className="sm:col-span-2">
                    <Input id="qn" value={d.qualifNom} onChange={(e) => set({ qualifNom: e.target.value })} />
                  </Field>
                )}
              </>
            )}
            {d.forme === "micro" ? (
              <Field label="Déclaration du chiffre d'affaires" htmlFor="per" hint="Vous pourrez changer plus tard sur autoentrepreneur.urssaf.fr.">
                <Select id="per" value={d.periodicite} onChange={(e) => set({ periodicite: e.target.value as InpiData["periodicite"] })}>
                  <option value="trimestrielle">Trimestrielle</option>
                  <option value="mensuelle">Mensuelle</option>
                </Select>
              </Field>
            ) : (
              <Field label="Régime de TVA" htmlFor="tva" hint="La franchise évite de facturer la TVA tant que vous restez sous le seuil ; à valider avec votre comptable.">
                <Select id="tva" value={d.tva} onChange={(e) => set({ tva: e.target.value as InpiData["tva"] })}>
                  <option value="franchise">Franchise en base de TVA</option>
                  <option value="reel">Réel simplifié (je facture la TVA)</option>
                </Select>
              </Field>
            )}
            {d.forme === "sasu" && (
              <>
                <Field label="Capital social (€)" htmlFor="cap" hint="1 € minimum, mais un capital crédible rassure banques et fournisseurs.">
                  <Input id="cap" inputMode="numeric" value={d.capital} onChange={(e) => set({ capital: e.target.value.replace(/[^\d]/g, "") })} />
                </Field>
                <Field label="Nature des apports" htmlFor="app">
                  <Select id="app" value={d.apports} onChange={(e) => set({ apports: e.target.value as InpiData["apports"] })}>
                    <option value="numeraire">Numéraire (argent)</option>
                    <option value="nature">En nature (matériel, véhicule…)</option>
                    <option value="mixte">Les deux</option>
                  </Select>
                </Field>
                <Field label="Clôture de l'exercice (jj/mm)" htmlFor="clo"><Input id="clo" value={d.cloture} onChange={(e) => set({ cloture: e.target.value })} /></Field>
                <Field label="Banque de dépôt du capital" htmlFor="bq"><Input id="bq" value={d.banque} onChange={(e) => set({ banque: e.target.value })} /></Field>
                <Notice tone="info" className="sm:col-span-2">
                  Avant le dépôt sur le Guichet unique : statuts signés, dépôt du capital et annonce légale. Un avocat ou un expert-comptable peut rédiger les statuts.
                </Notice>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem_1fr]">
            <Field label="Adresse du siège" htmlFor="adr" className="sm:col-span-3" hint="Elle sera publique au Registre national des entreprises.">
              <Input id="adr" value={d.adresse} onChange={(e) => set({ adresse: e.target.value })} autoComplete="street-address" />
            </Field>
            <Field label="Code postal" htmlFor="cp"><Input id="cp" inputMode="numeric" maxLength={5} value={d.codePostal} onChange={(e) => set({ codePostal: e.target.value })} /></Field>
            <Field label="Ville" htmlFor="vil" className="sm:col-span-2"><Input id="vil" value={d.ville} onChange={(e) => set({ ville: e.target.value })} /></Field>
            <Field label="Type de local" className="sm:col-span-3">
              <Choices name="local" columns={3} value={d.local} onChange={(v) => set({ local: v })} options={[{ value: "domicile", label: "Mon domicile" }, { value: "local_pro", label: "Un local professionnel" }, { value: "domiciliation", label: "Une société de domiciliation" }]} />
            </Field>
            {d.local === "domicile" && (
              <p className="text-[13px] text-encre-3 sm:col-span-3">
                Locataire ou en copropriété ? Vérifiez que le bail ou le règlement ne l'interdit pas. Sinon, la loi permet quand même d'y fixer l'adresse de
                l'entreprise pendant 5 ans (art. L123-11-1 du Code de commerce), sans y recevoir de clients ni y stocker de marchandises.
              </p>
            )}
            {d.local !== "domicile" && (
              <>
                <Field label="Votre adresse personnelle" htmlFor="adrp" className="sm:col-span-3" hint="Le Guichet unique la demande en plus de celle de l'entreprise.">
                  <Input id="adrp" value={d.adressePerso} onChange={(e) => set({ adressePerso: e.target.value })} />
                </Field>
                <Field label="Code postal" htmlFor="cpp"><Input id="cpp" inputMode="numeric" maxLength={5} value={d.codePostalPerso} onChange={(e) => set({ codePostalPerso: e.target.value })} /></Field>
                <Field label="Ville" htmlFor="vilp" className="sm:col-span-2"><Input id="vilp" value={d.villePerso} onChange={(e) => set({ villePerso: e.target.value })} /></Field>
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-3">
              {PIECES.filter((p) => !p.generee && (requises.includes(p.key) || files[p.key]?.length)).map((p) => (
                <div key={p.key} className="rounded-xl bg-papier p-4 shadow-[0_0_0_1px_rgb(11_18_32/0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {p.label} {requises.includes(p.key) && <span className="text-[13px] font-normal text-encre-3">(demandée)</span>}
                      </p>
                      <p className="text-[13px] text-encre-3">{aidePiece(p, d)}</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-papier px-3.5 py-2 text-[14px] font-semibold shadow-[0_0_0_1px_rgb(11_18_32/0.12),0_1px_2px_rgb(11_18_32/0.05)] transition-colors hover:bg-enduit">
                      <Upload className="h-4 w-4" aria-hidden /> Ajouter
                      <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(p.key, e.target.files[0])} />
                    </label>
                  </div>
                  {files[p.key]?.map((n) => (
                    <div key={n} className="mt-2 flex items-center gap-2 text-[14px]">
                      <FileText className="h-4 w-4 text-bleu" aria-hidden />
                      <span className="flex-1 truncate">{n.replace(/^\d+-/, "")}</span>
                      <button type="button" onClick={() => remove(p.key, n)} aria-label={`Supprimer ${n}`} className="p-1 text-encre-3 hover:text-rouge">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
              <p className="text-[13px] text-encre-3">
                La déclaration de non-condamnation et de filiation est pré-remplie dans le dossier : il vous restera à la dater et la signer. Vos photos
                sont converties en PDF, une pièce par fichier, comme le demande le Guichet unique.
              </p>
              <p className="text-[13px] text-encre-3">Fichiers stockés dans un espace privé, visibles par vous seul, effacés avec votre compte. PDF, JPEG ou PNG, 5 Mo maximum.</p>
            </div>
            {d.forme !== "sasu" && (
              <>
                <Checkbox id="acre" checked={d.acre} onChange={(v) => set({ acre: v })} label="Je compte demander l'ACRE" hint={`Réduction de ${ACRE.reductionMicro} % des cotisations en micro, à demander sous ${ACRE.delaiDemandeJours} jours. Conditions : ${ACRE.conditions[0].toLowerCase()}, moins de 26 ans, etc.`} />
                {d.forme === "micro" && (
                  <Checkbox id="vl" checked={d.versementLiberatoire} onChange={(v) => set({ versementLiberatoire: v })} label="Je choisis le versement libératoire de l'impôt" hint="Possible si le revenu fiscal de référence du foyer ne dépasse pas le plafond légal (vérifiez sur votre avis d'imposition)." />
                )}
              </>
            )}
            {vigilance.length > 0 && (
              <Notice tone="warn" title="À vérifier avant de déposer">
                <ul className="list-disc space-y-1 pl-5">
                  {vigilance.map((v) => <li key={v}>{v}</li>)}
                </ul>
              </Notice>
            )}
            <details className="rounded-xl bg-papier p-4 shadow-[0_0_0_1px_rgb(11_18_32/0.08)]">
              <summary className="cursor-pointer font-semibold">Aperçu de la fiche de saisie</summary>
              <div className="mt-4 space-y-5">
                {ficheSaisie(d).map((r) => (
                  <div key={r.titre}>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-bleu">{r.titre}</p>
                    <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-[14rem_1fr]">
                      {r.lignes.map((l) => (
                        <div key={l.q} className="contents">
                          <dt className="text-encre-3">{l.q}</dt>
                          <dd className="font-medium">{l.r}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-bleu">Coûts officiels</p>
                  <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-[1fr_auto]">
                    {coutsCreation(d.forme).map((c) => (
                      <div key={c.libelle} className="contents">
                        <dt className="text-encre-3">{c.libelle}</dt>
                        <dd className="font-medium">{c.montant}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </details>
            <Checkbox
              id="honneur"
              checked={d.honneur}
              onChange={(v) => set({ honneur: v })}
              label="J'ai compris que Bâtipro ne transmet rien à l'INPI : je vérifie ces informations et je fais moi-même la déclaration sur procedures.inpi.fr."
            />
          </div>
        )}

        <div className="flex justify-between border-t border-encre/10 pt-5">
          <Button variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Précédent
          </Button>
          {step < 3 ? (
            <Button onClick={() => { const e = valide(); if (e) toast.error(e); else setStep(step + 1); }}>Continuer</Button>
          ) : (
            <Button loading={busy} onClick={generer}>Générer mon dossier</Button>
          )}
        </div>
        {done && (
          <Notice tone="ok" title="Dossier généré">
            Le fichier .zip contient la fiche de saisie, la déclaration à signer et vos pièces en PDF. Il est aussi disponible depuis votre espace.
            Suivez les étapes à droite, puis rendez-vous sur{" "}
            <a href="https://procedures.inpi.fr" target="_blank" rel="noreferrer" className="font-semibold underline">procedures.inpi.fr</a>.
          </Notice>
        )}
      </Card>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-encre-3">Après le dossier</p>
        <ol className="relative space-y-5 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-encre/10">
          {etapesApres(d).map((e, i) => (
            <li key={e.titre} className="relative flex gap-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-papier text-[12.5px] font-semibold tabular-nums text-bleu shadow-[0_0_0_1px_rgb(47_91_234/0.25)]">{i + 1}</span>
              <span>
                <span className="block text-[14.5px] font-semibold">{e.titre}</span>
                <span className="block text-[13.5px] text-encre-2">{e.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
