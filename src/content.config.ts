import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const officers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/officers' }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    order: z.number(),
    image: z.string().optional(),
    email: z.string().optional(),
    bio: z.string().optional(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    endDate: z.string().optional(),
    time: z.string().optional(),
    location: z.string().optional(),
    description: z.string(),
    image: z.string().optional(),
    recurring: z.boolean().default(false),
    recurringSchedule: z.string().optional(),
    category: z.enum(['dining', 'social', 'charity', 'meeting', 'rental', 'pool', 'other']).default('other'),
    ticketPrice: z.number().optional(),
    ticketId: z.string().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    author: z.string().optional(),
    image: z.string().optional(),
    excerpt: z.string(),
    featured: z.boolean().default(false),
  }),
});

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gallery' }),
  schema: z.object({
    title: z.string(),
    date: z.string().optional(),
    images: z.array(
      z.object({
        src: z.string(),
        alt: z.string(),
        caption: z.string().optional(),
      })
    ),
    category: z.string().optional(),
  }),
});

const rentals = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/rentals' }),
  schema: z.object({
    title: z.string(),
    price: z.number(),
    depositAmount: z.number(),
    capacity: z.number(),
    image: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    order: z.number().default(0),
  }),
});

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    price: z.number(),
    description: z.string(),
    image: z.string().optional(),
    category: z.enum(['pool-pass', 'merchandise', 'dues', 'ticket', 'other']).default('other'),
    snipcartId: z.string(),
    available: z.boolean().default(true),
  }),
});

export const collections = {
  officers,
  events,
  news,
  gallery,
  rentals,
  products,
};
