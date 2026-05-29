import { defineConfig } from "astro/config";

const [repoOwner = "kakem", repoName = "portfolio-kei"] = process.env.GITHUB_REPOSITORY?.split("/") ?? [];
const configuredBase = process.env.PUBLIC_BASE_PATH?.trim();
const configuredSiteUrl = process.env.PUBLIC_SITE_URL?.trim();
const base =
  configuredBase
    ? configuredBase
    : process.env.GITHUB_PAGES === "true"
      ? `/${repoName}`
      : "/";
const site = configuredSiteUrl || `https://${repoOwner}.github.io/${repoName}`;

export default defineConfig({
  output: "static",
  site,
  base,
});
