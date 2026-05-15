const configuredSiteUrl = import.meta.env.PUBLIC_SITE_URL;

export const site = {
  name: "Kei Portfolio",
  title: "Kei | Game Developer & Technical Artist",
  description:
    "A visual portfolio for a game developer and technical artist focused on realtime tools, shaders, gameplay prototypes, and interactive media.",
  url: configuredSiteUrl || "https://kakem.github.io/portfolio-kei",
  author: "Kei",
  locale: "en_US",
  ogImage: "/og-image.jpg",
  favicon: "/favicon.svg",
  heroVisual: {
    enabled: true,
    mode: "three-ascii-split",
    modelUrl: "/media/hero/hero-model.glb",
    fallbackImage: "/media/hero/hero-fallback.webp",
    asciiSide: "right",
    splitPosition: 0.5,
    asciiResolution: 96,
    enablePointerParallax: true,
    maxPixelRatio: 1.5,
    disableOnMobile: false,
  },
  pages: {
    home: {
      path: "/",
      title: "Kei | Game Developer & Technical Artist",
      description:
        "A visual portfolio for realtime prototypes, technical art, shaders, tools, and game development work.",
    },
    projects: {
      path: "/projects",
      title: "Featured Projects",
      description:
        "Selected projects highlighting game development, technical art, tools, shaders, optimization, and interactive media.",
    },
    gallery: {
      path: "/gallery",
      title: "Gallery",
      description:
        "A visual collection of environments, characters, animation tests, editor tools, 3D assets, pixel art, GIFs, and video work.",
    },
    about: {
      path: "/about",
      title: "About",
      description: "Background, interests, and creative direction as a game developer and technical artist.",
    },
    experience: {
      path: "/experience",
      title: "Experience / Skills",
      description: "Professional experience, technical skills, soft skills, tools, languages, and production background.",
    },
    contact: {
      path: "/contact",
      title: "Contact",
      description: "Download my CV, view professional profiles, or contact me directly.",
    },
  },
  galleryMasonry: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 4,
  },
  pageHeaders: {
    projects: {
      eyebrow: "Selected Work",
      title: "Featured Projects",
      intro:
        "Selected projects highlighting my work in game development, technical art, tools, shaders, optimization, and interactive media.",
      backgroundImage: "/media/page-bg/projects-bg.svg",
      backgroundAlt: "Abstract project showcase background",
      visualAccent: "#57d5ff",
    },
    gallery: {
      eyebrow: "Visual Archive",
      title: "Gallery",
      intro:
        "A visual collection of environments, characters, animation tests, editor tools, 3D assets, pixel art, GIFs, and video work.",
      backgroundImage: "/media/page-bg/gallery-bg.svg",
      backgroundAlt: "Abstract gallery contact sheet background",
      visualAccent: "#ffcf5a",
    },
    about: {
      eyebrow: "Profile",
      title: "About",
      intro: "Background, interests, and creative direction as a game developer and technical artist.",
      backgroundImage: "/media/page-bg/about-bg.svg",
      backgroundAlt: "Abstract portrait and workspace background",
      visualAccent: "#ff6f91",
    },
    experience: {
      eyebrow: "Resume",
      title: "Experience / Skills",
      intro: "Professional experience, technical skills, soft skills, tools, languages, and production background.",
      backgroundImage: "/media/page-bg/experience-bg.svg",
      backgroundAlt: "Abstract production timeline background",
      visualAccent: "#8effd2",
    },
    contact: {
      eyebrow: "Contact",
      title: "Contact",
      intro: "Download my CV, view professional profiles, or contact me directly.",
      backgroundImage: "/media/page-bg/contact-bg.svg",
      backgroundAlt: "Abstract communication links background",
      visualAccent: "#ffcf5a",
    },
  },
};

export type SiteConfig = typeof site;
