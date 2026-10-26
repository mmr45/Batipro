import { SITE_URL } from "./utils";

export function seo({ title, description, path, noindex }: { title: string; description: string; path: string; noindex?: boolean }) {
  const full = title.includes("Bâtipro") ? title : `${title} | Bâtipro`;
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title: full },
      { name: "description", content: description },
      { property: "og:title", content: full },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:image", content: `${SITE_URL}/og-image.png` },
      { name: "twitter:card", content: "summary_large_image" },
      ...(noindex ? [{ name: "robots", content: "noindex" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
