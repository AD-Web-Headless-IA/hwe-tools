import { z } from 'zod';

export const {Name}Config = z.object({
  // TODO: replace with real behavioral config fields for {Name}
  // Examples:
  //   autoplay:  z.boolean().default(false),
  //   columns:   z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  //   lightbox:  z.boolean().default(false),
});

export type {Name}Config = z.infer<typeof {Name}Config>;
