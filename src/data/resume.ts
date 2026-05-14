export const workExperience = [
  {
    company: "Independent Projects",
    title: "Technical Artist / Gameplay Programmer",
    startDate: "2024-01",
    endDate: "Present",
    location: "Tokyo, Japan / Remote",
    summary:
      "Built realtime visual prototypes, shader experiments, and gameplay systems for small teams and solo projects.",
    bullets: [
      "Created Unity tooling for rapid scene setup and debug visualization.",
      "Prototyped responsive character controllers and camera systems.",
      "Designed procedural material studies for stylized environments.",
    ],
    projectLinks: [
      {
        label: "Realtime Shader Playground",
        href: "/projects",
      },
    ],
  },
  {
    company: "Example Studio",
    title: "Game Development Intern",
    startDate: "2023-06",
    endDate: "2024-03",
    location: "Remote",
    summary:
      "Supported gameplay feature implementation and visual polish for a shipped prototype.",
    bullets: [
      "Implemented UI states and animation hooks with designers.",
      "Optimized scene assets and documented performance constraints.",
      "Contributed bug fixes across gameplay, VFX, and editor scripts.",
    ],
    projectLinks: [],
  },
];

export const hardSkills = [
  {
    category: "Game Engines",
    skills: ["Unity", "Unreal Engine", "Cinemachine", "VFX Graph", "Shader Graph"],
  },
  {
    category: "Programming",
    skills: ["C#", "TypeScript", "JavaScript", "Python", "Gameplay Architecture"],
  },
  {
    category: "Graphics / Shaders",
    skills: ["HLSL", "Toon Lighting", "Post Processing", "Procedural Materials", "Optimization"],
  },
  {
    category: "Tools / Pipeline",
    skills: ["Editor Tooling", "Build Pipelines", "Profiling", "Git", "Documentation"],
  },
  {
    category: "Web",
    skills: ["Astro", "HTML", "CSS", "Static Sites", "Responsive UI"],
  },
  {
    category: "3D / Art Tools",
    skills: ["Blender", "Substance 3D Painter", "Aseprite", "Photoshop", "Figma"],
  },
];

export const softSkills = [
  "Cross-discipline communication",
  "Rapid prototyping",
  "Technical documentation",
  "Performance-minded iteration",
  "Clear handoff with artists and designers",
];

export const languages = [
  { name: "Japanese", level: "Native" },
  { name: "English", level: "Professional working proficiency" },
];

export const resume = {
  workExperience,
  hardSkills,
  softSkills,
  languages,
};
