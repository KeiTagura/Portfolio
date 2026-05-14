import { site } from "@config/site";

const siteUrl = site.url.endsWith("/") ? site.url : `${site.url}/`;
const sitemapUrl = new URL("sitemap.xml", siteUrl).toString();

export function GET() {
  return new Response(`User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
