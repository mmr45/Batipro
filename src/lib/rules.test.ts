import { describe, expect, it } from "vitest";
import {
  ACRE,
  MICRO_PLAFOND_PRESTATIONS,
  TVA_FRANCHISE_PRESTATIONS,
  mentionTvaReduite,
} from "@rules/reglementation.ts";
import { evaluerQualification } from "@rules/qualification.ts";
import { evaluerStatut } from "@rules/statut.ts";
import { evaluerAssurance } from "@rules/assurance.ts";
import {
  DEVIS_VIDE,
  calculerTotaux,
  construireMentions,
  nomEmetteur,
  normaliserDevis,
  verifierDevis,
} from "@rules/devis.ts";
import { METIERS } from "@rules/metiers.ts";

describe("référentiel 2026", () => {
  it("garde les seuils en vigueur", () => {
    expect(MICRO_PLAFOND_PRESTATIONS.valeur).toBe(83_600);
    expect(TVA_FRANCHISE_PRESTATIONS.base).toBe(37_500);
    expect(TVA_FRANCHISE_PRESTATIONS.majore).toBe(41_250);
    expect(ACRE.reductionMicro).toBe(25);
  });
  it("produit la mention de TVA réduite qui remplace l'attestation", () => {
    expect(mentionTvaReduite(10)).toContain("279-0 bis");
    expect(mentionTvaReduite(5.5)).toContain("rénovation énergétique");
  });
  it("a des slugs de métiers uniques", () => {
    expect(new Set(METIERS.map((m) => m.slug)).size).toBe(METIERS.length);
  });
});

describe("qualification", () => {
  it("valide un CAP", () => {
    expect(evaluerQualification({ metier: "peintre", diplome: "cap_bep", experienceAns: 0, diplomeUE: false }).status).toBe("eligible");
  });
  it("valide 3 ans d'expérience sans diplôme", () => {
    expect(evaluerQualification({ metier: "macon", diplome: "aucun", experienceAns: 3, diplomeUE: false }).status).toBe("eligible");
  });
  it("signale « presque » entre 1 et 2 ans", () => {
    expect(evaluerQualification({ metier: "macon", diplome: "aucun", experienceAns: 2, diplomeUE: false }).status).toBe("presque");
  });
  it("refuse sans rien", () => {
    expect(evaluerQualification({ metier: "electricien", diplome: "aucun", experienceAns: 0, diplomeUE: false }).status).toBe("non");
  });
  it("inclut toujours la carte BTP", () => {
    const r = evaluerQualification({ metier: "peintre", diplome: "cap_bep", experienceAns: 0, diplomeUE: false });
    expect(r.exigences.some((e) => e.label.includes("carte BTP"))).toBe(true);
  });
});

describe("statut", () => {
  it("oriente vers la micro pour un petit CA", () => {
    const r = evaluerStatut({ ca: "lt_tva", associes: false, patrimoine: true, social: "tns", achatsImportants: false });
    expect(r.statut).toBe("micro");
    expect(r.estimationMicro.tauxCotisations).toBe(21.5);
    expect(r.estimationMicro.tauxAvecAcre).toBeCloseTo(16.13, 2);
  });
  it("exclut la micro au-delà du plafond", () => {
    const r = evaluerStatut({ ca: "au_dela_micro", associes: false, patrimoine: true, social: "tns", achatsImportants: true });
    expect(r.statut).not.toBe("micro");
  });
  it("choisit la SASU avec des associés", () => {
    expect(evaluerStatut({ ca: "tva_micro", associes: true, patrimoine: false, social: "indifferent", achatsImportants: false }).statut).toBe("sasu");
  });
});

describe("assurance", () => {
  it("calcule une fourchette de prime cohérente", () => {
    const r = evaluerAssurance({ metier: "couvreur", ca: "50_150", effectif: "0", sinistres: "0", risques: ["hauteur"] });
    expect(r.niveauRisque).toBe(5);
    expect(r.primeHaute).toBeGreaterThan(r.primeBasse);
  });
});

describe("devis", () => {
  const devis = {
    ...DEVIS_VIDE,
    em_franchise: false,
    em_nom: "Dupont Peinture",
    em_adresse: "1 rue A",
    em_siret: "123",
    em_assureur_nom: "Assur",
    em_assureur_adresse: "Paris",
    em_assureur_police: "P1",
    cl_nom: "Client",
    cl_adresse: "2 rue B",
    ch_intitule: "Peinture séjour",
    em_mediateur_nom: "Médiateur X",
  };

  it("calcule les totaux multi-taux", () => {
    const t = calculerTotaux({
      ...devis,
      lignes: [
        { designation: "a", unite: "u", quantite: 2, prixUnitaireHT: 100, tva: 10 },
        { designation: "b", unite: "u", quantite: 1, prixUnitaireHT: 50, tva: 20 },
      ],
      co_acompte_pct: 30,
    });
    expect(t.totalHT).toBe(250);
    expect(t.totalTVA).toBe(30);
    expect(t.totalTTC).toBe(280);
    expect(t.acompte).toBe(84);
  });
  it("annule la TVA en franchise", () => {
    expect(calculerTotaux({ ...devis, em_franchise: true }).totalTVA).toBe(0);
  });
  it("ajoute la mention EI", () => {
    expect(nomEmetteur({ em_nom: "Jean Martin", em_forme: "micro" })).toBe("Jean Martin EI");
    expect(nomEmetteur({ em_nom: "Martin SAS", em_forme: "sas" })).toBe("Martin SAS");
  });
  it("inclut décennale, déchets, médiateur et mention TVA réduite", () => {
    const m = construireMentions(devis).join("\n");
    expect(m).toContain("L243-2");
    expect(m).toContain("L541-21-2-3");
    expect(m).toContain("Médiateur X");
    expect(m).toContain("279-0 bis");
  });
  it("bloque un devis sans assurance", () => {
    expect(verifierDevis({ ...devis, em_assureur_nom: "" }).some((p) => p.bloquant)).toBe(true);
    expect(verifierDevis(devis).filter((p) => p.bloquant)).toEqual([]);
  });
  it("assainit les données reçues", () => {
    const d = normaliserDevis({ cl_type: "hack", lignes: [{ designation: "x", quantite: "3", prixUnitaireHT: "10", tva: 7 }] });
    expect(d.cl_type).toBe("particulier");
    expect(d.lignes[0].tva).toBe(20);
    expect(d.lignes[0].quantite).toBe(3);
  });
});
