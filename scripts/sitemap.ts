// Génère public/sitemap.xml à partir des métiers et des pages publiques.
import { writeFileSync } from "node:fs";
import { METIERS_GUIDES } from "../supabase/functions/_shared/rules/metiers.ts";
import { REGLES_VERSION } from "../supabase/functions/_shared/rules/reglementation.ts";

const SITE = "https://batipro-ten.vercel.app";
const pages: [string, string, number][] = [
  ["/", "weekly", 1.0],
  ["/tarifs", "monthly", 0.8],
  ["/outils/qualification", "monthly", 0.9],
  ["/outils/statut", "monthly", 0.9],
  ["/outils/inpi", "monthly", 0.7],
  ["/outils/assurance", "monthly", 0.7],
  ["/outils/devis", "monthly", 0.8],
  ["/reglementation", "monthly", 0.7],
  ["/guides", "monthly", 0.8],
  ...METIERS_GUIDES.map((m) => [`/guides/${m.slug}`, "monthly", 0.7] as [string, string, number]),
  ["/legal/mentions-legales", "yearly", 0.2],
  ["/legal/cgv", "yearly", 0.2],
  ["/legal/confidentialite", "yearly", 0.2],
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(([p, f, pr]) => `  <url><loc>${SITE}${p}</loc><lastmod>${REGLES_VERSION}</lastmod><changefreq>${f}</changefreq><priority>${pr.toFixed(1)}</priority></url>`)
  .join("\n")}
</urlset>
`;
writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
console.log(`sitemap.xml : ${pages.length} URLs`);
