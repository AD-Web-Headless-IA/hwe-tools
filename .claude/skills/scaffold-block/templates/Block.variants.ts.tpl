import { cva, type VariantProps } from 'class-variance-authority';

// The block's primary variant axis is exposed as `variant` — the string
// BlockRenderer passes from BlockInstance.variant (DEC-023). Replace the
// placeholder keys with the real layout/style variants for this block
// (e.g. 'media-left' | 'media-right'). If you ran with --variants, these are
// already filled in.
export const {name}Variants = cva('', {
  variants: {
    variant: {
      // TODO: replace with the real variants for this block.
      'variant-a': '',
      'variant-b': '',
    },
  },
  defaultVariants: {
    variant: 'variant-a',
  },
});

export type {Name}Variants = VariantProps<typeof {name}Variants>;
