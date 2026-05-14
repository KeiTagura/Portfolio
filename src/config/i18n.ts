export const defaultLocale = "en";

export const locales = {
  en: {
    label: "English",
    routePrefix: "",
    contentSuffix: "en",
  },
  ja: {
    label: "Japanese",
    routePrefix: "/ja",
    contentSuffix: "ja",
  },
} as const;

export type Locale = keyof typeof locales;
