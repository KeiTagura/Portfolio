import { defineCollection, z } from "astro:content";

const mediaType = z.enum(["image", "gif", "localVideo", "youtube", "vimeo", "x", "bluesky", "reddit"]);
const galleryTag = z.enum(
  ["Environmental",
  "Characters",
  "Animation",
  "Editor Tools",
  "3D Assets",
  "Pixel Art",
  "FX",
  "UI/UX",
  "Texture/Shaders",]);

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(true),
    thumbnail: z.string(),
    mediaType,
    mediaSrc: z.string(),
    projectUrl: z.string().optional(),
    role: z.string(),
    responsibilities: z.array(z.string()).default([]),
    description: z.string(),
    order: z.number().default(0),
  }),
});

const gallery = defineCollection({
  type: "content",
  schema: z
    .object({
      title: z.string(),
      thumbnail: z.string().optional(),
      mediaType,
      mediaSrc: z.string(),
      webmSrc: z.string().optional(),
      mp4Src: z.string().optional(),
      tags: z.array(galleryTag).default([]),
      description: z.string().default(""),
      lightboxTitle: z.string().optional(),
      lightboxDescription: z.string().optional(),
      showLightboxTitle: z.boolean().default(true),
      showLightboxDescription: z.boolean().default(true),
      order: z.number().default(0),
      override: z.number().optional(),
    })
    .superRefine((data, context) => {
      if (data.mediaType !== "image" && !data.thumbnail) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["thumbnail"],
          message: "Gallery items that are not images need a manually provided thumbnail.",
        });
      }
    }),
});

const about = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    role: z.string(),
    portrait: z.string(),
    location: z.string(),
    availability: z.string(),
    focus: z.array(z.string()).default([]),
  }),
});

export const collections = {
  projects,
  gallery,
  about,
};
