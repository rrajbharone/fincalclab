import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Define the Blog collection schema
const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    author: z.string().default('FinCalcLab Team'),
    image: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
  })
});

export const collections = { blog };
