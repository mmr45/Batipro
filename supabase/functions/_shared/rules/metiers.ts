// Métiers du bâtiment couverts par Bâtipro.
// Partagé front (Vite) / Edge Functions (Deno) : TypeScript pur uniquement.

export interface Exigence {
  label: string;
  detail: string;
}

export interface Metier {
  slug: string;
  label: string;
  /** Activité soumise à qualification (Code de l'artisanat, art. L121-1). */
  reglemente: boolean;
  /** Code APE indicatif (NAF rév. 2) — attribué in fine par l'INSEE. */
  ape: string;
  apeLabel: string;
  /** Niveau de risque technique pour l'assurance (1 = faible, 5 = élevé). */
  risque: 1 | 2 | 3 | 4 | 5;
  /** Phrase d'accroche du guide métier. */
  accroche: string;
  exigences: Exigence[];
  outillage: string;
}

const AMIANTE_SS4: Exigence = {
  label: "Formation amiante « sous-section 4 » si bâti d'avant 1997",
  detail:
    "Obligatoire avant toute intervention susceptible d'émettre des fibres (perçage, ponçage, dépose) sur des matériaux pouvant contenir de l'amiante (Code du travail, art. R4412-94 et suivants).",
};

const HAUTEUR: Exigence = {
  label: "Prévention des chutes de hauteur",
  detail:
    "Formation au montage et à l'utilisation des échafaudages et équipements de protection individuelle (harnais) — principale cause d'accident grave dans le BTP.",
};

export const EXIGENCE_TRANSVERSALE: Exigence = {
  label: "Carte d'identification professionnelle du BTP (carte BTP)",
  detail:
    "Obligatoire pour toute personne intervenant sur un chantier, dirigeant compris, y compris en sous-traitance. Demande en ligne sur cartebtp.fr.",
};

export const METIERS: Metier[] = [
  {
    slug: "electricien",
    label: "Électricien",
    reglemente: true,
    ape: "43.21A",
    apeLabel: "Travaux d'installation électrique dans tous locaux",
    risque: 4,
    accroche: "installations électriques, mises aux normes et dépannage",
    exigences: [
      {
        label: "Habilitation électrique (NF C18-510)",
        detail:
          "Obligatoire pour intervenir sur ou à proximité d'installations électriques, y compris pour le dirigeant. Distincte du diplôme de qualification.",
      },
      {
        label: "Attestation de conformité Consuel",
        detail:
          "À faire viser pour toute installation neuve ou rénovation totale avant la mise sous tension par le gestionnaire de réseau.",
      },
      AMIANTE_SS4,
    ],
    outillage: "multimètre, VAT, perforateur, testeur de différentiels",
  },
  {
    slug: "plombier",
    label: "Plombier / Chauffagiste",
    reglemente: true,
    ape: "43.22A",
    apeLabel: "Travaux d'installation d'eau et de gaz en tous locaux",
    risque: 3,
    accroche: "installations sanitaires, chauffage et réseaux d'eau et de gaz",
    exigences: [
      {
        label: "Attestation de capacité à manipuler les fluides frigorigènes",
        detail:
          "Requise pour poser ou entretenir des pompes à chaleur et climatisations (Code de l'environnement, art. R543-99 et suivants).",
      },
      {
        label: "Qualification gaz (PG) recommandée",
        detail:
          "Les installations de gaz doivent faire l'objet d'un certificat de conformité ; la qualification « Professionnel du Gaz » facilite ces démarches.",
      },
      AMIANTE_SS4,
    ],
    outillage: "chalumeau, sertisseuse, cintreuse, détecteur de fuites",
  },
  {
    slug: "macon",
    label: "Maçon / Gros œuvre",
    reglemente: true,
    ape: "43.99C",
    apeLabel: "Travaux de maçonnerie générale et gros œuvre de bâtiment",
    risque: 5,
    accroche: "fondations, murs porteurs, dalles et ouvrages en béton",
    exigences: [AMIANTE_SS4, HAUTEUR],
    outillage: "bétonnière, niveau laser, disqueuse, étais",
  },
  {
    slug: "charpentier",
    label: "Charpentier",
    reglemente: true,
    ape: "43.91A",
    apeLabel: "Travaux de charpente",
    risque: 5,
    accroche: "charpentes bois, ossatures et structures porteuses",
    exigences: [HAUTEUR],
    outillage: "scie circulaire, mortaiseuse, cloueur, échafaudage",
  },
  {
    slug: "couvreur",
    label: "Couvreur",
    reglemente: true,
    ape: "43.91B",
    apeLabel: "Travaux de couverture par éléments",
    risque: 5,
    accroche: "couvertures, zinguerie et réparation de toitures",
    exigences: [
      HAUTEUR,
      {
        label: "Formation amiante « sous-section 3 ou 4 » pour les toitures anciennes",
        detail:
          "Les plaques en fibrociment d'avant 1997 contiennent souvent de l'amiante : certification obligatoire avant dépose ou intervention.",
      },
    ],
    outillage: "échafaudage, harnais, plieuse, cloueur",
  },
  {
    slug: "menuisier",
    label: "Menuisier",
    reglemente: true,
    ape: "43.32A",
    apeLabel: "Travaux de menuiserie bois et PVC",
    risque: 2,
    accroche: "menuiseries intérieures et extérieures, agencement et pose",
    exigences: [AMIANTE_SS4],
    outillage: "scie à onglet, défonceuse, visseuse, niveau",
  },
  {
    slug: "serrurier",
    label: "Serrurier / Métallier",
    reglemente: true,
    ape: "43.32B",
    apeLabel: "Travaux de menuiserie métallique et serrurerie",
    risque: 2,
    accroche: "serrurerie, métallerie, portails et garde-corps",
    exigences: [
      {
        label: "Habilitation électrique pour les automatismes",
        detail:
          "Requise dès que l'intervention touche à l'alimentation d'un portail motorisé ou d'une serrure électrique.",
      },
    ],
    outillage: "poste à souder, perceuse à colonne, meuleuse",
  },
  {
    slug: "platrier",
    label: "Plâtrier / Plaquiste",
    reglemente: true,
    ape: "43.31Z",
    apeLabel: "Travaux de plâtrerie",
    risque: 2,
    accroche: "cloisons, doublages, faux plafonds et enduits",
    exigences: [AMIANTE_SS4],
    outillage: "lève-plaque, visseuse, ponceuse girafe, rail",
  },
  {
    slug: "etancheur",
    label: "Étancheur",
    reglemente: true,
    ape: "43.99A",
    apeLabel: "Travaux d'étanchéification",
    risque: 5,
    accroche: "étanchéité des toitures-terrasses, balcons et ouvrages enterrés",
    exigences: [HAUTEUR],
    outillage: "chalumeau, soudeuse à air chaud, rouleau maroufleur",
  },
  {
    slug: "ramoneur",
    label: "Ramoneur",
    reglemente: true,
    ape: "81.22Z",
    apeLabel: "Autres activités de nettoyage des bâtiments et nettoyage industriel",
    risque: 2,
    accroche: "ramonage et entretien des conduits de fumée",
    exigences: [
      {
        label: "Certificat de ramonage remis au client",
        detail:
          "À remettre après chaque intervention : il atteste la vacuité du conduit sur toute sa longueur (arrêté du 20 juillet 2023).",
      },
      HAUTEUR,
    ],
    outillage: "hérissons, cannes, aspirateur à cendres, caméra d'inspection",
  },
  {
    slug: "peintre",
    label: "Peintre en bâtiment",
    reglemente: true,
    ape: "43.34Z",
    apeLabel: "Travaux de peinture et vitrerie",
    risque: 1,
    accroche: "peinture, revêtements muraux et finitions",
    exigences: [AMIANTE_SS4],
    outillage: "airless, ponceuse, échafaudage roulant, lisseuse",
  },
  {
    slug: "carreleur",
    label: "Carreleur",
    reglemente: true,
    ape: "43.33Z",
    apeLabel: "Travaux de revêtement des sols et des murs",
    risque: 2,
    accroche: "carrelage, faïence et revêtements de sols et murs",
    exigences: [AMIANTE_SS4],
    outillage: "coupe-carreaux, malaxeur, croisillons, niveau laser",
  },
  {
    slug: "solier",
    label: "Solier / Moquettiste",
    reglemente: true,
    ape: "43.33Z",
    apeLabel: "Travaux de revêtement des sols et des murs",
    risque: 1,
    accroche: "sols souples, parquets collés et moquettes",
    exigences: [AMIANTE_SS4],
    outillage: "arase-joint, rouleau maroufleur, soudeuse PVC",
  },
  {
    slug: "autre",
    label: "Autre métier du bâtiment",
    reglemente: false,
    ape: "43.39Z",
    apeLabel: "Autres travaux de finition",
    risque: 2,
    accroche: "travaux de finition du bâtiment",
    exigences: [],
    outillage: "",
  },
];

export const METIERS_GUIDES = METIERS.filter((m) => m.slug !== "autre");

export function getMetier(slug: string | undefined | null): Metier | undefined {
  return METIERS.find((m) => m.slug === slug);
}

export function exigencesPour(slug: string): Exigence[] {
  return [...(getMetier(slug)?.exigences ?? []), EXIGENCE_TRANSVERSALE];
}
