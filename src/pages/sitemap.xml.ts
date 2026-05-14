import { site } from "@config/site";

const siteUrl = site.url.endsWith("/") ? site.url : `${site.url}/`;

function absoluteUrl(path: string) {
  return new URL(path.replace(/^\//, ""), siteUrl).toString();
}

export function GET() {
  const urls = Object.values(site.pages).map((page) => {
    return `<url><loc>${absoluteUrl(page.path)}</loc></url>`;
  });

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
