// Modèles de devis par métier : prestations types, unités, éligibilité à la
// TVA 5,5 % et gestion des déchets (mentions : mentions-metier.ts).
// Partagé front (Vite) / Edge Functions (Deno) : TypeScript pur uniquement.
//
// Les prix sont INDICATIFS (ordre de grandeur 2026, HT, France métropolitaine)
// et servent de point de départ : l'artisan les ajuste à ses tarifs.

import { tauxPourLigne, type DevisData } from "./devis.ts";

export interface LigneModele {
  designation: string;
  unite: string;
  quantite: number;
  prixUnitaireHT: number;
  /** Travaux d'amélioration énergétique éligibles à 5,5 % (art. 278-0 bis A du CGI). */
  energie?: boolean;
}

export interface ModeleDevis {
  id: string;
  label: string;
  intitule: string;
  duree: string;
  lignes: LigneModele[];
}

export interface ModelesMetier {
  /** Libellé de l'activité à faire figurer sur l'attestation décennale. */
  activiteAssurance: string;
  dechets: { quantite: string; modalites: string };
  modeles: ModeleDevis[];
}

const REP_PMCB =
  "reprise sans frais via la filière REP des produits et matériaux de construction du bâtiment";

// ---------------------------------------------------------------------
// Référentiel par métier (clé = slug de metiers.ts)
// ---------------------------------------------------------------------
export const MODELES_PAR_METIER: Record<string, ModelesMetier> = {
  electricien: {
    activiteAssurance: "Électricité",
    dechets: {
      quantite: "Environ 20 kg",
      modalites:
        "Tri des déchets d'équipements électriques (DEEE), chutes de câbles et emballages ; DEEE remis à la filière de reprise agréée.",
    },
    modeles: [
      {
        id: "mise-aux-normes",
        label: "Mise aux normes d'un logement",
        intitule: "Mise en conformité de l'installation électrique",
        duree: "5 jours ouvrés",
        lignes: [
          {
            designation: "Diagnostic de l'installation existante et repérage des circuits",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 150,
          },
          {
            designation:
              "Fourniture et pose d'un tableau électrique (interrupteurs différentiels 30 mA type A et AC, disjoncteurs divisionnaires)",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 950,
          },
          {
            designation:
              "Mise à la terre : liaison équipotentielle principale et contrôle de la prise de terre",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 280,
          },
          {
            designation: "Remplacement des prises de courant 16 A avec terre",
            unite: "u",
            quantite: 12,
            prixUnitaireHT: 55,
          },
          {
            designation: "Remplacement des points lumineux (DCL) et interrupteurs",
            unite: "u",
            quantite: 8,
            prixUnitaireHT: 65,
          },
          {
            designation: "Liaison équipotentielle locale de la salle d'eau",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 180,
          },
          {
            designation: "Essais des différentiels, contrôle final et remise du schéma électrique",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 120,
          },
        ],
      },
      {
        id: "borne-recharge",
        label: "Borne de recharge véhicule électrique",
        intitule: "Installation d'une borne de recharge pour véhicule électrique",
        duree: "1 jour",
        lignes: [
          {
            designation: "Fourniture d'une borne de recharge 7,4 kW (wallbox)",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 900,
          },
          {
            designation:
              "Création d'une ligne dédiée depuis le tableau (câble, protection différentielle et disjoncteur), jusqu'à 15 m",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 450,
          },
          {
            designation: "Pose, raccordement et paramétrage de la borne",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 350,
          },
          {
            designation: "Mise en service, essais et remise de l'attestation IRVE",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 100,
          },
        ],
      },
      {
        id: "renovation-piece",
        label: "Rénovation électrique d'une pièce",
        intitule: "Rénovation de l'installation électrique d'une pièce",
        duree: "2 jours ouvrés",
        lignes: [
          {
            designation: "Dépose de l'appareillage et des anciennes lignes",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 120,
          },
          {
            designation: "Saignées, gaines et rebouchage",
            unite: "ml",
            quantite: 15,
            prixUnitaireHT: 22,
          },
          {
            designation: "Création de prises de courant 16 A",
            unite: "u",
            quantite: 5,
            prixUnitaireHT: 75,
          },
          {
            designation: "Création d'un point lumineux avec interrupteur va-et-vient",
            unite: "u",
            quantite: 2,
            prixUnitaireHT: 110,
          },
          { designation: "Prise RJ45 grade 2TV", unite: "u", quantite: 1, prixUnitaireHT: 85 },
        ],
      },
    ],
  },

  plombier: {
    activiteAssurance: "Plomberie, installations sanitaires et chauffage",
    dechets: {
      quantite: "Environ 50 kg",
      modalites: `Tri des métaux (cuivre, acier), des équipements usagés (DEEE) et des emballages ; sanitaires déposés en ${REP_PMCB}.`,
    },
    modeles: [
      {
        id: "chauffe-eau",
        label: "Remplacement d'un chauffe-eau",
        intitule: "Remplacement du chauffe-eau électrique",
        duree: "1 jour",
        lignes: [
          {
            designation: "Vidange, dépose et évacuation de l'ancien chauffe-eau",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 120,
          },
          {
            designation: "Fourniture d'un chauffe-eau électrique 200 L",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 550,
          },
          {
            designation: "Pose et raccordement (groupe de sécurité, réducteur de pression, siphon)",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 320,
          },
          {
            designation: "Mise en eau, essais et contrôle d'étanchéité",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 60,
          },
        ],
      },
      {
        id: "pompe-a-chaleur",
        label: "Pompe à chaleur air/eau",
        intitule: "Remplacement de la chaudière par une pompe à chaleur air/eau",
        duree: "3 jours ouvrés",
        lignes: [
          {
            designation: "Dépose de l'ancienne chaudière, vidange du circuit et évacuation",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 450,
            energie: true,
          },
          {
            designation:
              "Fourniture d'une pompe à chaleur air/eau 8 kW (unité extérieure et module hydraulique)",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 7500,
            energie: true,
          },
          {
            designation: "Pose, raccordements hydrauliques et frigorifiques",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 1800,
            energie: true,
          },
          {
            designation: "Raccordement électrique et régulation (thermostat d'ambiance)",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 450,
            energie: true,
          },
          {
            designation: "Mise en service, équilibrage et réglages",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 300,
            energie: true,
          },
        ],
      },
      {
        id: "salle-de-bain",
        label: "Plomberie de salle de bain",
        intitule: "Rénovation de la plomberie de la salle de bain",
        duree: "4 jours ouvrés",
        lignes: [
          {
            designation: "Dépose des équipements sanitaires existants",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 250,
          },
          {
            designation: "Création des alimentations (multicouche) et évacuations (PVC)",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 850,
          },
          {
            designation: "Fourniture et pose d'un receveur de douche extra-plat et d'une paroi",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 950,
          },
          {
            designation: "Fourniture et pose d'un meuble vasque avec mitigeur",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 680,
          },
          {
            designation: "Fourniture et pose d'un WC suspendu sur bâti-support",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 790,
          },
        ],
      },
    ],
  },

  macon: {
    activiteAssurance: "Maçonnerie et béton armé",
    dechets: {
      quantite: "Environ 3 m³",
      modalites:
        "Tri à la source : gravats inertes (béton, briques, pierres), métaux et déchets non dangereux ; évacuation en benne vers une installation de recyclage ou de stockage des inertes.",
    },
    modeles: [
      {
        id: "ouverture-mur-porteur",
        label: "Ouverture dans un mur porteur",
        intitule: "Création d'une ouverture dans un mur porteur",
        duree: "3 jours ouvrés",
        lignes: [
          {
            designation: "Installation de chantier et protections",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 250,
          },
          {
            designation: "Étaiement provisoire",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 400,
          },
          {
            designation: "Sciage et démolition du mur porteur",
            unite: "m²",
            quantite: 3,
            prixUnitaireHT: 220,
          },
          {
            designation: "Fourniture et pose d'un IPN ou linteau selon étude de structure",
            unite: "ml",
            quantite: 2.5,
            prixUnitaireHT: 380,
          },
          {
            designation: "Reprises en maçonnerie (jambages, appuis, enduits)",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 650,
          },
          {
            designation: "Évacuation des gravats",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 250,
          },
        ],
      },
      {
        id: "dalle-beton",
        label: "Dalle béton / terrasse",
        intitule: "Réalisation d'une dalle béton extérieure",
        duree: "4 jours ouvrés",
        lignes: [
          {
            designation: "Terrassement et décaissement",
            unite: "m³",
            quantite: 6,
            prixUnitaireHT: 55,
          },
          {
            designation: "Hérisson en tout-venant compacté",
            unite: "m²",
            quantite: 20,
            prixUnitaireHT: 18,
          },
          {
            designation: "Film polyane et treillis soudé",
            unite: "m²",
            quantite: 20,
            prixUnitaireHT: 12,
          },
          {
            designation: "Coulage d'une dalle béton de 12 cm, finition talochée",
            unite: "m²",
            quantite: 20,
            prixUnitaireHT: 65,
          },
          {
            designation: "Évacuation des terres et gravats",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 350,
          },
        ],
      },
      {
        id: "mur-cloture",
        label: "Mur de clôture",
        intitule: "Construction d'un mur de clôture en blocs béton",
        duree: "5 jours ouvrés",
        lignes: [
          {
            designation: "Fouilles en rigole et évacuation des terres",
            unite: "ml",
            quantite: 15,
            prixUnitaireHT: 35,
          },
          {
            designation: "Semelle de fondation en béton armé",
            unite: "ml",
            quantite: 15,
            prixUnitaireHT: 75,
          },
          {
            designation: "Élévation en blocs béton de 20, chaînages compris",
            unite: "m²",
            quantite: 22,
            prixUnitaireHT: 85,
          },
          {
            designation: "Enduit de façade deux faces",
            unite: "m²",
            quantite: 44,
            prixUnitaireHT: 38,
          },
          { designation: "Chaperon béton", unite: "ml", quantite: 15, prixUnitaireHT: 28 },
        ],
      },
    ],
  },

  charpentier: {
    activiteAssurance: "Charpente et structure bois",
    dechets: {
      quantite: "Environ 1 m³",
      modalites:
        "Tri du bois non traité, du bois traité (orienté vers une filière adaptée) et des métaux ; évacuation vers une installation agréée.",
    },
    modeles: [
      {
        id: "traitement-charpente",
        label: "Traitement et renforcement",
        intitule: "Traitement curatif et renforcement de la charpente",
        duree: "4 jours ouvrés",
        lignes: [
          {
            designation: "Accès et protection des combles",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 300,
          },
          {
            designation: "Bûchage et brossage des bois attaqués",
            unite: "m²",
            quantite: 40,
            prixUnitaireHT: 18,
          },
          {
            designation:
              "Traitement curatif insecticide et fongicide par injection et pulvérisation",
            unite: "m²",
            quantite: 40,
            prixUnitaireHT: 22,
          },
          {
            designation: "Remplacement de pièces de bois endommagées (chevrons, pannes)",
            unite: "ml",
            quantite: 12,
            prixUnitaireHT: 85,
          },
          {
            designation: "Renforcement par moisage des éléments affaiblis",
            unite: "u",
            quantite: 4,
            prixUnitaireHT: 160,
          },
        ],
      },
      {
        id: "charpente-extension",
        label: "Charpente d'extension",
        intitule: "Fabrication et pose d'une charpente traditionnelle pour extension",
        duree: "6 jours ouvrés",
        lignes: [
          {
            designation: "Fourniture de bois de charpente traité classe 2",
            unite: "m³",
            quantite: 4,
            prixUnitaireHT: 750,
          },
          {
            designation: "Taille et assemblage de la charpente",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 2400,
          },
          { designation: "Levage et pose", unite: "forfait", quantite: 1, prixUnitaireHT: 1500 },
          {
            designation: "Moyens de levage (grue ou manuscopique)",
            unite: "j",
            quantite: 1,
            prixUnitaireHT: 650,
          },
        ],
      },
    ],
  },

  couvreur: {
    activiteAssurance: "Couverture et zinguerie",
    dechets: {
      quantite: "Environ 4 m³",
      modalites:
        "Tri des tuiles (inertes), du bois de liteaunage et des métaux (zinc, plomb) ; plaques de fibrociment éventuelles traitées comme déchets amiantés par une filière agréée.",
    },
    modeles: [
      {
        id: "refection-toiture",
        label: "Réfection de toiture en tuiles",
        intitule: "Réfection complète de la couverture en tuiles",
        duree: "8 jours ouvrés",
        lignes: [
          {
            designation: "Échafaudage de pied avec garde-corps, montage et démontage",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 1200,
          },
          {
            designation: "Dépose de la couverture existante et évacuation",
            unite: "m²",
            quantite: 80,
            prixUnitaireHT: 18,
          },
          {
            designation: "Fourniture et pose d'un écran sous-toiture HPV",
            unite: "m²",
            quantite: 80,
            prixUnitaireHT: 14,
          },
          {
            designation: "Liteaunage et contre-liteaunage",
            unite: "m²",
            quantite: 80,
            prixUnitaireHT: 16,
          },
          {
            designation: "Fourniture et pose de tuiles terre cuite",
            unite: "m²",
            quantite: 80,
            prixUnitaireHT: 48,
          },
          {
            designation: "Faîtage, rives et arêtiers",
            unite: "ml",
            quantite: 24,
            prixUnitaireHT: 45,
          },
        ],
      },
      {
        id: "reparation-zinguerie",
        label: "Réparation et zinguerie",
        intitule: "Réparation de toiture et remplacement de la zinguerie",
        duree: "3 jours ouvrés",
        lignes: [
          {
            designation: "Recherche de fuite et diagnostic",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 150,
          },
          {
            designation: "Remplacement de tuiles cassées",
            unite: "u",
            quantite: 20,
            prixUnitaireHT: 12,
          },
          {
            designation: "Remplacement des gouttières en zinc",
            unite: "ml",
            quantite: 20,
            prixUnitaireHT: 65,
          },
          {
            designation: "Remplacement des descentes d'eaux pluviales",
            unite: "ml",
            quantite: 8,
            prixUnitaireHT: 55,
          },
          {
            designation: "Démoussage et traitement anti-mousse",
            unite: "m²",
            quantite: 80,
            prixUnitaireHT: 12,
          },
        ],
      },
      {
        id: "isolation-combles",
        label: "Isolation des combles perdus",
        intitule: "Isolation thermique des combles perdus",
        duree: "1 jour",
        lignes: [
          {
            designation: "Protection et repérage des points singuliers (spots, conduits)",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 150,
            energie: true,
          },
          {
            designation: "Isolant soufflé en laine minérale, R ≥ 7 m².K/W",
            unite: "m²",
            quantite: 70,
            prixUnitaireHT: 28,
            energie: true,
          },
          {
            designation: "Rehausse de trappe et repères de hauteur",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 90,
            energie: true,
          },
        ],
      },
    ],
  },

  menuisier: {
    activiteAssurance: "Menuiseries intérieures et extérieures",
    dechets: {
      quantite: "Environ 1 m³",
      modalites: `Menuiseries déposées triées (verre, PVC, bois, métal), ${REP_PMCB}.`,
    },
    modeles: [
      {
        id: "fenetres",
        label: "Remplacement de fenêtres",
        intitule: "Remplacement des fenêtres simple vitrage par du double vitrage",
        duree: "2 jours ouvrés",
        lignes: [
          {
            designation: "Dépose des anciennes fenêtres et évacuation",
            unite: "u",
            quantite: 4,
            prixUnitaireHT: 80,
            energie: true,
          },
          {
            designation: "Fourniture de fenêtres PVC double vitrage (Uw ≤ 1,3 W/m².K, Sw ≥ 0,3)",
            unite: "u",
            quantite: 4,
            prixUnitaireHT: 650,
            energie: true,
          },
          {
            designation: "Pose en rénovation, calfeutrement et étanchéité",
            unite: "u",
            quantite: 4,
            prixUnitaireHT: 220,
            energie: true,
          },
          {
            designation: "Habillages et finitions intérieures",
            unite: "u",
            quantite: 4,
            prixUnitaireHT: 60,
            energie: true,
          },
        ],
      },
      {
        id: "agencement",
        label: "Placard / dressing sur mesure",
        intitule: "Fabrication et pose d'un dressing sur mesure",
        duree: "2 jours ouvrés",
        lignes: [
          {
            designation: "Prise de cotes et plans",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 120,
          },
          {
            designation: "Fabrication des caissons et étagères (panneaux mélaminés)",
            unite: "ml",
            quantite: 3,
            prixUnitaireHT: 480,
          },
          {
            designation: "Portes coulissantes avec rails",
            unite: "u",
            quantite: 2,
            prixUnitaireHT: 380,
          },
          {
            designation: "Pose et ajustements",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 350,
          },
        ],
      },
      {
        id: "portes-interieures",
        label: "Portes intérieures",
        intitule: "Remplacement des portes intérieures",
        duree: "2 jours ouvrés",
        lignes: [
          {
            designation: "Dépose des portes et huisseries existantes",
            unite: "u",
            quantite: 5,
            prixUnitaireHT: 45,
          },
          {
            designation: "Fourniture de blocs-portes prépeints avec quincaillerie",
            unite: "u",
            quantite: 5,
            prixUnitaireHT: 220,
          },
          { designation: "Pose et réglage", unite: "u", quantite: 5, prixUnitaireHT: 130 },
          { designation: "Chambranles et finitions", unite: "u", quantite: 5, prixUnitaireHT: 40 },
        ],
      },
    ],
  },

  serrurier: {
    activiteAssurance: "Serrurerie et métallerie",
    dechets: {
      quantite: "Environ 50 kg",
      modalites: "Métaux triés et valorisés en filière de recyclage ; emballages séparés.",
    },
    modeles: [
      {
        id: "portail-motorise",
        label: "Portail motorisé",
        intitule: "Fourniture et pose d'un portail battant motorisé",
        duree: "2 jours ouvrés",
        lignes: [
          {
            designation: "Fourniture d'un portail battant aluminium 3,5 m",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 2400,
          },
          {
            designation: "Scellement des gonds et réglage des piliers",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 350,
          },
          {
            designation: "Fourniture et pose d'une motorisation à bras avec 2 télécommandes",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 950,
          },
          {
            designation: "Raccordement électrique, feu clignotant et cellules de sécurité",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 350,
          },
          {
            designation: "Réglages et mise en service",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 120,
          },
        ],
      },
      {
        id: "garde-corps",
        label: "Garde-corps métallique",
        intitule: "Fabrication et pose d'un garde-corps en acier",
        duree: "1 jour",
        lignes: [
          {
            designation: "Relevé de cotes et plan d'exécution",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 150,
          },
          {
            designation: "Fabrication d'un garde-corps acier thermolaqué",
            unite: "ml",
            quantite: 6,
            prixUnitaireHT: 320,
          },
          {
            designation: "Fixations et scellements chimiques",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 180,
          },
          { designation: "Pose", unite: "forfait", quantite: 1, prixUnitaireHT: 450 },
        ],
      },
      {
        id: "porte-blindee",
        label: "Porte blindée",
        intitule: "Fourniture et pose d'une porte blindée",
        duree: "1 jour",
        lignes: [
          {
            designation: "Dépose de la porte existante",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 120,
          },
          {
            designation:
              "Fourniture d'une porte blindée certifiée A2P BP1 avec serrure 3 points A2P",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 1900,
          },
          {
            designation: "Pose, réglage et habillages",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 450,
          },
        ],
      },
    ],
  },

  platrier: {
    activiteAssurance: "Plâtrerie, cloisons et faux plafonds",
    dechets: {
      quantite: "Environ 1 m³",
      modalites:
        "Tri des chutes de plâtre (filière de recyclage dédiée), des laines minérales et des emballages.",
    },
    modeles: [
      {
        id: "cloisons-doublages",
        label: "Cloisons et doublages",
        intitule: "Création de cloisons et doublages isolants",
        duree: "5 jours ouvrés",
        lignes: [
          {
            designation: "Cloison 72/48 en plaques de plâtre avec isolant phonique",
            unite: "m²",
            quantite: 25,
            prixUnitaireHT: 48,
          },
          {
            designation:
              "Doublage isolant des murs extérieurs (laine minérale R ≥ 3,7 et plaque de plâtre)",
            unite: "m²",
            quantite: 30,
            prixUnitaireHT: 55,
            energie: true,
          },
          {
            designation: "Bandes, enduits et finition prête à peindre",
            unite: "m²",
            quantite: 55,
            prixUnitaireHT: 12,
          },
          { designation: "Bâtis de porte", unite: "u", quantite: 2, prixUnitaireHT: 95 },
        ],
      },
      {
        id: "faux-plafond",
        label: "Faux plafond isolé",
        intitule: "Création d'un faux plafond isolé",
        duree: "3 jours ouvrés",
        lignes: [
          {
            designation: "Faux plafond en plaques de plâtre sur ossature métallique",
            unite: "m²",
            quantite: 35,
            prixUnitaireHT: 52,
          },
          {
            designation: "Isolation sous rampants ou plafond (laine minérale R ≥ 6)",
            unite: "m²",
            quantite: 35,
            prixUnitaireHT: 28,
            energie: true,
          },
          { designation: "Trappe de visite", unite: "u", quantite: 1, prixUnitaireHT: 85 },
          {
            designation: "Bandes et finition prête à peindre",
            unite: "m²",
            quantite: 35,
            prixUnitaireHT: 12,
          },
        ],
      },
    ],
  },

  etancheur: {
    activiteAssurance: "Étanchéité de toitures-terrasses",
    dechets: {
      quantite: "Environ 2 m³",
      modalites:
        "Tri des membranes bitumineuses, isolants et gravillons ; évacuation vers une installation agréée.",
    },
    modeles: [
      {
        id: "toiture-terrasse",
        label: "Réfection de toiture-terrasse",
        intitule: "Réfection de l'étanchéité de la toiture-terrasse",
        duree: "5 jours ouvrés",
        lignes: [
          {
            designation: "Dépose de l'ancienne étanchéité et évacuation",
            unite: "m²",
            quantite: 60,
            prixUnitaireHT: 20,
          },
          {
            designation: "Préparation du support et primaire d'accrochage",
            unite: "m²",
            quantite: 60,
            prixUnitaireHT: 8,
          },
          {
            designation: "Isolant thermique en polyuréthane (R ≥ 4,5)",
            unite: "m²",
            quantite: 60,
            prixUnitaireHT: 38,
            energie: true,
          },
          {
            designation: "Étanchéité bicouche bitume élastomère",
            unite: "m²",
            quantite: 60,
            prixUnitaireHT: 55,
          },
          {
            designation: "Relevés d'étanchéité et costières",
            unite: "ml",
            quantite: 32,
            prixUnitaireHT: 35,
          },
          {
            designation: "Protection lourde en gravillons",
            unite: "m²",
            quantite: 60,
            prixUnitaireHT: 10,
          },
        ],
      },
      {
        id: "balcon",
        label: "Étanchéité de balcon",
        intitule: "Étanchéité d'un balcon par système liquide",
        duree: "2 jours ouvrés",
        lignes: [
          {
            designation: "Dépose du revêtement existant",
            unite: "m²",
            quantite: 12,
            prixUnitaireHT: 25,
          },
          {
            designation: "Système d'étanchéité liquide (SEL) sous protection",
            unite: "m²",
            quantite: 12,
            prixUnitaireHT: 75,
          },
          {
            designation: "Relevés et traitement des points singuliers",
            unite: "ml",
            quantite: 14,
            prixUnitaireHT: 30,
          },
          {
            designation: "Évacuation d'eaux pluviales",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 120,
          },
        ],
      },
    ],
  },

  ramoneur: {
    activiteAssurance: "Ramonage et fumisterie",
    dechets: {
      quantite: "Moins de 10 kg (suies)",
      modalites: "Suies et résidus de combustion ensachés et évacués par l'entreprise.",
    },
    modeles: [
      {
        id: "ramonage",
        label: "Ramonage annuel",
        intitule: "Ramonage du conduit de fumée",
        duree: "1 heure",
        lignes: [
          {
            designation: "Ramonage mécanique d'un conduit de fumée",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 75,
          },
          {
            designation: "Inspection du conduit par caméra",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 90,
          },
        ],
      },
      {
        id: "tubage",
        label: "Débistrage et tubage",
        intitule: "Débistrage et tubage du conduit de cheminée",
        duree: "1 jour",
        lignes: [
          {
            designation: "Débistrage mécanique du conduit",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 250,
          },
          {
            designation: "Fourniture et pose d'un tubage inox Ø 150 mm",
            unite: "ml",
            quantite: 8,
            prixUnitaireHT: 85,
          },
          {
            designation: "Plaque d'étanchéité et chapeau de finition",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 220,
          },
          {
            designation: "Contrôle de vacuité et remise du certificat",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 60,
          },
        ],
      },
    ],
  },

  peintre: {
    activiteAssurance: "Peinture et revêtements muraux",
    dechets: {
      quantite: "Environ 30 kg",
      modalites:
        "Pots et résidus de peinture (déchets dangereux) séparés des emballages vides ; dépôt en déchèterie professionnelle.",
    },
    modeles: [
      {
        id: "peinture-interieure",
        label: "Peinture intérieure",
        intitule: "Réfection des peintures intérieures",
        duree: "5 jours ouvrés",
        lignes: [
          {
            designation: "Protection des sols et du mobilier",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 150,
          },
          {
            designation: "Préparation des murs : rebouchage, ponçage, impression",
            unite: "m²",
            quantite: 120,
            prixUnitaireHT: 9,
          },
          {
            designation: "Peinture des murs, 2 couches acrylique velours",
            unite: "m²",
            quantite: 120,
            prixUnitaireHT: 14,
          },
          {
            designation: "Peinture des plafonds, 2 couches mat",
            unite: "m²",
            quantite: 45,
            prixUnitaireHT: 16,
          },
          {
            designation: "Peinture des boiseries (portes, plinthes)",
            unite: "u",
            quantite: 6,
            prixUnitaireHT: 85,
          },
        ],
      },
      {
        id: "ravalement",
        label: "Ravalement de façade",
        intitule: "Ravalement de façade en peinture",
        duree: "8 jours ouvrés",
        lignes: [
          {
            designation: "Échafaudage, montage et démontage",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 1500,
          },
          {
            designation: "Nettoyage haute pression et traitement anti-mousse",
            unite: "m²",
            quantite: 100,
            prixUnitaireHT: 8,
          },
          {
            designation: "Rebouchage et traitement des fissures",
            unite: "ml",
            quantite: 20,
            prixUnitaireHT: 18,
          },
          {
            designation: "Peinture de façade, 2 couches (siloxane)",
            unite: "m²",
            quantite: 100,
            prixUnitaireHT: 32,
          },
        ],
      },
      {
        id: "papier-peint",
        label: "Papier peint / toile de verre",
        intitule: "Pose de revêtements muraux",
        duree: "3 jours ouvrés",
        lignes: [
          {
            designation: "Dépose des anciens revêtements et lessivage",
            unite: "m²",
            quantite: 50,
            prixUnitaireHT: 7,
          },
          { designation: "Enduit de lissage", unite: "m²", quantite: 50, prixUnitaireHT: 11 },
          {
            designation: "Fourniture et pose de toile de verre",
            unite: "m²",
            quantite: 50,
            prixUnitaireHT: 14,
          },
          {
            designation: "Peinture de finition, 2 couches",
            unite: "m²",
            quantite: 50,
            prixUnitaireHT: 13,
          },
        ],
      },
    ],
  },

  carreleur: {
    activiteAssurance: "Carrelage et revêtements de sols et murs",
    dechets: {
      quantite: "Environ 1 m³",
      modalites:
        "Tri à la source : gravats et carrelages (inertes), emballages et sacs de colle ; évacuation par l'entreprise.",
    },
    modeles: [
      {
        id: "carrelage-sol",
        label: "Carrelage de sol",
        intitule: "Pose de carrelage au sol",
        duree: "4 jours ouvrés",
        lignes: [
          {
            designation: "Dépose de l'ancien revêtement et évacuation",
            unite: "m²",
            quantite: 30,
            prixUnitaireHT: 15,
          },
          { designation: "Ragréage du support", unite: "m²", quantite: 30, prixUnitaireHT: 18 },
          {
            designation: "Fourniture de carrelage grès cérame 60 × 60 (chutes comprises)",
            unite: "m²",
            quantite: 33,
            prixUnitaireHT: 35,
          },
          { designation: "Pose collée et joints", unite: "m²", quantite: 30, prixUnitaireHT: 42 },
          { designation: "Plinthes assorties", unite: "ml", quantite: 28, prixUnitaireHT: 15 },
        ],
      },
      {
        id: "douche-italienne",
        label: "Douche à l'italienne",
        intitule: "Création d'une douche à l'italienne carrelée",
        duree: "4 jours ouvrés",
        lignes: [
          {
            designation: "Système de protection à l'eau sous carrelage (SPEC)",
            unite: "m²",
            quantite: 10,
            prixUnitaireHT: 35,
          },
          {
            designation: "Receveur à carreler avec forme de pente et siphon",
            unite: "u",
            quantite: 1,
            prixUnitaireHT: 450,
          },
          {
            designation: "Fourniture de faïence murale",
            unite: "m²",
            quantite: 20,
            prixUnitaireHT: 30,
          },
          {
            designation: "Pose de faïence murale collée et joints",
            unite: "m²",
            quantite: 20,
            prixUnitaireHT: 48,
          },
          { designation: "Profilés de finition", unite: "ml", quantite: 10, prixUnitaireHT: 18 },
        ],
      },
    ],
  },

  solier: {
    activiteAssurance: "Revêtements de sols souples et parquets",
    dechets: {
      quantite: "Environ 0,5 m³",
      modalites:
        "Tri des anciens revêtements, des chutes et des emballages ; anciennes dalles susceptibles de contenir de l'amiante traitées à part.",
    },
    modeles: [
      {
        id: "sol-souple",
        label: "Sol souple (vinyle)",
        intitule: "Pose d'un sol souple en vinyle",
        duree: "2 jours ouvrés",
        lignes: [
          {
            designation: "Dépose de l'ancien revêtement",
            unite: "m²",
            quantite: 40,
            prixUnitaireHT: 8,
          },
          { designation: "Ragréage autolissant", unite: "m²", quantite: 40, prixUnitaireHT: 18 },
          {
            designation: "Fourniture de sol vinyle en lés ou en lames (chutes comprises)",
            unite: "m²",
            quantite: 44,
            prixUnitaireHT: 25,
          },
          {
            designation: "Pose collée et soudure des joints",
            unite: "m²",
            quantite: 40,
            prixUnitaireHT: 18,
          },
          {
            designation: "Plinthes et barres de seuil",
            unite: "ml",
            quantite: 35,
            prixUnitaireHT: 9,
          },
        ],
      },
      {
        id: "parquet",
        label: "Parquet contrecollé",
        intitule: "Pose d'un parquet contrecollé",
        duree: "3 jours ouvrés",
        lignes: [
          {
            designation: "Préparation du support et contrôle d'humidité",
            unite: "m²",
            quantite: 35,
            prixUnitaireHT: 6,
          },
          { designation: "Sous-couche acoustique", unite: "m²", quantite: 35, prixUnitaireHT: 5 },
          {
            designation: "Fourniture de parquet contrecollé chêne (chutes comprises)",
            unite: "m²",
            quantite: 38,
            prixUnitaireHT: 45,
          },
          {
            designation: "Pose flottante ou collée",
            unite: "m²",
            quantite: 35,
            prixUnitaireHT: 25,
          },
          { designation: "Plinthes bois", unite: "ml", quantite: 30, prixUnitaireHT: 12 },
        ],
      },
    ],
  },

  autre: {
    activiteAssurance: "votre activité déclarée",
    dechets: {
      quantite: "",
      modalites:
        "Tri à la source (gravats inertes, bois, métaux, déchets non dangereux en mélange), évacuation par l'entreprise.",
    },
    modeles: [
      {
        id: "general",
        label: "Devis de travaux",
        intitule: "",
        duree: "",
        lignes: [
          {
            designation: "Protection des sols et mobilier, préparation du chantier",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 120,
          },
          { designation: "Main d'œuvre", unite: "h", quantite: 16, prixUnitaireHT: 45 },
          {
            designation: "Fournitures et matériaux",
            unite: "forfait",
            quantite: 1,
            prixUnitaireHT: 450,
          },
        ],
      },
    ],
  },
};

export function modelesMetier(slug: string | undefined | null): ModelesMetier | undefined {
  return slug ? MODELES_PAR_METIER[slug] : undefined;
}

/** Bibliothèque : toutes les prestations types d'un métier, sans doublon. */
export function bibliotheque(slug: string): LigneModele[] {
  const ref = modelesMetier(slug);
  if (!ref) return [];
  const vu = new Set<string>();
  const out: LigneModele[] = [];
  for (const m of ref.modeles)
    for (const l of m.lignes)
      if (!vu.has(l.designation)) {
        vu.add(l.designation);
        out.push(l);
      }
  return out;
}

export function totalModeleHT(m: ModeleDevis): number {
  return Math.round(m.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaireHT, 0));
}

/**
 * Préremplit un devis à partir d'un modèle du métier : prestations, unités,
 * TVA selon la nature des locaux, intitulé, durée et gestion des déchets.
 * Les informations de l'entreprise et du client sont conservées.
 */
export function appliquerModele(d: DevisData, slug: string, modeleId?: string): DevisData {
  const ref = modelesMetier(slug);
  if (!ref) return { ...d, em_metier: slug };
  const modele: ModeleDevis = ref.modeles.find((m) => m.id === modeleId) ?? ref.modeles[0];
  return {
    ...d,
    em_metier: slug,
    ch_intitule: modele.intitule || d.ch_intitule,
    ch_duree: modele.duree || d.ch_duree,
    de_quantite: ref.dechets.quantite || d.de_quantite,
    de_modalites: ref.dechets.modalites || d.de_modalites,
    lignes: modele.lignes.map((l) => ({
      designation: l.designation,
      unite: l.unite,
      quantite: l.quantite,
      prixUnitaireHT: l.prixUnitaireHT,
      tva: tauxPourLigne(d.ch_nature, l),
      ...(l.energie ? { energie: true } : {}),
    })),
  };
}
