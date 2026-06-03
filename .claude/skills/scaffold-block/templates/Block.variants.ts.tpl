import { cva, type VariantProps } from 'class-variance-authority';

export const {name}Variants = cva(
  'block-base',
  {
    variants: {
      // TODO: replace these placeholder variants with the real CVA recipe.
      // Reference: docs/frontend/block-contract.md ("The variants").
      tone: {
        light: 'bg-surface',
        dark: 'bg-primary text-on-dark',
      },
    },
    defaultVariants: {
      tone: 'light',
    },
  }
);

export type {Name}Variants = VariantProps<typeof {name}Variants>;
