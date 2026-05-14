export const links = {
  email: "mailto:hello@example.com",
  emailAddress: "hello@example.com",
  github: "https://github.com/example",
  artstation: "https://www.artstation.com/example",
  itch: "https://example.itch.io",
  linkedin: "https://www.linkedin.com/in/example",
  youtube: "https://www.youtube.com/@example",
  x: "https://x.com/example",
  bluesky: "https://bsky.app/profile/example.bsky.social",
  cv: "/cv.pdf",
};

export const primaryContactLinks = [
  {
    label: "Download CV",
    href: links.cv,
    detail: "PDF resume",
    kind: "download",
    primary: true,
  },
  {
    label: "LinkedIn",
    href: links.linkedin,
    detail: "Professional profile",
    kind: "profile",
    primary: true,
  },
  {
    label: "Email",
    href: links.email,
    detail: links.emailAddress,
    kind: "email",
    primary: true,
  },
];

export const profileLinks = [
  {
    label: "GitHub",
    href: links.github,
    detail: "Tools, prototypes, and source samples",
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
];

export const contactLinks = [...primaryContactLinks, ...profileLinks];
