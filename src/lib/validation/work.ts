import { z } from "zod";

export const MediaSchema = z.object({
  kind: z.enum(["image", "video"]),
  srcType: z.enum(["upload", "url"]),
  src: z.string().trim().max(2048),
  poster: z.string().trim().optional(),
  alt: z.string().trim().max(200).optional(),
  focus: z
    .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })
    .optional(),
});

const SlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug.");

const WorkFieldsSchema = z.object({
  title: z.string().trim().min(1).max(80),
  slug: SlugSchema,
  year: z.number().int().min(1970).max(2100),
  tags: z.array(z.string().trim().min(1).max(24)).max(12),
  summary: z.string().trim().max(420),
  client: z.string().trim().max(80),
  role: z.string().trim().max(80),
  problem: z.string().trim().max(900),
  solution: z.string().trim().max(900),
  result: z.string().trim().max(900),
  link: z.union([z.literal(""), z.string().trim().url().max(2048)]),
  published: z.boolean(),
  media: MediaSchema,
});

export const MISSING_MEDIA_MESSAGE = "Published works must have media.";

export const WorkInputSchema = WorkFieldsSchema.partial({
  year: true,
  summary: true,
  client: true,
  role: true,
  problem: true,
  solution: true,
  result: true,
  link: true,
}).superRefine(
  (work, ctx) => {
    if (work.published && !work.media.src.trim()) {
      ctx.addIssue({ code: "custom", path: ["media", "src"], message: MISSING_MEDIA_MESSAGE });
    }
  },
);

export const WorkPatchSchema = WorkFieldsSchema.partial();
