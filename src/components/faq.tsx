import { Plus } from "lucide-react";
import { ACRE, FACTURE_ELECTRONIQUE, TVA_FRANCHISE_PRESTATIONS, formatMontant } from "@rules/reglementation.ts";
import { dateFr } from "@/lib/utils";

export interface Faq {
  q: string;
  a: string;
}

export const FAQ_ACCUEIL: Faq[] = [
  {
    q: "Bâtipro immatricule-t-il mon entreprise à ma place ?",
    a: "Non. Le Pack Lancement prépare un dossier complet (informations, pièces, déclaration de non-condamnation) que vous recopiez sur le Guichet unique de l'INPI, seul canal officiel. La Chambre de Métiers contrôle ensuite votre qualification.",
  },
  {
    q: "Le Pack Lancement et l'abonnement Pro, c'est la même chose ?",
    a: "Non, ce sont deux offres indépendantes. Le Pack Lancement (89 €, une fois) couvre la création : dossier INPI et dimensionnement de l'assurance. L'abonnement Pro (19 €/mois) couvre l'activité : éditeur de devis illimité, numérotation et archive.",
  },
  {
    q: "Mes devis restent-ils accessibles si j'arrête l'abonnement ?",
    a: "Oui. Les devis déjà émis restent téléchargeables depuis votre espace. Seule la création de nouveaux devis demande un abonnement actif.",
  },
  {
    q: "Je suis en micro : dois-je facturer la TVA ?",
    a: `Pas tant que votre chiffre d'affaires reste sous ${formatMontant(TVA_FRANCHISE_PRESTATIONS.base)} pour des prestations. Au-delà de ${formatMontant(TVA_FRANCHISE_PRESTATIONS.majore)}, la TVA est due dès le jour du dépassement. L'éditeur ajoute la mention « TVA non applicable, art. 293 B du CGI » quand la franchise s'applique.`,
  },
  {
    q: "L'ACRE vaut-elle encore le coup ?",
    a: `Oui, mais elle est moins forte : depuis le ${dateFr(ACRE.dateChangement)}, la réduction est de ${ACRE.reductionMicro} % pour les micro-entrepreneurs. La demande se fait auprès de l'Urssaf dans les ${ACRE.delaiDemandeJours} jours suivant le début d'activité.`,
  },
  {
    q: "Suis-je concerné par la facture électronique ?",
    a: `Oui : depuis le ${dateFr(FACTURE_ELECTRONIQUE.receptionToutesEntreprises)}, toute entreprise doit pouvoir recevoir des factures électroniques via une plateforme agréée. L'obligation d'émettre vos factures entre professionnels arrive le ${dateFr(FACTURE_ELECTRONIQUE.emissionTpePmeMicro)} pour les TPE et micro-entreprises. Les devis ne sont pas concernés.`,
  },
  {
    q: "Le devis vérifie-t-il que ma décennale est valide ?",
    a: "Non. L'éditeur exige les informations de votre attestation et les imprime correctement, mais ne contacte pas votre assureur. Vérifiez que votre contrat couvre bien les activités du chantier.",
  },
];

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="border-t-2 border-encre">
      {items.map((f) => (
        <details key={f.q} className="group border-b border-encre/15">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-4 text-[17px] font-semibold leading-snug hover:text-bleu [&::-webkit-details-marker]:hidden">
            {f.q}
            <Plus className="mt-0.5 h-5 w-5 shrink-0 text-encre-3 transition-transform duration-200 group-open:rotate-45 group-open:text-balise" aria-hidden />
          </summary>
          <p className="max-w-2xl pb-5 text-[16px] leading-relaxed text-encre-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
