import { z } from 'zod';

export const {Name}Content = z.object({
  title: z.string().min(1),
  // TODO: replace these placeholder fields with the real content shape.
  // Reference: docs/frontend/block-contract.md ("The schema").
  image: z.object({
    src: z.string().url(),
    alt: z.string(),
    decorative: z.boolean().optional(),
  }).optional(),
});

export type {Name}Content = z.infer<typeof {Name}Content>;
