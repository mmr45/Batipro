import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowDown, ArrowUp, Check, CheckCircle2, ChevronDown, Copy, Eye, Library, Plus, Search, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Card, Checkbox, Choices, Container, Field, Input, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import { Paywall, RequireAuth } from "@/components/layout";
import { ApercuDevis } from "@/components/apercu-devis";
import { seo } from "@/lib/seo";
import { ApiError, downloadPdf } from "@/lib/api";
import { cn, storageDel, storageGet, storageSet } from "@/lib/utils";
import {
  DEVIS_VIDE,
  FORMES,
  MOYENS_PAIEMENT,
  TAUX_TVA_LIGNE,
  appliquerModele,
  calculerTotaux,
  construireMentions,
  estIndividuelle,
  nomEmetteur,
  tauxPourLigne,
  totalLigne,
  verifierDevis,
  type DevisData,
  type FormeJuridique,
  type LigneDevis,
  type TauxTva,
} from "@rules/devis.ts";
import { METIERS, getMetier } from "@rules/metiers.ts";
import { MODELES_PAR_METIER, bibliotheque, mentionsMetier, modelesMetier, totalModeleHT, type LigneModele } from "@rules/modeles-devis.ts";
import { NATURE_TRAVAUX_LABEL, PAIEMENT, TVA_FRANCHISE_PRESTATIONS, formatEuro, formatMontant, type NatureTravaux } from "@rules/reglementation.ts";

export const Route = createFileRoute("/outils/devis")({
  head: () =>
    seo({
      title: "Éditeur de devis BTP par métier",
      description:
        "Devis préremplis pour chaque métier du bâtiment (électricien, plombier, maçon, peintre…) avec les mentions obligatoires 2026 : décennale, TVA 5,5 / 10 / 20 %, normes du métier, déchets, médiateur.",
      path: "/outils/devis",
    }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader
        etape={5}
        rubrique="Abonnement Pro"
        title="Éditeur de devis"
        intro="Choisissez votre métier : le devis se remplit tout seul avec les prestations, les unités, la TVA et les mentions légales de votre activité. Ajustez vos prix, vérifiez l'aperçu, générez le PDF."
      />
      <Container className="py-10 sm:py-14">
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

const UNITES = ["u", "forfait", "m²", "ml", "m³", "h", "j", "kg", "ens."];

const signature = (ls: Pick<LigneDevis, "designation" | "quantite" | "prixUnitaireHT" | "unite">[]) =>
  ls.map((l) => `${l.designation}|${l.quantite}|${l.prixUnitaireHT}|${l.unite}`).join("\n");

/** Lignes d'origine (devis vierge ou modèle) : on peut les remplacer sans rien perdre. */
const SIGNATURES_MODELES = new Set([
  signature(DEVIS_VIDE.lignes),
  "",
  ...Object.values(MODELES_PAR_METIER).flatMap((m) => m.modeles.map((x) => signature(x.lignes))),
]);
const lignesIntactes = (ls: LigneDevis[]) => SIGNATURES_MODELES.has(signature(ls));

const ETAPES_DEVIS = [
  { id: "metier", label: "Métier" },
  { id: "entreprise", label: "Entreprise" },
  { id: "client", label: "Client" },
  { id: "chantier", label: "Chantier" },
  { id: "prestations", label: "Prestations" },
  { id: "dechets", label: "Déchets" },
  { id: "conditions", label: "Conditions" },
] as const;
type EtapeId = (typeof ETAPES_DEVIS)[number]["id"];

function Editeur() {
  const [d, setD] = useState<DevisData>(DEVIS_VIDE);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dernier, setDernier] = useState<string | null>(null);
  const [apercu, setApercu] = useState(false);
  const [entrepriseOuverte, setEntrepriseOuverte] = useState(true);
  const [modeleActif, setModeleActif] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const set = (patch: Partial<DevisData>) => setD((x) => ({ ...x, ...patch }));

  useEffect(() => {
    const em = storageGet<Partial<DevisData>>(KEY_EMETTEUR, {});
    const init = { ...storageGet(KEY_DRAFT, DEVIS_VIDE), ...em };
    setD(init);
    // Entreprise déjà renseignée : on la replie pour aller droit au devis.
    if (!verifierDevis(init).some((p) => p.bloquant && p.champ.startsWith("em_"))) setEntrepriseOuverte(false);
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
  const mentionsDuMetier = useMemo(() => mentionsMetier(d), [d]);
  const ref = modelesMetier(d.em_metier);
  const metier = getMetier(d.em_metier);

  const faites: Record<EtapeId, boolean> = {
    metier: !!d.em_metier,
    entreprise: !bloquants.some((p) => p.champ.startsWith("em_")),
    client: !bloquants.some((p) => p.champ.startsWith("cl_")),
    chantier: !!d.ch_intitule.trim(),
    prestations: d.lignes.length > 0 && d.lignes.every((l) => l.designation.trim()),
    dechets: !!d.de_point_collecte.trim(),
    conditions: true,
  };
  const nbFaites = Object.values(faites).filter(Boolean).length;

  const setLigne = (i: number, patch: Partial<LigneDevis>) => set({ lignes: d.lignes.map((l, k) => (k === i ? { ...l, ...patch } : l)) });
  const deplacer = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= d.lignes.length) return;
    const ls = [...d.lignes];
    [ls[i], ls[j]] = [ls[j], ls[i]];
    set({ lignes: ls });
  };

  function changerNature(n: NatureTravaux) {
    set({ ch_nature: n, lignes: d.lignes.map((l) => ({ ...l, tva: tauxPourLigne(n, l) })) });
  }

  /** Applique un modèle du métier ; demande confirmation si l'artisan a déjà modifié ses lignes. */
  function choisirModele(slug: string, modeleId?: string) {
    const nom = modelesMetier(slug)?.modeles.find((m) => m.id === modeleId)?.label ?? modelesMetier(slug)?.modeles[0]?.label;
    const appliquer = () => {
      setD((x) => appliquerModele(x, slug, modeleId));
      setModeleActif(modeleId ?? modelesMetier(slug)?.modeles[0]?.id ?? null);
    };
    if (!slug) return set({ em_metier: "" });
    if (lignesIntactes(d.lignes)) {
      appliquer();
      if (nom) toast.success(`Devis prérempli : ${nom}`, { description: "Ajustez les quantités et vos prix." });
    } else {
      set({ em_metier: slug });
      toast(`Remplacer vos ${d.lignes.length} lignes par le modèle « ${nom} » ?`, {
        description: "Vos prestations actuelles seront remplacées. L'entreprise et le client sont conservés.",
        action: { label: "Remplacer", onClick: appliquer },
        duration: 10_000,
      });
    }
  }

  function ajouterPrestation(l: LigneModele) {
    set({
      lignes: [
        ...d.lignes,
        { designation: l.designation, unite: l.unite, quantite: l.quantite, prixUnitaireHT: l.prixUnitaireHT, tva: tauxPourLigne(d.ch_nature, l), ...(l.energie ? { energie: true } : {}) },
      ],
    });
    toast.success("Prestation ajoutée");
  }

  async function generer() {
    if (bloquants.length) {
      toast.error(`${bloquants.length} mention${bloquants.length > 1 ? "s" : ""} obligatoire${bloquants.length > 1 ? "s" : ""} manquante${bloquants.length > 1 ? "s" : ""}.`);
      setApercu(false);
      if (bloquants.some((p) => p.champ.startsWith("em_"))) setEntrepriseOuverte(true);
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
    const em = Object.fromEntries(EMETTEUR_KEYS.map((k) => [k, d[k]])) as Partial<DevisData>;
    storageDel(KEY_DRAFT);
    const vierge = { ...DEVIS_VIDE, ...em };
    setD(em.em_metier ? appliquerModele(vierge, em.em_metier) : vierge);
    setModeleActif(null);
    setDernier(null);
    window.scrollTo({ top: 0 });
  }

  const individuelle = estIndividuelle(d.em_forme);
  const biblio = useMemo(() => {
    const toutes = bibliotheque(d.em_metier);
    const q = recherche.trim().toLowerCase();
    const deja = new Set(d.lignes.map((l) => l.designation));
    return (q ? toutes.filter((l) => l.designation.toLowerCase().includes(q)) : toutes).filter((l) => !deja.has(l.designation));
  }, [d.em_metier, d.lignes, recherche]);
  const aDesLignesEnergie = d.lignes.some((l) => l.energie);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="min-w-0 space-y-6">
        <nav aria-label="Étapes du devis" className="sticky top-16 z-20 -mx-1 overflow-x-auto rounded-2xl bg-enduit/85 px-1 py-2 backdrop-blur">
          <ol className="flex min-w-max gap-1.5">
            {ETAPES_DEVIS.map((e, i) => (
              <li key={e.id}>
                <a
                  href={`#${e.id}`}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                    faites[e.id] ? "bg-vert-pale text-vert" : "bg-papier text-encre-2 shadow-[0_0_0_1px_rgb(11_18_32/0.08)] hover:text-encre",
                  )}
                >
                  {faites[e.id] ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span className="ref !text-[11px]">{i + 1}</span>}
                  {e.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Etape id="metier" n={1} titre="Votre métier" fait={faites.metier}>
          <p className="text-[14px] text-encre-2">Le devis se remplit tout seul : prestations types, unités, TVA et mentions légales propres à votre activité. Mémorisé pour vos prochains devis.</p>
          <Field label="Métier" htmlFor="em_metier">
            <Select id="em_metier" value={d.em_metier} onChange={(e) => choisirModele(e.target.value)}>
              <option value="">Choisir votre métier…</option>
              {METIERS.map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}
            </Select>
          </Field>
          {ref && (
            <div className="space-y-2.5">
              <p className="text-[14px] font-semibold">Type de chantier</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {ref.modeles.map((m) => {
                  const actif = modeleActif === m.id || (!modeleActif && signature(m.lignes) === signature(d.lignes));
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => choisirModele(d.em_metier, m.id)}
                      className={cn(
                        "flex flex-col items-start rounded-xl bg-papier px-4 py-3 text-left transition-[box-shadow,background-color]",
                        actif
                          ? "bg-bleu-pale/40 shadow-[0_0_0_1.5px_var(--color-bleu),0_0_0_5px_rgb(47_91_234/0.10)]"
                          : "shadow-[0_0_0_1px_rgb(11_18_32/0.1),0_1px_2px_rgb(11_18_32/0.04)] hover:shadow-[0_0_0_1px_rgb(11_18_32/0.22)]",
                      )}
                    >
                      <span className="font-semibold">{m.label}</span>
                      <span className="text-[12.5px] text-encre-3">
                        {m.lignes.length} prestations · ≈ {formatEuro(totalModeleHT(m), 0)} HT
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[12.5px] text-encre-3">Prix indicatifs 2026 à ajuster à vos tarifs.</p>
              {mentionsDuMetier.length > 0 && (
                <Notice tone="ok" title={`${mentionsDuMetier.length} mention${mentionsDuMetier.length > 1 ? "s" : ""} propre${mentionsDuMetier.length > 1 ? "s" : ""} au métier ${metier?.label.toLowerCase() ?? ""}`}>
                  Normes, certificats et autorisations ajoutés automatiquement selon les prestations du devis.
                </Notice>
              )}
            </div>
          )}
        </Etape>

        <Etape
          id="entreprise"
          n={2}
          titre="Votre entreprise"
          fait={faites.entreprise}
          action={
            <Button variant="ghost" size="sm" onClick={() => setEntrepriseOuverte((o) => !o)} aria-expanded={entrepriseOuverte}>
              {entrepriseOuverte ? "Replier" : "Modifier"} <ChevronDown className={cn("h-4 w-4 transition-transform", entrepriseOuverte && "rotate-180")} aria-hidden />
            </Button>
          }
        >
          {!entrepriseOuverte ? (
            <div className="flex items-center gap-3 text-[14px]">
              {d.em_logo_dataurl && <img src={d.em_logo_dataurl} alt="" className="h-10 rounded-md ring-1 ring-encre/10" />}
              <div className="min-w-0">
                <p className="font-semibold">{nomEmetteur(d) || "Entreprise à compléter"}</p>
                <p className="truncate text-encre-3">{[d.em_siret && `SIRET ${d.em_siret}`, d.em_assureur_nom && `Décennale ${d.em_assureur_nom}`].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          ) : (
            <>
          <p className="text-[14px] text-encre-3">Mémorisé sur cet appareil pour vos prochains devis.</p>
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
          <div className="border-t border-encre/10 pt-4">
            <p className="font-semibold">Assurance décennale</p>
            <p className="text-[13px] text-encre-3">
              Recopiez votre attestation : ces quatre informations sont obligatoires sur chaque devis.
              {ref && ref.activiteAssurance && d.em_metier !== "autre" && <> Vérifiez qu'elle couvre bien l'activité « {ref.activiteAssurance} ».</>}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Assureur" htmlFor="as_n"><Input id="as_n" value={d.em_assureur_nom} onChange={(e) => set({ em_assureur_nom: e.target.value })} /></Field>
              <Field label="Adresse de l'assureur" htmlFor="as_a"><Input id="as_a" value={d.em_assureur_adresse} onChange={(e) => set({ em_assureur_adresse: e.target.value })} /></Field>
              <Field label="N° de contrat" htmlFor="as_p"><Input id="as_p" value={d.em_assureur_police} onChange={(e) => set({ em_assureur_police: e.target.value })} /></Field>
              <Field label="Couverture géographique" htmlFor="as_z"><Input id="as_z" value={d.em_assureur_zone} onChange={(e) => set({ em_assureur_zone: e.target.value })} /></Field>
            </div>
          </div>
          <div className="border-t border-encre/10 pt-4">
            <p className="font-semibold">Médiateur de la consommation</p>
            <p className="text-[13px] text-encre-3">Obligatoire face à un particulier. Adhésion via votre fédération (CAPEB, FFB) ou un médiateur agréé par la CECMC.</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Nom du médiateur" htmlFor="me_n"><Input id="me_n" value={d.em_mediateur_nom} onChange={(e) => set({ em_mediateur_nom: e.target.value })} /></Field>
              <Field label="Site internet" htmlFor="me_s"><Input id="me_s" value={d.em_mediateur_site} onChange={(e) => set({ em_mediateur_site: e.target.value })} /></Field>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-encre/10 pt-4">
            {d.em_logo_dataurl && <img src={d.em_logo_dataurl} alt="Logo" className="h-12 rounded-lg ring-1 ring-encre/10" />}
            <label className="cursor-pointer rounded-[10px] bg-papier px-3.5 py-2 text-[14px] font-semibold shadow-[0_0_0_1px_rgb(11_18_32/0.12),0_1px_2px_rgb(11_18_32/0.05)] transition-colors hover:bg-enduit">
              {d.em_logo_dataurl ? "Changer le logo" : "Ajouter mon logo"}
              <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set({ em_logo_dataurl: await resizeLogo(f) }); }} />
            </label>
            {d.em_logo_dataurl && <Button variant="ghost" onClick={() => set({ em_logo_dataurl: "" })}>Retirer</Button>}
          </div>
            </>
          )}
        </Etape>

        <Etape id="client" n={3} titre="Le client" fait={faites.client}>
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
        </Etape>

        <Etape id="chantier" n={4} titre="Le chantier" fait={faites.chantier}>
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
          {d.ch_nature === "reno" && aDesLignesEnergie && !d.em_franchise && (
            <Notice tone="info" title="TVA 5,5 % sur les travaux d'économie d'énergie">
              Les prestations marquées « 5,5 % » (isolation, pompe à chaleur, fenêtres performantes…) passent automatiquement au taux réduit ; le reste du chantier est à 10 %.
            </Notice>
          )}
          {(d.ch_nature === "reno" || d.ch_nature === "energie") && !d.em_franchise && (
            <Notice tone="info" title="Plus de CERFA à faire remplir">
              Depuis le 16 février 2025, l'attestation de TVA réduite est remplacée par une mention que le client certifie en signant le devis. Elle est ajoutée automatiquement.
            </Notice>
          )}
        </Etape>

        <Etape id="prestations" n={5} titre="Prestations" fait={faites.prestations}>
          <datalist id="unites">{UNITES.map((u) => <option key={u} value={u} />)}</datalist>
          {d.lignes.length === 0 && <p className="rounded-xl bg-enduit/70 p-4 text-[14px] text-encre-3">Aucune prestation. Choisissez un type de chantier ou piochez dans la bibliothèque.</p>}
          <ol className="space-y-3">
            {d.lignes.map((l, i) => (
              <li key={i} className="rounded-xl bg-enduit/70 p-3.5 shadow-[inset_0_0_0_1px_rgb(11_18_32/0.04)]">
                <div className="flex items-start gap-2.5">
                  <span className="ref mt-2.5 w-5 shrink-0 text-center !text-[12px]">{i + 1}</span>
                  <Field label="Désignation" htmlFor={`l${i}d`} className="min-w-0 flex-1">
                    <Textarea id={`l${i}d`} className="min-h-0" rows={2} value={l.designation} onChange={(e) => setLigne(i, { designation: e.target.value })} />
                  </Field>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 pl-7 sm:grid-cols-[4.5rem_6rem_6.5rem_5.5rem_1fr] sm:items-end">
                  <Field label="Qté" htmlFor={`l${i}q`}><Input id={`l${i}q`} inputMode="decimal" value={l.quantite} onChange={(e) => setLigne(i, { quantite: Number(e.target.value.replace(",", ".")) || 0 })} /></Field>
                  <Field label="Unité" htmlFor={`l${i}u`}><Input id={`l${i}u`} list="unites" value={l.unite} onChange={(e) => setLigne(i, { unite: e.target.value })} /></Field>
                  <Field label="PU HT (€)" htmlFor={`l${i}p`}><Input id={`l${i}p`} inputMode="decimal" value={l.prixUnitaireHT} onChange={(e) => setLigne(i, { prixUnitaireHT: Number(e.target.value.replace(",", ".")) || 0 })} /></Field>
                  <Field label="TVA" htmlFor={`l${i}t`}>
                    <Select id={`l${i}t`} disabled={d.em_franchise} value={l.tva} onChange={(e) => setLigne(i, { tva: Number(e.target.value) as TauxTva })}>
                      {TAUX_TVA_LIGNE.map((t) => <option key={t} value={t}>{String(t).replace(".", ",")} %</option>)}
                    </Select>
                  </Field>
                  <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:justify-end">
                    <span className="text-right">
                      <span className="block text-[12px] text-encre-3">Total HT</span>
                      <span className="font-semibold tabular-nums">{formatEuro(totalLigne(l))}</span>
                    </span>
                    <span className="flex">
                      <Button variant="ghost" size="sm" aria-label={`Monter la ligne ${i + 1}`} disabled={i === 0} onClick={() => deplacer(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" aria-label={`Descendre la ligne ${i + 1}`} disabled={i === d.lignes.length - 1} onClick={() => deplacer(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" aria-label={`Dupliquer la ligne ${i + 1}`} onClick={() => set({ lignes: [...d.lignes.slice(0, i + 1), { ...l }, ...d.lignes.slice(i + 1)] })}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" aria-label={`Supprimer la ligne ${i + 1}`} onClick={() => set({ lignes: d.lignes.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
                    </span>
                  </div>
                </div>
                {l.energie && !d.em_franchise && d.ch_nature !== "neuf" && d.ch_nature !== "pro" && (
                  <p className="mt-1.5 pl-7"><Badge tone="vert">Rénovation énergétique · éligible 5,5 %</Badge></p>
                )}
              </li>
            ))}
          </ol>
          <Button variant="secondary" onClick={() => set({ lignes: [...d.lignes, { designation: "", unite: "u", quantite: 1, prixUnitaireHT: 0, tva: tauxPourLigne(d.ch_nature, {}) }] })}>
            <Plus className="h-4 w-4" aria-hidden /> Ligne vide
          </Button>

          <div className="rounded-xl p-4 shadow-[inset_0_0_0_1px_rgb(11_18_32/0.08)]">
            <p className="flex items-center gap-2 font-semibold"><Library className="h-4 w-4 text-bleu" aria-hidden /> Bibliothèque de prestations{metier && metier.slug !== "autre" ? ` · ${metier.label}` : ""}</p>
            {!d.em_metier ? (
              <p className="mt-1 text-[13.5px] text-encre-3">Choisissez votre métier (étape 1) pour retrouver vos prestations types en un clic.</p>
            ) : (
              <>
                <div className="relative mt-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-encre-3" aria-hidden />
                  <Input aria-label="Rechercher une prestation" className="pl-9" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher : tableau, receveur, enduit…" />
                </div>
                <ul className="mt-2 max-h-72 divide-y divide-encre/[0.06] overflow-y-auto">
                  {biblio.map((l) => (
                    <li key={l.designation}>
                      <button type="button" onClick={() => ajouterPrestation(l)} className="group flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left text-[14px] hover:bg-enduit">
                        <Plus className="mt-0.5 h-4 w-4 shrink-0 text-bleu" aria-hidden />
                        <span className="min-w-0 flex-1">{l.designation}</span>
                        <span className="shrink-0 tabular-nums text-encre-3">{formatEuro(l.prixUnitaireHT, 0)} / {l.unite}</span>
                      </button>
                    </li>
                  ))}
                  {biblio.length === 0 && <li className="px-2 py-2 text-[13.5px] text-encre-3">{recherche ? "Aucune prestation trouvée." : "Toutes les prestations du métier sont déjà dans le devis."}</li>}
                </ul>
              </>
            )}
          </div>
        </Etape>

        <Etape id="dechets" n={6} titre="Déchets de chantier" fait={faites.dechets}>
          <p className="text-[14px] text-encre-2">Mention obligatoire sur les devis de construction, rénovation et démolition depuis le 1er juillet 2021.{ref && " Prérempli selon votre métier."}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantité estimée" htmlFor="de_q"><Input id="de_q" value={d.de_quantite} onChange={(e) => set({ de_quantite: e.target.value })} placeholder="Ex. : 0,5 m³ ou 200 kg" /></Field>
            <Field label="Coût de gestion estimé (€ HT)" htmlFor="de_c"><Input id="de_c" inputMode="decimal" value={d.de_cout} onChange={(e) => set({ de_cout: Number(e.target.value.replace(",", ".")) || 0 })} /></Field>
            <Field label="Point de collecte" htmlFor="de_p" className="sm:col-span-2" hint="Nom, adresse et type d'installation (déchèterie professionnelle, centre de tri…)."><Input id="de_p" value={d.de_point_collecte} onChange={(e) => set({ de_point_collecte: e.target.value })} /></Field>
            <Field label="Modalités de tri et d'évacuation" htmlFor="de_m" className="sm:col-span-2"><Textarea id="de_m" value={d.de_modalites} onChange={(e) => set({ de_modalites: e.target.value })} /></Field>
          </div>
        </Etape>

        <Etape id="conditions" n={7} titre="Conditions" fait={faites.conditions}>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Remise (%)" htmlFor="co_r" hint="Sur le total HT."><Input id="co_r" inputMode="decimal" value={d.co_remise_pct} onChange={(e) => set({ co_remise_pct: Math.min(100, Math.max(0, Number(e.target.value.replace(",", ".")) || 0)) })} /></Field>
            <Field label="Acompte (%)" htmlFor="co_a" hint="Souvent 20 à 30 %."><Input id="co_a" inputMode="numeric" value={d.co_acompte_pct} onChange={(e) => set({ co_acompte_pct: Number(e.target.value) || 0 })} /></Field>
            <Field label="Validité (jours)" htmlFor="co_v"><Input id="co_v" inputMode="numeric" value={d.co_validite_jours} onChange={(e) => set({ co_validite_jours: Number(e.target.value) || 30 })} /></Field>
            <Field label="Délai de paiement (jours)" htmlFor="co_d" hint={d.cl_type === "pro" ? `${PAIEMENT.delaiMaxB2BJours} jours maximum entre pros.` : "0 = solde à réception."}>
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
        </Etape>

        <Card>
          <details>
            <summary className="cursor-pointer font-semibold">
              Voir les {mentions.length} mentions qui seront imprimées{mentionsDuMetier.length > 0 && ` (dont ${mentionsDuMetier.length} propres à votre métier)`}
            </summary>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13.5px] text-encre-2">
              {mentions.map((m) => <li key={m} className={cn(mentionsDuMetier.includes(m) && "marker:text-bleu")}>{m}</li>)}
            </ul>
          </details>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-semibold">Progression</span>
              <span className="tabular-nums text-encre-3">{nbFaites} / {ETAPES_DEVIS.length}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-enduit-2">
              <div className="h-full rounded-full bg-bleu transition-[width] duration-300" style={{ width: `${(nbFaites / ETAPES_DEVIS.length) * 100}%` }} />
            </div>
          </div>
          <div className="space-y-1.5 border-t border-encre/10 pt-4 text-[14.5px]">
            {totaux.remise > 0 && (
              <>
                <Row k="Total HT brut" v={formatEuro(totaux.totalHTBrut)} />
                <Row k={`Remise ${d.co_remise_pct} %`} v={`- ${formatEuro(totaux.remise)}`} />
              </>
            )}
            <Row k={totaux.remise > 0 ? "Total HT net" : "Total HT"} v={formatEuro(totaux.totalHT)} />
            {d.em_franchise ? <p className="text-[13px] text-encre-3">TVA non applicable (art. 293 B CGI)</p> : totaux.tvaParTaux.map((t) => <Row key={t.taux} k={`TVA ${String(t.taux).replace(".", ",")} %`} v={formatEuro(t.montant)} />)}
            <div className="border-t border-encre/10 pt-2"><Row k="Total TTC" v={formatEuro(totaux.totalTTC)} strong /></div>
            {totaux.acompte > 0 && <Row k={`Acompte ${d.co_acompte_pct} %`} v={formatEuro(totaux.acompte)} />}
          </div>
          <div id="controle" className="border-t border-encre/10 pt-4">
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
          <div className="grid gap-2">
            <Button variant="secondary" className="w-full" onClick={() => setApercu(true)}><Eye className="h-4 w-4" aria-hidden /> Aperçu du devis</Button>
            <Button className="w-full" loading={busy} onClick={generer}>Générer le devis PDF</Button>
          </div>
          {dernier !== null && (
            <div className="space-y-2 text-[13.5px]">
              <Notice tone="ok">Devis {dernier} archivé. <Link to="/espace" className="font-semibold underline">Voir mes devis</Link></Notice>
              <Button variant="secondary" className="w-full" onClick={nouveauDevis}>Nouveau devis</Button>
            </div>
          )}
          <p className="text-[12.5px] text-encre-3">Chaque génération crée un nouveau numéro, conservé dans votre espace.</p>
        </Card>
      </aside>

      {apercu && <ApercuDevis d={d} busy={busy} onClose={() => setApercu(false)} onGenerer={generer} />}
    </div>
  );
}

/** Carte d'étape numérotée, avec coche quand l'étape est complète. */
function Etape({ id, n, titre, fait, action, children }: { id: string; n: number; titre: string; fait: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32">
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="display flex items-center gap-3 text-[24px] sm:text-[26px]">
            <span
              aria-hidden
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold",
                fait ? "bg-vert text-white" : "bg-bleu-pale text-bleu-fonce",
              )}
            >
              {fait ? <Check className="h-4 w-4" /> : n}
            </span>
            {titre}
          </h2>
          {action}
        </div>
        {children}
      </Card>
    </section>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={strong ? "font-semibold" : "text-encre-2"}>{k}</span>
      <span className={`tabular-nums ${strong ? "display text-[22px]" : ""}`}>{v}</span>
    </div>
  );
}
