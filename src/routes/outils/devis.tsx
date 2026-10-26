import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Plus, Trash2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Checkbox, Choices, Container, Field, Input, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import { Paywall, RequireAuth } from "@/components/layout";
import { seo } from "@/lib/seo";
import { ApiError, downloadPdf } from "@/lib/api";
import { storageDel, storageGet, storageSet } from "@/lib/utils";
import {
  DEVIS_VIDE,
  FORMES,
  MOYENS_PAIEMENT,
  TAUX_TVA_LIGNE,
  calculerTotaux,
  construireMentions,
  estIndividuelle,
  nomEmetteur,
  tauxParDefaut,
  verifierDevis,
  type DevisData,
  type FormeJuridique,
  type LigneDevis,
  type TauxTva,
} from "@rules/devis.ts";
import { NATURE_TRAVAUX_LABEL, PAIEMENT, TVA_FRANCHISE_PRESTATIONS, formatEuro, formatMontant, type NatureTravaux } from "@rules/reglementation.ts";

export const Route = createFileRoute("/outils/devis")({
  head: () =>
    seo({
      title: "Éditeur de devis BTP conforme",
      description:
        "Devis de travaux avec les mentions obligatoires 2026 : décennale, TVA 5,5 / 10 / 20 %, attestation client intégrée, déchets, médiateur, rétractation.",
      path: "/outils/devis",
    }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader
        planche="05 / 05"
        rubrique="Abonnement Pro"
        title="Éditeur de devis"
        intro="Les mentions légales s'ajoutent selon le client et le chantier. Les champs obligatoires bloquent la génération tant qu'ils manquent : vous ne pouvez pas envoyer un devis non conforme par oubli."
      />
      <Container className="py-10">
        <RequireAuth>
          <Paywall product="pro" description="Devis conformes en illimité, numérotation continue et archive de tous vos devis émis.">
            <Editeur />
          </Paywall>
        </RequireAuth>
      </Container>
    </>
  );
}

const KEY_DRAFT = "batipro.devis.brouillon.v2";
const KEY_EMETTEUR = "batipro.devis.emetteur.v2";
const EMETTEUR_KEYS = Object.keys(DEVIS_VIDE).filter((k) => k.startsWith("em_")) as (keyof DevisData)[];

async function resizeLogo(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 400 / img.width, 240 / img.height);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

function Editeur() {
  const [d, setD] = useState<DevisData>(DEVIS_VIDE);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dernier, setDernier] = useState<string | null>(null);
  const set = (patch: Partial<DevisData>) => setD((x) => ({ ...x, ...patch }));

  useEffect(() => {
    const em = storageGet<Partial<DevisData>>(KEY_EMETTEUR, {});
    setD({ ...storageGet(KEY_DRAFT, DEVIS_VIDE), ...em });
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    storageSet(KEY_DRAFT, d);
    storageSet(KEY_EMETTEUR, Object.fromEntries(EMETTEUR_KEYS.map((k) => [k, d[k]])));
  }, [d, loaded]);

  const totaux = useMemo(() => calculerTotaux(d), [d]);
  const problemes = useMemo(() => verifierDevis(d), [d]);
  const bloquants = problemes.filter((p) => p.bloquant);
  const mentions = useMemo(() => construireMentions(d), [d]);

  const setLigne = (i: number, patch: Partial<LigneDevis>) => set({ lignes: d.lignes.map((l, k) => (k === i ? { ...l, ...patch } : l)) });

  function changerNature(n: NatureTravaux) {
    const t = tauxParDefaut(n);
    set({ ch_nature: n, lignes: d.lignes.map((l) => ({ ...l, tva: t })) });
  }

  async function generer() {
    if (bloquants.length) {
      toast.error(`${bloquants.length} mention${bloquants.length > 1 ? "s" : ""} obligatoire${bloquants.length > 1 ? "s" : ""} manquante${bloquants.length > 1 ? "s" : ""}.`);
      document.getElementById("controle")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBusy(true);
    try {
      const { numero } = await downloadPdf("generate-devis-pdf", { devis: d }, "devis.pdf");
      setDernier(numero ?? "");
      toast.success(`Devis ${numero ?? ""} généré et archivé`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Génération impossible.");
    } finally {
      setBusy(false);
    }
  }

  function nouveauDevis() {
    const em = Object.fromEntries(EMETTEUR_KEYS.map((k) => [k, d[k]]));
    storageDel(KEY_DRAFT);
    setD({ ...DEVIS_VIDE, ...em });
    setDernier(null);
    window.scrollTo({ top: 0 });
  }

  const individuelle = estIndividuelle(d.em_forme);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card className="space-y-4">
          <h2 className="display text-3xl">Votre entreprise</h2>
          <p className="text-[14px] text-ardoise-3">Mémorisé sur cet appareil pour vos prochains devis.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom ou raison sociale" htmlFor="em_nom" hint={individuelle ? `Apparaîtra comme « ${nomEmetteur(d) || "Nom EI"} » (mention EI obligatoire).` : undefined}>
              <Input id="em_nom" value={d.em_nom} onChange={(e) => set({ em_nom: e.target.value })} />
            </Field>
            <Field label="Forme juridique" htmlFor="em_forme">
              <Select id="em_forme" value={d.em_forme} onChange={(e) => set({ em_forme: e.target.value as FormeJuridique })}>
                {FORMES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Select>
            </Field>
            <Field label="Adresse du siège" htmlFor="em_adresse" className="sm:col-span-2"><Input id="em_adresse" value={d.em_adresse} onChange={(e) => set({ em_adresse: e.target.value })} /></Field>
            <Field label="SIREN ou SIRET" htmlFor="em_siret" hint="Sur votre avis de situation INSEE ou annuaire-entreprises.data.gouv.fr."><Input id="em_siret" value={d.em_siret} onChange={(e) => set({ em_siret: e.target.value })} /></Field>
            <Field label="Immatriculation (facultatif)" htmlFor="em_imm" hint="Ex. : RCS Orléans, ou « Inscrit au RNE »."><Input id="em_imm" value={d.em_immatriculation} onChange={(e) => set({ em_immatriculation: e.target.value })} /></Field>
            {!individuelle && <Field label="Capital social (€)" htmlFor="em_cap"><Input id="em_cap" value={d.em_capital} onChange={(e) => set({ em_capital: e.target.value })} /></Field>}
            <Field label="Téléphone" htmlFor="em_tel"><Input id="em_tel" type="tel" value={d.em_tel} onChange={(e) => set({ em_tel: e.target.value })} /></Field>
            <Field label="Email" htmlFor="em_email"><Input id="em_email" type="email" value={d.em_email} onChange={(e) => set({ em_email: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Checkbox
                id="franchise"
                checked={d.em_franchise}
                onChange={(v) => set({ em_franchise: v })}
                label="Je bénéficie de la franchise en base de TVA"
                hint={`Prestations : chiffre d'affaires de l'année précédente sous ${formatMontant(TVA_FRANCHISE_PRESTATIONS.base)} et de l'année en cours sous ${formatMontant(TVA_FRANCHISE_PRESTATIONS.majore)}.`}
              />
            </div>
            {!d.em_franchise && <Field label="N° de TVA intracommunautaire" htmlFor="em_tva"><Input id="em_tva" value={d.em_tva_intra} onChange={(e) => set({ em_tva_intra: e.target.value })} placeholder="FR00 123456789" /></Field>}
            <Field label="Qualification (facultatif)" htmlFor="em_q" hint="RGE, Qualibat… indispensable pour que votre client touche MaPrimeRénov'."><Input id="em_q" value={d.em_qualification} onChange={(e) => set({ em_qualification: e.target.value })} /></Field>
          </div>
          <div className="border-t border-ardoise/10 pt-4">
            <p className="font-semibold">Assurance décennale</p>
            <p className="text-[13px] text-ardoise-3">Recopiez votre attestation : ces quatre informations sont obligatoires sur chaque devis.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Assureur" htmlFor="as_n"><Input id="as_n" value={d.em_assureur_nom} onChange={(e) => set({ em_assureur_nom: e.target.value })} /></Field>
              <Field label="Adresse de l'assureur" htmlFor="as_a"><Input id="as_a" value={d.em_assureur_adresse} onChange={(e) => set({ em_assureur_adresse: e.target.value })} /></Field>
              <Field label="N° de contrat" htmlFor="as_p"><Input id="as_p" value={d.em_assureur_police} onChange={(e) => set({ em_assureur_police: e.target.value })} /></Field>
              <Field label="Couverture géographique" htmlFor="as_z"><Input id="as_z" value={d.em_assureur_zone} onChange={(e) => set({ em_assureur_zone: e.target.value })} /></Field>
            </div>
          </div>
          <div className="border-t border-ardoise/10 pt-4">
            <p className="font-semibold">Médiateur de la consommation</p>
            <p className="text-[13px] text-ardoise-3">Obligatoire face à un particulier. Adhésion via votre fédération (CAPEB, FFB) ou un médiateur agréé par la CECMC.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Nom du médiateur" htmlFor="me_n"><Input id="me_n" value={d.em_mediateur_nom} onChange={(e) => set({ em_mediateur_nom: e.target.value })} /></Field>
              <Field label="Site internet" htmlFor="me_s"><Input id="me_s" value={d.em_mediateur_site} onChange={(e) => set({ em_mediateur_site: e.target.value })} /></Field>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-ardoise/10 pt-4">
            {d.em_logo_dataurl && <img src={d.em_logo_dataurl} alt="Logo" className="h-12 rounded-sm ring-1 ring-ardoise/10" />}
            <label className="cursor-pointer rounded-sm border border-ardoise/20 px-3 py-2 text-[14px] font-semibold hover:border-ardoise/50">
              {d.em_logo_dataurl ? "Changer le logo" : "Ajouter mon logo"}
              <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set({ em_logo_dataurl: await resizeLogo(f) }); }} />
            </label>
            {d.em_logo_dataurl && <Button variant="ghost" onClick={() => set({ em_logo_dataurl: "" })}>Retirer</Button>}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="display text-3xl">Le client</h2>
          <Choices name="cl_type" value={d.cl_type} onChange={(v) => set({ cl_type: v })} options={[{ value: "particulier", label: "Particulier" }, { value: "pro", label: "Professionnel" }]} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.cl_type === "pro" ? "Raison sociale" : "Nom et prénom"} htmlFor="cl_nom"><Input id="cl_nom" value={d.cl_nom} onChange={(e) => set({ cl_nom: e.target.value })} /></Field>
            {d.cl_type === "pro" && <Field label="SIRET du client" htmlFor="cl_siret"><Input id="cl_siret" value={d.cl_siret} onChange={(e) => set({ cl_siret: e.target.value })} /></Field>}
            <Field label="Adresse" htmlFor="cl_adr" className="sm:col-span-2"><Input id="cl_adr" value={d.cl_adresse} onChange={(e) => set({ cl_adresse: e.target.value })} /></Field>
            <Field label="Email" htmlFor="cl_em"><Input id="cl_em" type="email" value={d.cl_email} onChange={(e) => set({ cl_email: e.target.value })} /></Field>
            <Field label="Téléphone" htmlFor="cl_tel"><Input id="cl_tel" value={d.cl_tel} onChange={(e) => set({ cl_tel: e.target.value })} /></Field>
          </div>
          {d.cl_type === "particulier" && (
            <Checkbox
              id="hors"
              checked={d.cl_hors_etablissement}
              onChange={(v) => set({ cl_hors_etablissement: v })}
              label="Devis signé chez le client, sur un salon ou après un démarchage"
              hint="Le client dispose alors de 14 jours de rétractation : le formulaire est ajouté au PDF. Pas concerné si le client vous a fait venir pour un devis puis le signe ailleurs."
            />
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="display text-3xl">Le chantier</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Intitulé des travaux" htmlFor="ch_i" className="sm:col-span-2"><Input id="ch_i" value={d.ch_intitule} onChange={(e) => set({ ch_intitule: e.target.value })} placeholder="Ex. : Réfection peinture séjour et couloir" /></Field>
            <Field label="Adresse du chantier" htmlFor="ch_a" className="sm:col-span-2" hint="Vide = adresse du client."><Input id="ch_a" value={d.ch_adresse} onChange={(e) => set({ ch_adresse: e.target.value })} /></Field>
            <Field label="Nature des locaux (fixe le taux de TVA)" htmlFor="ch_n" className="sm:col-span-2">
              <Select id="ch_n" value={d.ch_nature} onChange={(e) => changerNature(e.target.value as NatureTravaux)}>
                {(Object.keys(NATURE_TRAVAUX_LABEL) as NatureTravaux[]).map((k) => <option key={k} value={k}>{NATURE_TRAVAUX_LABEL[k]}</option>)}
              </Select>
            </Field>
            <Field label="Début prévu" htmlFor="ch_d"><Input id="ch_d" type="date" value={d.ch_debut} onChange={(e) => set({ ch_debut: e.target.value })} /></Field>
            <Field label="Durée estimée" htmlFor="ch_du"><Input id="ch_du" value={d.ch_duree} onChange={(e) => set({ ch_duree: e.target.value })} placeholder="Ex. : 5 jours ouvrés" /></Field>
          </div>
          {(d.ch_nature === "reno" || d.ch_nature === "energie") && !d.em_franchise && (
            <Notice tone="info" title="Plus de CERFA à faire remplir">
              Depuis le 16 février 2025, l'attestation de TVA réduite est remplacée par une mention que le client certifie en signant le devis. Elle est ajoutée automatiquement.
            </Notice>
          )}
        </Card>

        <Card className="space-y-4">
          <h2 className="display text-3xl">Prestations</h2>
          <div className="space-y-3">
            {d.lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-sm bg-beton/50 p-3 sm:grid-cols-[1fr_5rem_5.5rem_6.5rem_5.5rem_auto] sm:items-end">
                <Field label="Désignation" htmlFor={`l${i}d`} className="col-span-2 sm:col-span-1">
                  <Textarea id={`l${i}d`} className="min-h-0" rows={2} value={l.designation} onChange={(e) => setLigne(i, { designation: e.target.value })} />
                </Field>
                <Field label="Qté" htmlFor={`l${i}q`}><Input id={`l${i}q`} inputMode="decimal" value={l.quantite} onChange={(e) => setLigne(i, { quantite: Number(e.target.value.replace(",", ".")) || 0 })} /></Field>
                <Field label="Unité" htmlFor={`l${i}u`}><Input id={`l${i}u`} value={l.unite} onChange={(e) => setLigne(i, { unite: e.target.value })} /></Field>
                <Field label="PU HT (€)" htmlFor={`l${i}p`}><Input id={`l${i}p`} inputMode="decimal" value={l.prixUnitaireHT} onChange={(e) => setLigne(i, { prixUnitaireHT: Number(e.target.value.replace(",", ".")) || 0 })} /></Field>
                <Field label="TVA" htmlFor={`l${i}t`}>
                  <Select id={`l${i}t`} disabled={d.em_franchise} value={l.tva} onChange={(e) => setLigne(i, { tva: Number(e.target.value) as TauxTva })}>
                    {TAUX_TVA_LIGNE.map((t) => <option key={t} value={t}>{String(t).replace(".", ",")} %</option>)}
                  </Select>
                </Field>
                <Button variant="ghost" aria-label={`Supprimer la ligne ${i + 1}`} onClick={() => set({ lignes: d.lignes.filter((_, k) => k !== i) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="secondary" onClick={() => set({ lignes: [...d.lignes, { designation: "", unite: "u", quantite: 1, prixUnitaireHT: 0, tva: tauxParDefaut(d.ch_nature) }] })}>
            <Plus className="h-4 w-4" aria-hidden /> Ajouter une ligne
          </Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="display text-3xl">Déchets de chantier</h2>
          <p className="text-[14px] text-ardoise-2">Mention obligatoire sur les devis de construction, rénovation et démolition depuis le 1er juillet 2021.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantité estimée" htmlFor="de_q"><Input id="de_q" value={d.de_quantite} onChange={(e) => set({ de_quantite: e.target.value })} placeholder="Ex. : 0,5 m³ ou 200 kg" /></Field>
            <Field label="Coût de gestion estimé (€ HT)" htmlFor="de_c"><Input id="de_c" inputMode="decimal" value={d.de_cout} onChange={(e) => set({ de_cout: Number(e.target.value.replace(",", ".")) || 0 })} /></Field>
            <Field label="Point de collecte" htmlFor="de_p" className="sm:col-span-2" hint="Nom, adresse et type d'installation (déchèterie professionnelle, centre de tri…)."><Input id="de_p" value={d.de_point_collecte} onChange={(e) => set({ de_point_collecte: e.target.value })} /></Field>
            <Field label="Modalités de tri et d'évacuation" htmlFor="de_m" className="sm:col-span-2"><Textarea id="de_m" value={d.de_modalites} onChange={(e) => set({ de_modalites: e.target.value })} /></Field>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="display text-3xl">Conditions</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Acompte (%)" htmlFor="co_a" hint="Souvent 20 à 30 %."><Input id="co_a" inputMode="numeric" value={d.co_acompte_pct} onChange={(e) => set({ co_acompte_pct: Number(e.target.value) || 0 })} /></Field>
            <Field label="Validité (jours)" htmlFor="co_v"><Input id="co_v" inputMode="numeric" value={d.co_validite_jours} onChange={(e) => set({ co_validite_jours: Number(e.target.value) || 30 })} /></Field>
            <Field label="Délai de paiement (jours)" htmlFor="co_d" hint={d.cl_type === "pro" ? `${PAIEMENT.delaiMaxB2BJours} jours maximum entre pros.` : "0 = solde à réception des travaux."}>
              <Input id="co_d" inputMode="numeric" value={d.co_delai_paiement_jours} onChange={(e) => set({ co_delai_paiement_jours: Number(e.target.value) || 0 })} />
            </Field>
          </div>
          <Field label="Moyens de paiement acceptés">
            <div className="flex flex-wrap gap-x-5">
              {MOYENS_PAIEMENT.map((m) => (
                <Checkbox key={m.value} id={`mp-${m.value}`} label={m.label} checked={d.co_moyens.includes(m.value)} onChange={(on) => set({ co_moyens: on ? [...d.co_moyens, m.value] : d.co_moyens.filter((x) => x !== m.value) })} />
              ))}
            </div>
          </Field>
          <Checkbox id="gratuit" checked={d.co_devis_gratuit} onChange={(v) => set({ co_devis_gratuit: v })} label="Devis gratuit" />
          <Field label="Précisions (accès, fournitures du client, horaires…)" htmlFor="co_n"><Textarea id="co_n" value={d.co_notes} onChange={(e) => set({ co_notes: e.target.value })} /></Field>
        </Card>

        <Card>
          <details>
            <summary className="cursor-pointer font-semibold">Voir les {mentions.length} mentions qui seront imprimées</summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13.5px] text-ardoise-2">
              {mentions.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </details>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="space-y-4">
          <div className="space-y-1.5 text-[14.5px]">
            <Row k="Total HT" v={formatEuro(totaux.totalHT)} />
            {d.em_franchise ? <p className="text-[13px] text-ardoise-3">TVA non applicable (art. 293 B CGI)</p> : totaux.tvaParTaux.map((t) => <Row key={t.taux} k={`TVA ${String(t.taux).replace(".", ",")} %`} v={formatEuro(t.montant)} />)}
            <div className="border-t border-ardoise/10 pt-2"><Row k="Total TTC" v={formatEuro(totaux.totalTTC)} strong /></div>
            {totaux.acompte > 0 && <Row k={`Acompte ${d.co_acompte_pct} %`} v={formatEuro(totaux.acompte)} />}
          </div>
          <div id="controle" className="border-t border-ardoise/10 pt-4">
            <p className="flex items-center gap-2 font-semibold">
              {bloquants.length === 0 ? <CheckCircle2 className="h-5 w-5 text-vert" aria-hidden /> : <XCircle className="h-5 w-5 text-rouge" aria-hidden />}
              {bloquants.length === 0 ? "Mentions obligatoires complètes" : `${bloquants.length} mention${bloquants.length > 1 ? "s" : ""} à compléter`}
            </p>
            <ul className="mt-2 space-y-1 text-[13.5px]">
              {problemes.map((p) => (
                <li key={p.message} className={`flex gap-1.5 ${p.bloquant ? "text-rouge" : "text-[#8a3d06]"}`}>
                  {p.bloquant ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
                  {p.message}
                </li>
              ))}
            </ul>
          </div>
          <Button className="w-full" loading={busy} onClick={generer}>Générer le devis PDF</Button>
          {dernier !== null && (
            <div className="space-y-2 text-[13.5px]">
              <Notice tone="ok">Devis {dernier} archivé. <Link to="/espace" className="font-semibold underline">Voir mes devis</Link></Notice>
              <Button variant="secondary" className="w-full" onClick={nouveauDevis}>Nouveau devis</Button>
            </div>
          )}
          <p className="text-[12.5px] text-ardoise-3">Chaque génération crée un nouveau numéro, conservé dans votre espace.</p>
        </Card>
      </aside>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={strong ? "font-semibold" : "text-ardoise-2"}>{k}</span>
      <span className={`tabular-nums ${strong ? "display text-2xl" : ""}`}>{v}</span>
    </div>
  );
}
