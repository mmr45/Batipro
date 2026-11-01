import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  INPI_VIDE,
  etapesApres,
  ficheSaisie,
  normaliserInpi,
  piecesRequises,
  pointsDeVigilance,
  type InpiData,
} from "@rules/inpi.ts";
import { crc32, zip } from "../../supabase/functions/_shared/zip.ts";

const base: InpiData = {
  ...INPI_VIDE,
  civilite: "M.",
  prenom: "Karim",
  nom: "Benali",
  dateNaissance: "1990-04-12",
  villeNaissance: "Lyon",
  perePrenom: "Ahmed",
  pereNom: "Benali",
  merePrenom: "Nadia",
  mereNomNaissance: "Haddad",
  metier: "electricien",
  activite: "Installation électrique, mise aux normes et dépannage chez les particuliers",
  dateDebut: "2026-12-01",
  adresse: "3 rue des Lilas",
  codePostal: "69003",
  ville: "Lyon",
};

describe("dossier INPI", () => {
  it("demande la DNC et la qualification pour un métier réglementé", () => {
    const p = piecesRequises(base);
    expect(p).toEqual(expect.arrayContaining(["identite", "domicile", "dnc", "qualification"]));
    expect(p).not.toContain("statuts");
  });

  it("ajoute les pièces de société pour une SASU, sans attestation du conjoint", () => {
    const p = piecesRequises({ ...base, forme: "sasu", situationMatrimoniale: "marie_communaute" });
    expect(p).toEqual(expect.arrayContaining(["statuts", "depot_fonds", "annonce_legale"]));
    expect(p).not.toContain("conjoint");
  });

  it("range la fiche dans l'ordre du Guichet unique, avec nature artisanale", () => {
    const f = ficheSaisie(base);
    expect(f[0].titre).toBe("Type de formalité");
    const activite = f.find((r) => r.titre === "Établissement et activité")!;
    expect(activite.lignes.find((l) => l.q === "Nature de l'activité")?.r).toBe("Artisanale");
    expect(f.some((r) => r.titre === "Qualification professionnelle")).toBe(true);
    const fiscal = f.find((r) => r.titre === "Options fiscales et sociales")!;
    expect(fiscal.lignes.find((l) => l.q === "TVA")?.r).toBe("Franchise en base de TVA");
  });

  it("déclare le président comme bénéficiaire effectif d'une SASU", () => {
    const f = ficheSaisie({ ...base, forme: "sasu", denomination: "KB Élec" });
    const societe = f.find((r) => r.titre === "La société")!;
    expect(societe.lignes.find((l) => l.q === "Bénéficiaire effectif")?.r).toContain("100 %");
  });

  it("signale les pièces manquantes et la filiation incomplète", () => {
    const v = pointsDeVigilance({ ...base, merePrenom: "" }, ["identite"]);
    expect(v.some((x) => x.includes("justificatif d'adresse"))).toBe(true);
    expect(v.some((x) => x.includes("Filiation"))).toBe(true);
    expect(v.some((x) => x.includes("non-condamnation") && x.startsWith("Pièce"))).toBe(false);
  });

  it("n'ajoute l'étape commissaire aux apports qu'avec des apports en nature", () => {
    expect(etapesApres({ forme: "sasu", acre: false, apports: "numeraire" }).some((e) => e.titre.includes("apports"))).toBe(false);
    expect(etapesApres({ forme: "sasu", acre: false, apports: "nature" }).some((e) => e.titre.includes("apports"))).toBe(true);
  });

  it("rejette les valeurs hors liste et force la franchise en micro", () => {
    const d = normaliserInpi({ forme: "micro", tva: "reel", local: "chateau", qualifPar: "x" });
    expect(d.tva).toBe("franchise");
    expect(d.local).toBe("domicile");
    expect(d.qualifPar).toBe("moi");
  });
});

describe("archive ZIP", () => {
  it("calcule le CRC32 standard", () => {
    expect(crc32(new TextEncoder().encode("hello"))).toBe(0x3610a686);
  });

  it("produit une archive lisible par unzip", () => {
    const dir = mkdtempSync(join(tmpdir(), "zip-"));
    const file = join(dir, "t.zip");
    writeFileSync(file, zip([
      { nom: "1-fiche.pdf", data: new TextEncoder().encode("%PDF-1.7 fiche") },
      { nom: "pieces/piece-d-identite.pdf", data: new TextEncoder().encode("%PDF-1.7 id") },
    ]));
    const out = execFileSync("python3", ["-c", "import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(','.join(z.namelist()))", file]).toString();
    expect(out.trim()).toBe("1-fiche.pdf,pieces/piece-d-identite.pdf");
  });
});
