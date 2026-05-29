import { defineConfig } from "astro/config";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "portfolio-kei";
const configuredBase = process.env.PUBLIC_BASE_PATH?.trim();
const configuredSiteUrl = process.env.PUBLIC_SITE_URL?.trim();
const base =
  configuredBase
    ? configuredBase
    : process.env.GITHUB_PAGES === "true"
      ? `/${repoName}`
      : "/";
const site = configuredSiteUrl || `https://kakem.github.io/${repoName}`;

export default defineConfig({
  output: "static",
  site,
  base,
});
