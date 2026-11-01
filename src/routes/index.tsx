import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  FileSignature,
  FileText,
  Hammer,
  Lock,
  Paintbrush,
  Plug,
  Scale,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Badge, ButtonLink, btn, Container, IconTile, SectionHead, revision } from "@/components/ui";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";
import {
  ACRE,
  FACTURE_ELECTRONIQUE,
  MICRO_PLAFOND_PRESTATIONS,
  MICRO_TAUX_2026,
  TVA_FRANCHISE_PRESTATIONS,
  formatMontant,
} from "@rules/reglementation.ts";
import { METIERS_GUIDES } from "@rules/metiers.ts";
import { dateFr } from "@/lib/utils";
import { FaqList, FAQ_ACCUEIL } from "@/components/faq";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "Bâtipro — Créer son entreprise du bâtiment et faire des devis conformes",
      description:
        "Test de qualification, choix du statut, dossier de création pour le Guichet unique INPI, assurance décennale et devis BTP conformes aux règles 2026.",
      path: "/",
    }),
  component: Accueil,
});

const tauxFr = (n: number) => `${String(n).replace(".", ",")} %`;

// ---------------------------------------------------------------------
// Héros : aplat nuit, halo, grille, et aperçu de l'application.
// ---------------------------------------------------------------------
function Hero() {
  return (
    <section className="px-2 pt-2 sm:px-3 sm:pt-3">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-nuit text-white sm:rounded-[36px]">
        <div aria-hidden className="grille-nuit masque-radial pointer-events-none absolute inset-0" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[22rem] left-1/2 -z-10 h-[44rem] w-[80rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(47_91_234/0.55),rgb(47_91_234/0.12)_55%,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 top-1/3 -z-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgb(255_106_31/0.22),transparent)]"
        />

        <Container className="relative pb-0 pt-16 text-center sm:pt-24">
          <Link
            to="/reglementation"
            className="revele group inline-flex items-center gap-2 rounded-full bg-white/[0.06] py-1 pl-1 pr-3 text-[13px] font-medium text-white/80 ring-1 ring-inset ring-white/12 backdrop-blur transition-colors hover:bg-white/10"
          >
            <span className="rounded-full bg-balise px-2 py-0.5 text-[11.5px] font-semibold text-white">2026</span>
            Règles à jour, vérifiées le {revision()}
            <ChevronRight className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>

          <h1 className="display revele revele-1 mx-auto mt-7 max-w-5xl text-[42px] leading-[1.02] sm:text-[64px] lg:text-[76px]">
            Lancez votre entreprise du bâtiment.{" "}
            <br className="hidden sm:block" />
            <span className="texte-degrade">Facturez dans les règles.</span>
          </h1>
          <p className="revele revele-2 mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-white/65 sm:text-[19px]">
            Qualification, statut, dossier INPI, décennale et devis conformes : tout le parcours de l'artisan, au même endroit, avec la
            loi déjà lue pour vous.
          </p>
          <div className="revele revele-3 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink to="/outils/qualification" variant="inverse" size="lg" className="w-full px-7 sm:w-auto">
              Tester ma qualification <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink to="/tarifs" variant="verre" size="lg" className="w-full sm:w-auto">
              Voir les tarifs
            </ButtonLink>
          </div>
          <ul className="revele revele-3 mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13.5px] text-white/55">
            {["Gratuit pour commencer", "Sans carte bancaire", "Chaque règle sourcée"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#3ddc97]" strokeWidth={3} aria-hidden /> {t}
              </li>
            ))}
          </ul>

          <div className="revele revele-4 relative mx-auto mt-16 max-w-5xl sm:mt-20">
            <ApercuApp />
          </div>
        </Container>
      </div>
    </section>
  );
}

/** Maquette de l'éditeur de devis, en HTML : nette à toutes les tailles. */
function ApercuApp() {
  const lignes = [
    { d: "Préparation des supports, rebouchage", q: "45 m²", p: "540,00 €" },
    { d: "Impression + 2 couches acrylique mat", q: "45 m²", p: "1 237,50 €" },
    { d: "Protection des sols et évacuation", q: "1 forfait", p: "180,00 €" },
  ];
  const mentions = ["SIRET et mention EI", "Assurance décennale", "TVA 10 % attestée", "Gestion des déchets", "Médiateur conso."];
  return (
    <div className="relative text-left">
      {/* Cartes flottantes */}
      <div className="absolute -left-8 bottom-28 z-20 hidden w-60 animate-float rounded-2xl bg-papier/95 p-4 text-encre shadow-[0_0_0_1px_rgb(11_18_32/0.06),var(--shadow-xl)] backdrop-blur lg:block xl:-left-28">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vert-pale text-vert">
            <BadgeCheck className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11.5px] font-medium text-encre-3">Qualification</p>
            <p className="text-[14px] font-semibold leading-tight">Peintre : éligible</p>
          </div>
        </div>
        <p className="mt-3 text-[12.5px] leading-snug text-encre-2">CAP Peintre applicateur de revêtements. La CMA validera l'activité.</p>
      </div>
      <div
        className="absolute -right-8 top-16 z-20 hidden w-56 animate-float rounded-2xl bg-papier/95 p-4 text-encre shadow-[0_0_0_1px_rgb(11_18_32/0.06),var(--shadow-xl)] backdrop-blur lg:block xl:-right-28"
        style={{ animationDelay: "-3.5s" }}
      >
        <p className="text-[11.5px] font-medium text-encre-3">Cotisations micro 2026</p>
        <p className="display mt-1 text-[28px] tabular-nums">{tauxFr(MICRO_TAUX_2026.prestationsArtisan)}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-enduit-2">
          <div className="h-full rounded-full bg-gradient-to-r from-bleu to-[#6d4cff]" style={{ width: `${MICRO_TAUX_2026.prestationsArtisan * 3}%` }} />
        </div>
        <p className="mt-2 text-[12px] text-encre-3">Prestations artisanales, formation incluse</p>
      </div>

      {/* Fenêtre */}
      <div className="relative rounded-t-2xl bg-white/[0.06] p-1.5 pb-0 ring-1 ring-white/12 backdrop-blur sm:rounded-t-[20px] sm:p-2 sm:pb-0">
        <div className="overflow-hidden rounded-t-xl bg-papier text-encre sm:rounded-t-[14px]">
          <div className="flex items-center gap-3 border-b border-encre/[0.06] bg-enduit/70 px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="mx-auto flex items-center gap-1.5 whitespace-nowrap rounded-md bg-papier px-3 py-1 text-[11.5px] text-encre-3 shadow-[0_0_0_1px_rgb(11_18_32/0.06)]">
              <Lock className="h-3 w-3" aria-hidden /> Bâtipro · Éditeur de devis
            </div>
            <span className="hidden w-12 sm:block" />
          </div>
          <div className="grid md:grid-cols-[13rem_1fr_15rem]">
            {/* Barre latérale */}
            <aside className="hidden border-r border-encre/[0.06] bg-enduit/40 p-3 md:block" aria-hidden>
              {[
                { l: "Qualification", I: BadgeCheck, ok: true },
                { l: "Statut", I: Scale, ok: true },
                { l: "Dossier INPI", I: FileText, ok: true },
                { l: "Décennale", I: ShieldCheck, ok: true },
                { l: "Devis", I: FileSignature, actif: true },
              ].map(({ l, I, ok, actif }) => (
                <div key={l} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium", actif ? "bg-papier text-encre shadow-[0_0_0_1px_rgb(11_18_32/0.06),var(--shadow-xs)]" : "text-encre-2")}>
                  <I className={cn("h-4 w-4", actif ? "text-bleu" : "text-encre-3")} />
                  {l}
                  {ok && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-vert" />}
                </div>
              ))}
              <div className="mt-6 rounded-xl bg-[linear-gradient(135deg,var(--color-bleu-pale),#fff4ec)] p-3">
                <p className="text-[11.5px] font-semibold">Abonnement Pro</p>
                <p className="mt-0.5 text-[11px] text-encre-2">Devis illimités</p>
              </div>
            </aside>
            {/* Devis */}
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11.5px] font-medium text-encre-3">Devis</p>
                  <p className="text-[17px] font-semibold tracking-[-0.02em]">Réfection séjour et couloir</p>
                  <p className="text-[12.5px] text-encre-3">Mme Durand · Orléans · logement de 1987</p>
                </div>
                <span className="ref whitespace-nowrap rounded-md bg-enduit px-2 py-1 !text-[11px] !text-encre-2">D2026-0042</span>
              </div>
              <div className="mt-5 overflow-hidden rounded-xl shadow-[0_0_0_1px_rgb(11_18_32/0.07)]">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 bg-enduit/60 px-3.5 py-2 text-[11px] font-medium text-encre-3">
                  <span>Désignation</span>
                  <span className="w-14 text-right">Qté</span>
                  <span className="w-20 text-right">Total HT</span>
                </div>
                {lignes.map((l) => (
                  <div key={l.d} className="grid grid-cols-[1fr_auto_auto] gap-4 border-t border-encre/[0.05] px-3.5 py-2.5 text-[12.5px]">
                    <span className="truncate">{l.d}</span>
                    <span className="w-14 text-right text-encre-2">{l.q}</span>
                    <span className="w-20 text-right font-medium tabular-nums">{l.p}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <dl className="w-56 space-y-1 text-[12.5px]">
                  <div className="flex justify-between text-encre-2">
                    <dt>Total HT</dt>
                    <dd className="tabular-nums">1 957,50 €</dd>
                  </div>
                  <div className="flex justify-between text-encre-2">
                    <dt>TVA 10 %</dt>
                    <dd className="tabular-nums">195,75 €</dd>
                  </div>
                  <div className="flex justify-between border-t border-encre/[0.07] pt-1.5 text-[14px] font-semibold">
                    <dt>Total TTC</dt>
                    <dd className="tabular-nums">2 153,25 €</dd>
                  </div>
                </dl>
              </div>
            </div>
            {/* Conformité */}
            <aside className="hidden border-l border-encre/[0.06] p-4 md:block" aria-hidden>
              <p className="text-[11.5px] font-medium text-encre-3">Conformité</p>
              <div className="mt-2 flex items-center gap-3">
                <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-enduit-2)" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-vert)" strokeWidth="4" strokeLinecap="round" strokeDasharray="97.4 97.4" />
                </svg>
                <div>
                  <p className="text-[15px] font-semibold leading-tight">Toutes les mentions</p>
                  <p className="text-[11.5px] text-encre-3">selon le client et le chantier</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {mentions.map((m) => (
                  <li key={m} className="flex items-center gap-2 text-[12px] text-encre-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-vert-pale text-vert">
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                    </span>
                    {m}
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-lg bg-encre px-3 py-2 text-center text-[12px] font-semibold text-white">Générer le PDF</div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Chiffres clés (tous issus du référentiel)
// ---------------------------------------------------------------------
function Chiffres() {
  const items = [
    { v: "5", l: "outils, de l'idée au premier devis" },
    { v: String(METIERS_GUIDES.length), l: "guides métiers détaillés" },
    { v: "100 %", l: "des règles datées et sourcées" },
    { v: "0 €", l: "pour vérifier sa qualification" },
  ];
  return (
    <Container className="mt-16 sm:mt-20">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-encre/[0.07] shadow-[0_0_0_1px_rgb(11_18_32/0.07)] lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.l} className="bg-papier px-6 py-6">
            <dt className="sr-only">{i.l}</dt>
            <dd>
              <span className="display block text-[36px] tabular-nums sm:text-[40px]">{i.v}</span>
              <span className="mt-1 block text-[14px] text-encre-2">{i.l}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}

// ---------------------------------------------------------------------
// Grille « bento » des outils
// ---------------------------------------------------------------------
function BentoCard({
  to,
  className,
  children,
  titre,
  texte,
  offre,
  icon,
  tone,
}: {
  to: string;
  className?: string;
  children?: ReactNode;
  titre: string;
  texte: string;
  offre: string;
  icon: ReactNode;
  tone: "vert" | "bleu" | "orange";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[22px] bg-papier p-6 shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-sm)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgb(11_18_32/0.1),var(--shadow-lg)] sm:p-7",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <IconTile tone={tone}>{icon}</IconTile>
        <Badge tone={tone === "vert" ? "vert" : tone === "orange" ? "orange" : "bleu"}>{offre}</Badge>
      </div>
      <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.02em]">{titre}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-encre-2">{texte}</p>
      {children && <div className="mt-6 flex-1">{children}</div>}
      <span className="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold text-bleu">
        Ouvrir l'outil <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

function Bento() {
  return (
    <section id="outils">
      <Container className="py-24 sm:py-32">
        <SectionHead
          center
          eyebrow="Tout le parcours"
          title="Cinq outils, dans l'ordre du chantier."
          intro="Chaque étape reprend ce que vous avez saisi à la précédente. Vous ne remplissez jamais deux fois la même information."
        />
        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          <BentoCard
            to="/outils/qualification"
            className="lg:col-span-3"
            tone="vert"
            offre="Gratuit"
            icon={<BadgeCheck aria-hidden />}
            titre="Test de qualification"
            texte="Diplôme ou années d'expérience : sachez tout de suite si la Chambre de Métiers validera votre métier."
          >
            <div className="space-y-2">
              {[
                { m: "Peintre en bâtiment", s: "Éligible", t: "vert" as const },
                { m: "Électricien", s: "Habilitation à prévoir", t: "orange" as const },
                { m: "Couvreur", s: "CAP ou 3 ans requis", t: "neutre" as const },
              ].map((r) => (
                <div key={r.m} className="flex items-center justify-between rounded-xl bg-enduit/70 px-3.5 py-2.5 text-[13.5px]">
                  <span className="font-medium">{r.m}</span>
                  <Badge tone={r.t} dot>
                    {r.s}
                  </Badge>
                </div>
              ))}
            </div>
          </BentoCard>
          <BentoCard
            to="/outils/statut"
            className="lg:col-span-3"
            tone="vert"
            offre="Gratuit"
            icon={<Scale aria-hidden />}
            titre="Simulateur de statut"
            texte="Micro, EI au réel ou SASU : le coût des cotisations, l'effet de l'ACRE et ce qu'il vous reste vraiment."
          >
            <div className="space-y-2">
              {[
                { m: "Micro-entreprise", s: `${tauxFr(MICRO_TAUX_2026.prestationsArtisan)} du CA`, t: "bleu" as const },
                { m: "EI au réel", s: "Sur le bénéfice", t: "neutre" as const },
                { m: "SASU", s: "Sur la rémunération", t: "neutre" as const },
              ].map((r) => (
                <div key={r.m} className="flex items-center justify-between rounded-xl bg-enduit/70 px-3.5 py-2.5 text-[13.5px]">
                  <span className="font-medium">{r.m}</span>
                  <Badge tone={r.t}>{r.s}</Badge>
                </div>
              ))}
            </div>
          </BentoCard>
          <BentoCard
            to="/outils/inpi"
            className="lg:col-span-2"
            tone="bleu"
            offre="Pack Lancement"
            icon={<FileText aria-hidden />}
            titre="Dossier de création INPI"
            texte="Les informations du Guichet unique, vos pièces et la déclaration de non-condamnation, réunies en un PDF."
          >
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Identité</span>
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Justificatif de siège</span>
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Diplôme</span>
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Non-condamnation</span>
            </div>
          </BentoCard>
          <BentoCard
            to="/outils/assurance"
            className="lg:col-span-2"
            tone="bleu"
            offre="Pack Lancement"
            icon={<ShieldCheck aria-hidden />}
            titre="Assurance décennale"
            texte="Plafonds conseillés et budget annuel estimé, pour appeler les assureurs en sachant quoi demander."
          >
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Décennale</span>
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">RC Pro</span>
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Plafonds</span>
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Budget annuel</span>
            </div>
          </BentoCard>
          <BentoCard
            to="/outils/devis"
            className="lg:col-span-2"
            tone="orange"
            offre="Pro"
            icon={<FileSignature aria-hidden />}
            titre="Éditeur de devis"
            texte="Mentions générées selon le client et le chantier, numérotation continue, archive et PDF à votre logo."
          >
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Mentions légales</span>
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">TVA par ligne</span>
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Numérotation</span>
              <span className="rounded-full bg-enduit px-2.5 py-1 text-[12px] font-medium text-encre-2">Votre logo</span>
            </div>
          </BentoCard>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------
// Le devis vivant : les mentions obligatoires changent avec la situation.
// ---------------------------------------------------------------------
type Situation = { client: "particulier" | "pro"; domicile: boolean; ancien: boolean };

function mentionsPour(s: Situation): { label: string; ref: string }[] {
  const m = [
    { label: "SIRET, forme juridique et mention « EI »", ref: "R526-27 C. com." },
    { label: "Assureur décennale, coordonnées et zone couverte", ref: "L243-2 C. assur." },
    { label: "Détail chiffré et taux de TVA par ligne", ref: "arrêté 24/01/2017" },
    { label: "Quantité, tri et point de collecte des déchets", ref: "L541-21-2-3 C. env." },
  ];
  if (s.ancien && s.client === "particulier") m.push({ label: "Attestation TVA 10 % signée sur le devis", ref: "279-0 bis CGI" });
  if (s.client === "pro") m.push({ label: "Pénalités de retard et indemnité de 40 €", ref: "L441-10 C. com." });
  if (s.client === "particulier") m.push({ label: "Médiateur de la consommation", ref: "L616-1 C. conso." });
  if (s.client === "particulier" && s.domicile) m.push({ label: "Rétractation 14 jours et formulaire joint", ref: "L221-5 C. conso." });
  return m;
}

function Segment<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-enduit-2 p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-lg px-4 py-2 text-[14px] font-semibold transition-[background-color,box-shadow,color]",
            value === o.v ? "bg-papier text-encre shadow-[0_0_0_1px_rgb(11_18_32/0.06),var(--shadow-sm)]" : "text-encre-2 hover:text-encre",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Interrupteur({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={active} onClick={onClick} className="group flex w-full items-center justify-between gap-4 py-3 text-left">
      <span className="text-[15px] font-medium">{label}</span>
      <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", active ? "bg-bleu" : "bg-trait-fort")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", active ? "translate-x-[18px]" : "translate-x-0.5")} />
      </span>
    </button>
  );
}

function DevisVivant() {
  const [s, setS] = useState<Situation>({ client: "particulier", domicile: false, ancien: true });
  const mentions = mentionsPour(s);
  return (
    <section className="relative overflow-hidden border-y border-encre/[0.06] bg-papier">
      <div aria-hidden className="terrain masque-radial pointer-events-none absolute inset-0 bg-transparent opacity-70" />
      <Container className="relative grid gap-12 py-24 sm:py-32 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-20">
        <div>
          <SectionHead
            eyebrow="Éditeur de devis"
            title="Un devis qui connaît la loi."
            intro="Les mentions obligatoires changent selon le client et le chantier. Changez la situation : la liste se met à jour, avec l'article de loi en face de chaque ligne."
          />
          <div className="mt-8 rounded-2xl bg-enduit/70 p-5 shadow-[inset_0_0_0_1px_rgb(11_18_32/0.05)]">
            <p className="text-[13px] font-semibold text-encre-3">Votre client</p>
            <div className="mt-2">
              <Segment
                label="Type de client"
                value={s.client}
                onChange={(v) => setS({ ...s, client: v })}
                options={[
                  { v: "particulier", l: "Particulier" },
                  { v: "pro", l: "Professionnel" },
                ]}
              />
            </div>
            <div className="mt-3 divide-y divide-encre/[0.06]">
              <Interrupteur label="Démarché à domicile" active={s.domicile} onClick={() => setS({ ...s, domicile: !s.domicile })} />
              <Interrupteur label="Logement de plus de 2 ans" active={s.ancien} onClick={() => setS({ ...s, ancien: !s.ancien })} />
            </div>
          </div>
          <ButtonLink to="/outils/devis" variant="encre" size="lg" className="mt-8">
            Ouvrir l'éditeur de devis <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>

        <div className="relative">
          <div aria-hidden className="absolute -inset-8 -z-10 rounded-[40px] bg-[radial-gradient(closest-side,rgb(47_91_234/0.14),transparent)]" />
          <div className="feuille overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-encre/[0.06] px-6 py-5 sm:px-8">
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.02em]">Martin Peinture EI</p>
                <p className="text-[13.5px] text-encre-3">Réfection séjour et couloir, 45 m²</p>
              </div>
              <div className="text-right">
                <Badge tone="vert" dot>
                  {mentions.length} mentions obligatoires
                </Badge>
                <p className="ref mt-2 !text-[11.5px]">D2026-0042</p>
              </div>
            </div>
            <ul className="px-6 py-2 sm:px-8" aria-live="polite">
              {mentions.map((m) => (
                <li key={m.label} className="flex animate-[fade-up_400ms_cubic-bezier(0.16,1,0.3,1)_both] items-center gap-3 border-b border-encre/[0.05] py-3.5 text-[15px] last:border-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vert-pale text-vert">
                    <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden />
                  </span>
                  <span className="flex-1">{m.label}</span>
                  <span className="ref hidden whitespace-nowrap rounded-md bg-enduit px-2 py-0.5 !text-[11.5px] sm:inline">{m.ref}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between bg-enduit/60 px-6 py-3.5 text-[13px] text-encre-3 sm:px-8">
              <span>Signature du client</span>
              <span>Bon pour accord</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------
// Parcours et offres
// ---------------------------------------------------------------------
const PARCOURS = [
  { titre: "Vérifier sa qualification", texte: "Savoir si la CMA validera votre métier.", to: "/outils/qualification", Icon: BadgeCheck },
  { titre: "Choisir son statut", texte: "Micro, EI au réel ou SASU, chiffres à l'appui.", to: "/outils/statut", Icon: Scale },
  { titre: "Préparer le dossier INPI", texte: "Toutes les informations et pièces en un PDF.", to: "/outils/inpi", Icon: FileText },
  { titre: "Dimensionner la décennale", texte: "Plafonds et budget avant d'appeler.", to: "/outils/assurance", Icon: ShieldCheck },
  { titre: "Envoyer des devis conformes", texte: "Mentions, numérotation, archive.", to: "/outils/devis", Icon: FileSignature },
] as const;

function Parcours() {
  const groupes = [
    { l: "Gratuit", span: "lg:col-span-2", c: "text-vert bg-vert-pale ring-vert/15" },
    { l: "Pack Lancement · 89 €", span: "lg:col-span-2", c: "text-bleu-fonce bg-bleu-pale ring-bleu/15" },
    { l: "Pro · 19 €/mois", span: "lg:col-span-1", c: "text-balise-fonce bg-balise-pale ring-balise/20" },
  ];
  return (
    <section>
      <Container className="py-24 sm:py-32">
        <SectionHead
          eyebrow="Le parcours"
          title="De l'idée au premier devis signé."
          intro="Vous payez au moment où l'outil vous fait gagner du temps : rien pour démarrer, une fois à la création, puis au mois pour vos devis."
        />
        <div className="mt-14 hidden gap-4 lg:grid lg:grid-cols-5">
          {groupes.map((g) => (
            <div key={g.l} className={cn("flex items-center gap-3", g.span)}>
              <span className={cn("whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-semibold ring-1 ring-inset", g.c)}>{g.l}</span>
              <span className="h-px flex-1 bg-gradient-to-r from-encre/15 to-transparent" />
            </div>
          ))}
        </div>
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PARCOURS.map((p, i) => (
            <li key={p.to}>
              <Link
                to={p.to}
                className="group relative flex h-full flex-col rounded-2xl bg-papier p-5 shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-xs)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgb(11_18_32/0.1),var(--shadow-lg)]"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-encre text-[14px] font-semibold tabular-nums text-white">{i + 1}</span>
                  <p.Icon className="h-5 w-5 text-encre-3 transition-colors group-hover:text-bleu" aria-hidden />
                </div>
                <span className="mt-5 text-[16px] font-semibold leading-snug tracking-[-0.015em]">{p.titre}</span>
                <span className="mt-1.5 text-[14px] leading-snug text-encre-2">{p.texte}</span>
                <span className="mt-4 text-[12.5px] font-semibold text-encre-3 lg:hidden">{i < 2 ? "Gratuit" : i < 4 ? "Pack Lancement" : "Abonnement Pro"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------
// Veille réglementaire
// ---------------------------------------------------------------------
function Changements() {
  const changements = [
    {
      date: FACTURE_ELECTRONIQUE.receptionToutesEntreprises,
      titre: "Réception des factures électroniques",
      texte: `Toutes les entreprises, micro comprises, doivent pouvoir recevoir des factures électroniques. L'émission devient obligatoire pour les TPE le ${dateFr(FACTURE_ELECTRONIQUE.emissionTpePmeMicro)}.`,
    },
    {
      date: ACRE.dateChangement,
      titre: `ACRE réduite à ${ACRE.reductionMicro} %`,
      texte: `Pour les micro-entrepreneurs, la réduction de cotisations passe de 50 % à ${ACRE.reductionMicro} %, à demander sous ${ACRE.delaiDemandeJours} jours.`,
    },
    {
      date: "2025-11-03",
      titre: "Seuils de franchise de TVA maintenus",
      texte: `Le seuil unique à 25 000 € est abandonné : ${formatMontant(TVA_FRANCHISE_PRESTATIONS.base)} pour les prestations, ${formatMontant(TVA_FRANCHISE_PRESTATIONS.majore)} en seuil majoré.`,
    },
    {
      date: "2025-02-16",
      titre: "Fin des attestations TVA papier",
      texte: "Pour la TVA à 10 % ou 5,5 %, le client certifie désormais directement sur le devis qu'il signe.",
    },
  ];

  return (
    <section className="px-2 sm:px-3">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-nuit text-white sm:rounded-[36px]">
        <div aria-hidden className="grille-nuit pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_80%_at_0%_50%,black,transparent)]" />
        <div aria-hidden className="pointer-events-none absolute -left-40 top-0 -z-10 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(47_91_234/0.4),transparent)]" />
        <Container className="relative grid gap-14 py-24 sm:py-28 lg:grid-cols-[1fr_1.3fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHead
              dark
              eyebrow="Veille réglementaire"
              title="Quand la loi bouge, vos devis suivent."
              intro="Les seuils, taux et mentions des outils sont centralisés, datés et sourcés. Vous n'avez pas à lire le Journal officiel."
            />
            <Link
              to="/reglementation"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white/[0.07] px-4 py-2.5 text-[14.5px] font-semibold text-white ring-1 ring-inset ring-white/12 transition-colors hover:bg-white/[0.12]"
            >
              Toutes les règles appliquées <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ol className="space-y-3">
            {changements.map((c) => (
              <li key={c.titre} className="flex gap-4 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.06] sm:p-6">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-bleu-clair ring-1 ring-inset ring-white/10">
                  <Bell className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-white/45">{dateFr(c.date)}</p>
                  <p className="mt-1 text-[17px] font-semibold tracking-[-0.015em]">{c.titre}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-white/60">{c.texte}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------
// Guides métiers
// ---------------------------------------------------------------------
const ICONES_METIER: Record<string, typeof Hammer> = {
  electricien: Plug,
  plombier: Wrench,
  peintre: Paintbrush,
};

function Guides() {
  return (
    <section>
      <Container className="py-24 sm:py-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead
            eyebrow="Guides métiers"
            title={`${METIERS_GUIDES.length} métiers, ${METIERS_GUIDES.length} guides.`}
            intro="Qualification, assurances, habilitations et pièges du devis : ce qu'il faut savoir avant de s'installer, métier par métier."
          />
          <ButtonLink to="/guides" variant="secondary">
            Tous les guides <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
        <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {METIERS_GUIDES.map((m) => {
            const Icon = ICONES_METIER[m.slug] ?? Hammer;
            return (
              <li key={m.slug}>
                <Link
                  to="/guides/$metier"
                  params={{ metier: m.slug }}
                  className="group flex items-center gap-3 rounded-2xl bg-papier px-4 py-3.5 shadow-[0_0_0_1px_rgb(11_18_32/0.07),var(--shadow-xs)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgb(11_18_32/0.1),var(--shadow-md)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-enduit text-encre-2 transition-colors group-hover:bg-bleu-pale group-hover:text-bleu">
                    <Icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <span className="min-w-0 truncate text-[14.5px] font-semibold">{m.label}</span>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-encre-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------
// FAQ + appel final
// ---------------------------------------------------------------------
function Faq() {
  return (
    <section className="border-t border-encre/[0.06] bg-papier">
      <Container className="grid gap-12 py-24 sm:py-32 lg:grid-cols-[1fr_1.5fr] lg:gap-20">
        <div>
          <SectionHead
            eyebrow="Questions fréquentes"
            title="Un outil, pas un cabinet."
            intro={`Bâtipro ne vous appelle pas et ne décide pas à votre place. Quand une question engage votre patrimoine ou dépasse un calcul (associés, conjoint, activité mixte au-delà de ${formatMontant(MICRO_PLAFOND_PRESTATIONS.valeur)}), il vous le dit et vous oriente vers un professionnel.`}
          />
        </div>
        <FaqList items={FAQ_ACCUEIL} />
      </Container>
    </section>
  );
}

function AppelFinal() {
  return (
    <section className="px-2 pt-24 sm:px-3 sm:pt-32">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#2f5bea_0%,#3d4fe0_45%,#5a3fd6_100%)] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <div aria-hidden className="grille-nuit pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 -z-10 h-80 w-[50rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_106_31/0.45),transparent)]" />
          <Sparkles className="mx-auto h-7 w-7 text-white/80" aria-hidden />
          <h2 className="display mx-auto mt-5 max-w-2xl text-[34px] sm:text-[52px]">Trois minutes pour savoir où vous en êtes.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/75">Le test de qualification est gratuit, sans compte et sans carte bancaire.</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink to="/outils/qualification" variant="inverse" size="lg" className="w-full px-7 sm:w-auto">
              Commencer le test <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <Link to="/connexion" search={{ mode: "inscription" }} className={btn("verre", "w-full sm:w-auto", "lg")}>
              Créer un compte
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Accueil() {
  return (
    <>
      <Hero />
      <Chiffres />
      <Bento />
      <DevisVivant />
      <Parcours />
      <Changements />
      <Guides />
      <Faq />
      <AppelFinal />
    </>
  );
}
