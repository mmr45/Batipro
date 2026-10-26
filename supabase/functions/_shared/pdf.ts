// Petit moteur de mise en page au-dessus de pdf-lib : pages A4, marges,
// retour à la ligne automatique, saut de page, en-tête et pied de page.
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb, type RGB } from "npm:pdf-lib@1.17.1";
import { LOGO_BATIPRO_PNG_BASE64 } from "./logo.ts";

export const A4: [number, number] = [595.28, 841.89];
export const MARGE = 44;
export const LARGEUR = A4[0] - MARGE * 2;

export const C = {
  encre: rgb(0.09, 0.1, 0.12),
  gris: rgb(0.38, 0.4, 0.44),
  grisClair: rgb(0.6, 0.62, 0.65),
  filet: rgb(0.86, 0.87, 0.89),
  fond: rgb(0.965, 0.968, 0.975),
  marque: rgb(0.114, 0.373, 0.639), // #1D5FA3
  marqueClair: rgb(0.91, 0.94, 0.98),
  orange: rgb(0.85, 0.47, 0.02),
  blanc: rgb(1, 1, 1),
};

/**
 * Les polices standard PDF (Helvetica, encodage WinAnsi) ne savent pas
 * afficher tous les caractères Unicode : on remplace les plus courants
 * et on supprime ceux qui feraient planter pdf-lib.
 */
export function clean(input: unknown): string {
  const s = String(input ?? "")
    .replace(/[    ]/g, " ")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(/[✓✔]/g, "v")
    .replace(/\r/g, "");
  // Ne garde que les caractères encodables en WinAnsi (Latin-1 + quelques extras).
  return [...s]
    .filter((ch) => {
      const c = ch.codePointAt(0)!;
      return c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || "€œŒšŠžŽŸ‚ƒ„†‡ˆ‰‹›•˜™".includes(ch);
    })
    .join("");
}

export function euro(n: number): string {
  return clean(
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number.isFinite(n) ? n : 0),
  );
}

export function dateFr(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface TextOpts {
  size?: number;
  bold?: boolean;
  color?: RGB;
  x?: number;
  width?: number;
  lineHeight?: number;
  align?: "left" | "right";
}

export class Pdf {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;
  piedDePage = "";
  pages: PDFPage[] = [];

  static async create(piedDePage = ""): Promise<Pdf> {
    const p = new Pdf();
    p.doc = await PDFDocument.create();
    p.font = await p.doc.embedFont(StandardFonts.Helvetica);
    p.bold = await p.doc.embedFont(StandardFonts.HelveticaBold);
    p.piedDePage = piedDePage;
    p.newPage();
    return p;
  }

  newPage() {
    this.page = this.doc.addPage(A4);
    this.pages.push(this.page);
    this.y = A4[1] - MARGE;
  }

  ensure(h: number) {
    if (this.y - h < MARGE + 28) this.newPage();
  }

  wrap(text: string, size: number, width: number, bold = false): string[] {
    const f = bold ? this.bold : this.font;
    const lines: string[] = [];
    for (const para of clean(text).split("\n")) {
      const words = para.split(/\s+/).filter(Boolean);
      let cur = "";
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (f.widthOfTextAtSize(test, size) <= width) cur = test;
        else {
          if (cur) lines.push(cur);
          // mot plus long que la ligne : on le coupe
          let rest = w;
          while (f.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
            let i = rest.length;
            while (i > 1 && f.widthOfTextAtSize(rest.slice(0, i), size) > width) i--;
            lines.push(rest.slice(0, i));
            rest = rest.slice(i);
          }
          cur = rest;
        }
      }
      lines.push(cur);
    }
    return lines;
  }

  /** Écrit un paragraphe à partir de this.y, gère les sauts de page. Retourne la hauteur. */
  text(text: string, o: TextOpts = {}): number {
    const size = o.size ?? 9.5;
    const lh = o.lineHeight ?? size * 1.38;
    const x = o.x ?? MARGE;
    const width = o.width ?? LARGEUR - (x - MARGE);
    const f = o.bold ? this.bold : this.font;
    const lines = this.wrap(text, size, width, o.bold);
    for (const line of lines) {
      this.ensure(lh);
      const dx = o.align === "right" ? width - f.widthOfTextAtSize(line, size) : 0;
      this.page.drawText(line, { x: x + dx, y: this.y - size, size, font: f, color: o.color ?? C.encre });
      this.y -= lh;
    }
    return lines.length * lh;
  }

  /** Texte posé à une position fixe, sans retour à la ligne ni gestion de page. */
  at(text: string, x: number, y: number, o: TextOpts = {}) {
    const size = o.size ?? 9.5;
    const f = o.bold ? this.bold : this.font;
    const t = clean(text);
    const dx = o.align === "right" ? -f.widthOfTextAtSize(t, size) : 0;
    this.page.drawText(t, { x: x + dx, y, size, font: f, color: o.color ?? C.encre });
  }

  space(h: number) {
    this.y -= h;
  }

  rule(color = C.filet, thickness = 0.7) {
    this.page.drawLine({ start: { x: MARGE, y: this.y }, end: { x: MARGE + LARGEUR, y: this.y }, thickness, color });
  }

  heading(label: string) {
    this.ensure(40);
    this.space(6);
    this.text(label.toUpperCase(), { size: 8, bold: true, color: C.marque });
    this.space(2);
    this.rule();
    this.space(8);
  }

  /** Paire libellé / valeur sur deux colonnes. */
  field(label: string, value: string, labelWidth = 150) {
    const size = 9.5;
    const lines = this.wrap(value || "—", size, LARGEUR - labelWidth);
    const lh = size * 1.38;
    this.ensure(lh * lines.length);
    this.page.drawText(clean(label), { x: MARGE, y: this.y - size, size, font: this.font, color: C.gris });
    for (const line of lines) {
      this.page.drawText(line, { x: MARGE + labelWidth, y: this.y - size, size, font: this.font, color: C.encre });
      this.y -= lh;
    }
  }

  async logo(dataUrl?: string): Promise<PDFImage> {
    const m = (dataUrl ?? "").match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/);
    if (m) {
      try {
        const bytes = base64ToBytes(m[2]);
        return m[1] === "png" ? await this.doc.embedPng(bytes) : await this.doc.embedJpg(bytes);
      } catch (e) {
        console.warn("Logo illisible, logo Bâtipro utilisé :", e);
      }
    }
    return this.doc.embedPng(base64ToBytes(LOGO_BATIPRO_PNG_BASE64));
  }

  drawImageFit(img: PDFImage, x: number, y: number, maxW: number, maxH: number) {
    const s = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = img.width * s;
    const h = img.height * s;
    this.page.drawImage(img, { x, y: y - h, width: w, height: h });
    return { w, h };
  }

  /** Pied de page + numérotation sur toutes les pages créées par ce moteur. */
  finalize(): Promise<Uint8Array> {
    const total = this.pages.length;
    this.pages.forEach((p, i) => {
      p.drawLine({ start: { x: MARGE, y: MARGE }, end: { x: MARGE + LARGEUR, y: MARGE }, thickness: 0.5, color: C.filet });
      const pied = clean(this.piedDePage);
      if (pied) p.drawText(pied, { x: MARGE, y: MARGE - 12, size: 7, font: this.font, color: C.grisClair });
      const num = `${i + 1} / ${total}`;
      p.drawText(num, {
        x: MARGE + LARGEUR - this.font.widthOfTextAtSize(num, 7),
        y: MARGE - 12,
        size: 7,
        font: this.font,
        color: C.grisClair,
      });
    });
    return this.doc.save();
  }
}

export { rgb, PDFDocument };
