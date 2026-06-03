import Image from 'next/image';
import type { {Name}Content } from './{Name}.types';
import type { {Name}Variants } from './{Name}.variants';
import { {name}Variants } from './{Name}.variants';

export type {Name}Props = {
  content: {Name}Content;
} & {Name}Variants;

export function {Name}({ content, tone }: {Name}Props) {
  return (
    <section className={{name}Variants({ tone })} aria-labelledby="{name}-heading">
      <h2 id="{name}-heading">{content.title}</h2>
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
