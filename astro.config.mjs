import { defineConfig } from "astro/config";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "portfolio-kei";
const configuredBase = process.env.PUBLIC_BASE_PATH;
const base =
  configuredBase
    ? configuredBase
    : process.env.GITHUB_PAGES === "true"
      ? `/${repoName}`
      : "/";
const site = process.env.PUBLIC_SITE_URL ?? "https://kakem.github.io/portfolio-kei";

export default defineConfig({
  output: "static",
  site,
  base,
});
