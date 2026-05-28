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
  "FX",
  "UI/UX",
  "Texture/Shaders",
] as const;

export const galleryFilters = ["All", ...galleryTags] as const;

export const uiText = {
  en: {
    common: {
      all: "All",
      openProject: "Open project",
      viewProject: "View project",
      projectLink: "Link",
      responsibilities: "Responsibilities",
      tags: "Tags",
      openMedia: "Open media preview",
      closePreview: "Close",
      externalMedia: "Open external media",
      previous: "Previous",
      next: "Next",
      role: "Role",
    },
    sections: {
      projects: {
        eyebrow: "Selected Work",
        title: "Featured Projects",
        compactIntro: "",
        actionLabel: "View all projects",
      },
      gallery: {
        eyebrow: "Visual Archive",
        title: "Gallery",
        compactIntro: "",
        actionLabel: "View full gallery",
      },
      about: {
        eyebrow: "Profile",
        title: "About",
        compactIntro: "",
        actionLabel: "Read profile",
      },
      experience: {
        eyebrow: "Resume",
        title: "Experience / Skills",
        compactIntro: "",
        actionLabel: "View all experience",
      },
      contact: {
        eyebrow: "Contact",
        title: "Links & Contact",
        compactIntro: "",
        actionLabel: "",
      },
    },
  },
  ja: {
    common: {
      all: "All",
      openProject: "Open project",
      viewProject: "View project",
      projectLink: "Link",
      responsibilities: "Responsibilities",
      tags: "Tags",
      openMedia: "Open media preview",
      closePreview: "Close",
      externalMedia: "Open external media",
      previous: "Previous",
      next: "Next",
      role: "Role",
    },
    sections: {
      projects: {
        eyebrow: "Selected Work",
        title: "Featured Projects",
        compactIntro: "",
        actionLabel: "View all projects",
      },
      gallery: {
        eyebrow: "Visual Archive",
        title: "Gallery",
        compactIntro: "",
        actionLabel: "View full gallery",
      },
      about: {
        eyebrow: "Profile",
        title: "About",
        compactIntro: "",
        actionLabel: "Read profile",
      },
      experience: {
        eyebrow: "Resume",
        title: "Experience / Skills",
        compactIntro: "",
        actionLabel: "View all experience",
      },
      contact: {
        eyebrow: "Contact",
        title: "Links & Contact",
        compactIntro: "",
        actionLabel: "",
      },
    },
  },
} as const;

export function getUi(locale: Locale = defaultLocale) {
  return uiText[locale] ?? uiText[defaultLocale];
}
