// Mentions propres à chaque métier (normes, certificats, autorisations),
// imprimées sur le devis selon son contenu. Partagé front / Edge Functions :
// TypeScript pur uniquement.

import type { NatureTravaux } from "./reglementation.ts";
import { TVA_PAR_NATURE, TVA_TAUX } from "./reglementation.ts";

export interface MentionMetier {
  texte: string;
  /** N'imprimer que si une désignation ou l'intitulé correspond. */
  si?: RegExp;
  /** Ne pas imprimer pour ces natures de travaux (ex. amiante en neuf). */
  sauf?: NatureTravaux[];
}

// ---------------------------------------------------------------------
// Mentions communes
// ---------------------------------------------------------------------
const AMIANTE: MentionMetier = {
  texte:
    "Bâtiment dont le permis de construire a été délivré avant le 1er juillet 1997 : le donneur d'ordre fait réaliser un repérage de l'amiante avant travaux et en remet le rapport à l'entreprise avant le démarrage du chantier (art. L4412-2 du Code du travail).",
  sauf: ["neuf"],
};

const AVENANT: MentionMetier = {
  texte:
    "Toute prestation non prévue au présent devis (désordre caché découvert après dépose, support à reprendre, demande complémentaire) fera l'objet d'un avenant chiffré, signé par le client avant exécution.",
};

const URBANISME: MentionMetier = {
  texte:
    "Les autorisations d'urbanisme éventuellement nécessaires (déclaration préalable, permis de construire) sont à la charge du maître d'ouvrage, sauf mention contraire au présent devis.",
};

const HAUTEUR: MentionMetier = {
  texte:
    "Protections collectives contre les chutes de hauteur (échafaudage, garde-corps) mises en place pendant toute la durée des travaux en toiture ou en façade.",
};

// ---------------------------------------------------------------------
// Par métier (clé = slug de metiers.ts)
// ---------------------------------------------------------------------
export const MENTIONS_PAR_METIER: Record<string, MentionMetier[]> = {
  electricien: [
    { texte: "Installation réalisée conformément à la norme NF C 15-100." },
    {
      texte:
        "Installation neuve ou entièrement rénovée : une attestation de conformité visée par le Consuel est établie avant la mise sous tension par le gestionnaire de réseau.",
      si: /tableau électrique|mise aux normes|mise en conformité|rénovation complète|installation neuve/i,
    },
    {
      texte:
        "Borne de recharge de plus de 3,7 kW : installation réservée à une entreprise qualifiée IRVE (décret n° 2017-26 du 12 janvier 2017).",
      si: /borne|IRVE|recharge/i,
    },
    AMIANTE,
    AVENANT,
  ],
  plombier: [
    {
      texte:
        "Réseaux d'alimentation et d'évacuation réalisés selon le NF DTU 60.1 (plomberie sanitaire pour bâtiments).",
    },
    {
      texte:
        "Installation de gaz neuve, complétée ou modifiée : certificat de conformité remis au client (arrêté du 2 août 1977).",
      si: /gaz/i,
    },
    {
      texte:
        "Équipement contenant des fluides frigorigènes (pompe à chaleur, climatisation) : mise en service par une entreprise titulaire de l'attestation de capacité (art. R543-99 et suivants du Code de l'environnement).",
      si: /pompe à chaleur|\bPAC\b|climatis|thermodynamique/i,
    },
    {
      texte:
        "Les garanties constructeur des équipements fournis sont transmises au client à la réception ; elles s'ajoutent aux garanties légales.",
    },
    AMIANTE,
    AVENANT,
  ],
  macon: [
    {
      texte:
        "Ouvrages exécutés selon les NF DTU 20.1 (maçonnerie de petits éléments) et NF DTU 21 (ouvrages en béton) en vigueur.",
    },
    {
      texte:
        "Travaux à proximité de réseaux enterrés : déclarations DT-DICT effectuées sur le guichet unique avant tout terrassement (art. R554-1 et suivants du Code de l'environnement).",
      si: /terrass|fouille|fondation|tranchée|décaiss/i,
    },
    {
      texte:
        "Modification d'un mur porteur : réalisée sur la base d'une étude de structure (dimensionnement du linteau ou de la poutre) fournie avant travaux.",
      si: /porteur|IPN|linteau|poutre/i,
    },
    URBANISME,
    AMIANTE,
    AVENANT,
  ],
  charpentier: [
    { texte: "Ouvrages exécutés selon le NF DTU 31.1 (charpente et escaliers en bois)." },
    {
      texte:
        "Bois de structure traités contre les insectes et les champignons selon la classe d'emploi adaptée à l'ouvrage (NF EN 335).",
    },
    URBANISME,
    HAUTEUR,
    AVENANT,
  ],
  couvreur: [
    {
      texte:
        "Ouvrages exécutés selon les NF DTU de la série 40 applicables au matériau de couverture.",
    },
    HAUTEUR,
    AMIANTE,
    AVENANT,
  ],
  menuisier: [
    {
      texte: "Pose des menuiseries extérieures selon le NF DTU 36.5.",
      si: /fenêtre|porte|baie|volet/i,
    },
    {
      texte:
        "Modification de l'aspect extérieur (fenêtres, volets, porte d'entrée) : déclaration préalable en mairie à la charge du client, sauf mention contraire au présent devis.",
      si: /fenêtre|volet|baie|porte d'entrée/i,
    },
    AMIANTE,
    AVENANT,
  ],
  serrurier: [
    {
      texte: "Garde-corps conformes à la norme NF P01-012 (dimensions et résistance).",
      si: /garde-corps|rampe|balcon/i,
    },
    {
      texte:
        "Portail ou porte motorisé conforme à la norme NF EN 13241 ; notice d'utilisation et d'entretien remise au client.",
      si: /motoris|automatis/i,
    },
    AVENANT,
  ],
  platrier: [
    { texte: "Ouvrages en plaques de plâtre exécutés selon le NF DTU 25.41." },
    AMIANTE,
    AVENANT,
  ],
  etancheur: [
    {
      texte:
        "Ouvrages exécutés selon les NF DTU de la série 43 applicables au support (toitures-terrasses).",
    },
    HAUTEUR,
    AMIANTE,
    AVENANT,
  ],
  ramoneur: [
    {
      texte:
        "Certificat de ramonage remis à l'issue de l'intervention, attestant la vacuité du conduit sur toute sa longueur (arrêté du 20 juillet 2023).",
    },
  ],
  peintre: [
    { texte: "Travaux exécutés selon le NF DTU 59.1 (revêtements de peinture)." },
    {
      texte:
        "Logement construit avant 1949 : les anciennes peintures peuvent contenir du plomb ; la préparation des supports se fait par des méthodes limitant l'émission de poussières.",
      sauf: ["neuf"],
    },
    AMIANTE,
    AVENANT,
  ],
  carreleur: [
    { texte: "Pose collée selon le NF DTU 52.2 ; pose scellée selon le NF DTU 52.1." },
    {
      texte:
        "Pièces d'eau : système de protection à l'eau sous carrelage (SPEC) mis en œuvre sur les parois exposées aux projections.",
      si: /douche|salle de bain|faïence|SPEC/i,
    },
    AMIANTE,
    AVENANT,
  ],
  solier: [
    { texte: "Sols souples posés selon le NF DTU 53.2 ; parquets collés selon le NF DTU 51.2." },
    {
      texte:
        "Humidité du support contrôlée avant pose : un ragréage complémentaire, s'il s'avère nécessaire, fera l'objet d'un avenant.",
    },
    AMIANTE,
  ],
  autre: [AVENANT],
};

/** Taux de TVA d'une ligne selon la nature des locaux et son éligibilité énergie. */
export function tvaLigne(nature: NatureTravaux, energie?: boolean): 0 | 5.5 | 10 | 20 {
  if (nature === "reno" && energie) return TVA_TAUX.reduit;
  return TVA_PAR_NATURE[nature] as 5.5 | 10 | 20;
}

/** Mentions propres au métier, filtrées selon le contenu du devis. */
export function mentionsMetier(d: {
  em_metier: string;
  ch_nature: NatureTravaux;
  ch_intitule: string;
  lignes: { designation: string }[];
}): string[] {
  const mentions = MENTIONS_PAR_METIER[d.em_metier];
  if (!mentions) return [];
  const contenu = [d.ch_intitule, ...d.lignes.map((l) => l.designation)].join("\n");
  return mentions
    .filter((m) => !m.sauf?.includes(d.ch_nature) && (!m.si || m.si.test(contenu)))
    .map((m) => m.texte);
}
