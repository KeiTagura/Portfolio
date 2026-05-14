import { defaultLocale, type Locale } from "@config/i18n";

export const navItems = [
  { label: "Home", href: "/" },
  { label: "Featured Projects", href: "/projects" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Experience / Skills", href: "/experience" },
  { label: "Contact", href: "/contact" },
];

export const galleryTags = [
  "Environmental",
  "Characters",
  "Animation",
  "Editor Tools",
  "3D Assets",
  "Pixel Art",
] as const;

export const galleryFilters = ["All", ...galleryTags] as const;

export const uiText = {
  en: {
    common: {
      all: "All",
      openProject: "Open project",
      viewProject: "View project",
      responsibilities: "Responsibilities",
      tags: "Tags",
      openMedia: "Open media preview",
      closePreview: "Close preview",
      externalMedia: "Open external media",
      previous: "Previous",
      next: "Next",
      role: "Role",
    },
    sections: {
      projects: {
        eyebrow: "Selected Work",
        title: "Featured Projects",
        compactIntro: "Compact project highlights pulled from content collections.",
        actionLabel: "View all projects",
      },
      gallery: {
        eyebrow: "Visual Archive",
        title: "Gallery",
        compactIntro: "A compact visual preview of environments, characters, animation, tools, assets, and pixel art.",
        actionLabel: "View full gallery",
      },
      about: {
        eyebrow: "Profile",
        title: "About",
        compactIntro: "Background, creative focus, and current availability.",
        actionLabel: "Read profile",
      },
      experience: {
        eyebrow: "Resume",
        title: "Experience / Skills",
        compactIntro: "Resume highlights, production skills, tools, and languages.",
        actionLabel: "View experience",
      },
      contact: {
        eyebrow: "Contact",
        title: "Links & Contact",
        compactIntro: "Primary contact buttons for collaboration, source code, visual portfolio channels, and CV.",
        actionLabel: "View contact links",
      },
    },
  },
  ja: {
    common: {
      all: "All",
      openProject: "Open project",
      viewProject: "View project",
      responsibilities: "Responsibilities",
      tags: "Tags",
      openMedia: "Open media preview",
      closePreview: "Close preview",
      externalMedia: "Open external media",
      previous: "Previous",
      next: "Next",
      role: "Role",
    },
    sections: {
      projects: {
        eyebrow: "Selected Work",
        title: "Featured Projects",
        compactIntro: "Compact project highlights pulled from content collections.",
        actionLabel: "View all projects",
      },
      gallery: {
        eyebrow: "Visual Archive",
        title: "Gallery",
        compactIntro: "A compact visual preview of environments, characters, animation, tools, assets, and pixel art.",
        actionLabel: "View full gallery",
      },
      about: {
        eyebrow: "Profile",
        title: "About",
        compactIntro: "Background, creative focus, and current availability.",
        actionLabel: "Read profile",
      },
      experience: {
        eyebrow: "Resume",
        title: "Experience / Skills",
        compactIntro: "Resume highlights, production skills, tools, and languages.",
        actionLabel: "View experience",
      },
      contact: {
        eyebrow: "Contact",
        title: "Links & Contact",
        compactIntro: "Primary contact buttons for collaboration, source code, visual portfolio channels, and CV.",
        actionLabel: "View contact links",
      },
    },
  },
} as const;

export function getUi(locale: Locale = defaultLocale) {
  return uiText[locale] ?? uiText[defaultLocale];
}
