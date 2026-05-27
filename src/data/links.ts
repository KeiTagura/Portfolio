export const links = {
  email: "mailto:GrantKlein@Outlook.jp",
  emailAddress: "GrantKlein@Outlook.jp",
  github: "https://github.com/KeiTagura",
  portfolio: "https://keitagura.portfoliobox.net",
  artstation: "",
  itch: "",
  linkedin: "",
  youtube: "",
  x: "",
  bluesky: "",
  cv: "/cv.pdf",
};

export type ContactLink = {
  label: string;
  href: string;
  detail: string;
  kind?: "download" | "email" | "profile";
  primary?: boolean;
};

export const primaryContactLinks: ContactLink[] = [
  {
    label: "Download CV",
    href: links.cv,
    detail: "PDF resume",
    kind: "download",
    primary: true,
  },
   {
    label: "GitHub",
    href: links.github,
    detail: "Code, tools, and prototypes",
    kind: "profile",
  },
  {
    label: "Email",
    href: links.email,
    detail: links.emailAddress,
    kind: "email",
    primary: true,
  },
];

export const profileLinks: ContactLink[] = [
  /*
  {
    label: "GitHub",
    href: links.github,
    detail: "Code, tools, and prototypes",
    kind: "profile",
  },
  {
    label: "Portfolio",
    href: links.portfolio,
    detail: "Visual and project portfolio",
    kind: "profile",
  },
  {
    label: "LinkedIn",
    href: links.linkedin,
    detail: "Professional profile",
    kind: "profile",
  },
  {
    label: "Itch.io",
    href: links.itch,
    detail: "Playable experiments and jam projects",
    kind: "profile",
  },
  {
    label: "ArtStation",
    href: links.artstation,
    detail: "Realtime visuals and material studies",
    kind: "profile",
  },
  {
    label: "YouTube",
    href: links.youtube,
    detail: "Video breakdowns and captures",
    kind: "profile",
  },
  {
    label: "X",
    href: links.x,
    detail: "Short updates and experiments",
    kind: "profile",
  },
  {
    label: "Bluesky",
    href: links.bluesky,
    detail: "Social updates and work in progress",
    kind: "profile",
  },
  */
];

export const contactLinks = [...primaryContactLinks, ...profileLinks].filter((link) => Boolean(link.href));
