import Image from 'next/image';
import type { {Name}Content } from './{Name}.types';
import type { {Name}Variants } from './{Name}.variants';
import { {name}Variants } from './{Name}.variants';

export type {Name}Props = {
  content: {Name}Content;
} & {Name}Variants;

// Reads `variant` (the string BlockRenderer passes from BlockInstance.variant)
// and maps it to the CVA recipe — DEC-023. Compose @hwe/core-ui primitives
// (Button, Eyebrow, …) for CTAs and labels instead of restyling atoms (DEC-022).
export function {Name}({ content, variant }: {Name}Props) {
  return (
    <section className={{name}Variants({ variant })}>
      <h2>{content.title}</h2>
      {content.image && (
        <Image
          src={content.image.src}
          alt={content.image.alt}
          width={800}
          height={600}
          loading="lazy"
        />
      )}
    </section>
  );
}
