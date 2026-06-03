# Coding standards

> Practical coding rules for hwe frontend. Extends [`base-standards.md`](../general/base-standards.md) and [`frontend-standards.md`](frontend-standards.md) — read those first.
> This file is the day-to-day reference. It does not repeat rules from the parent files; it elaborates them with hwe-specific guidance.

## Core principles

| Principle | Rule |
|---|---|
| **Baby steps** | One task at a time. Finish, test, commit before starting the next. |
| **TDD first** | Write the test before the implementation. If you cannot write the test, the spec is not clear enough — clarify first. |
| **Type safety** | Every identifier has a type. `unknown` + narrowing over `any`. No compiler silencing. |
| **Clear naming** | Names are documentation. If a name needs a comment to explain it, rename it. No abbreviations (`acc`, `tmp`, `btn`) unless domain-standard (`url`, `id`, `api`). |
| **Incremental changes** | Focused changes only. Never refactor surrounding code while fixing a bug. Never "clean up while I'm here" without an explicit task. |

## Component structure

### One file, one component

One component per file. Filename and component name must match exactly:
`HeroBlock.tsx` → `export function HeroBlock(…)`.

### Props: interface + destructured parameter

```tsx
// Always a type alias, always destructured at the parameter
// (use interface only when declaration merging or extends hierarchy is needed)
type HeroBlockProps = {
  content: HeroBlockContent;
  variant?: HeroVariant;
};

export function HeroBlock({ content, variant = 'default' }: HeroBlockProps) { … }
```

Never `React.FC<Props>` — it hides the return type and disables generic inference.

### Named exports always

```tsx
// pages — Next.js requires default, so only exception
export default function LeCampingPage() { … }

// everything else — named export
export function HeroBlock(…) { … }
export type { HeroBlockProps };
```

### Internal order

Every component file follows this order (no exceptions):

```
1. Imports (grouped — see below)
2. Types and interfaces
3. Top-level constants (CVA recipes, schema refs)
4. Pure helper functions (formatPrice, clamp…)
5. The component function
6. Any sub-components defined in the same file
7. Exports
```

### Import grouping

Three blocks, separated by a blank line, in this order:

```tsx
// 1. External packages
import Image from 'next/image';
import { cva } from 'class-variance-authority';

// 2. @hwe/* packages — use the correct subpath (DEC-015)
import type { HeroBlockContent } from '@hwe/core-ui/schemas';   // Zod schemas + derived types
import { HeroBlock as BaseHero } from '@hwe/core-ui/base-blocks'; // reference implementations
import { BlockRenderer, cn } from '@hwe/core-ui';                 // root: primitives, renderer, providers

// 3. Relative imports (never crossing a package boundary)
import { heroVariants } from './HeroBlock.variants';
import type { HeroVariant } from './HeroBlock.types';
```

**Subpath export rules (DEC-015):**
- `@hwe/core-ui` — primitives, `BlockRenderer`, providers, theme utilities, types.
- `@hwe/core-ui/schemas` — Zod content + config schemas and derived TypeScript types. Use when you only need data shape, not a component.
- `@hwe/core-ui/base-blocks` — reference block implementations. Use at Level 1 (re-export) or Level 2 (slot override).
- No deep imports (`@hwe/core-ui/src/...`). If the subpath does not expose it, it is private.

---

## TypeScript strict

`strict: true` is inherited from `tsconfig.base.json`. Below are the hwe-specific corollaries:

### Never `any`

```tsx
// Bad
function parsePayload(data: any) { return data.blocks; }

// Good
function parsePayload(data: unknown) {
  const parsed = BlockArraySchema.parse(data); // Zod narrows to the correct type
  return parsed;
}
```

### Never `@ts-ignore`

```tsx
// Bad
// @ts-ignore
const result = legacyFn();

// Acceptable — with mandatory explanation
// @ts-expect-error: legacyFn has no types and the package has no @types — tracked in TODO-112
const result = legacyFn();
```

### Never `as` to silence the compiler

```tsx
// Bad — hides real type errors
const user = data as User;

// Good — `as` only after a schema parse has already validated the shape
const user = UserSchema.parse(data); // type is inferred as User
```

### Discriminated unions over boolean flags

```tsx
// Bad — four booleans produce 16 logical states, most impossible
type SearchState = {
  isLoading: boolean;
  hasError: boolean;
  isEmpty: boolean;
  hasResults: boolean;
};

// Good — exactly the states that can occur
type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; results: Accommodation[] };
```

### No enums — use `as const`

```tsx
// Bad
enum BlockType { Hero = 'HeroBlock', Gallery = 'GalleryBlock' }

// Good
const BLOCK_TYPES = ['HeroBlock', 'GalleryBlock'] as const;
type BlockType = (typeof BLOCK_TYPES)[number];
```

---

## React patterns

### State: `useState` vs `useReducer`

- `useState` for simple, independent values (a toggle, a field value, a counter).
- `useReducer` when two or more state values change together or depend on each other.

```tsx
// Good — simple toggle
const [isOpen, setIsOpen] = useState(false);

// Good — form state with multiple interdependent fields
const [state, dispatch] = useReducer(bookingReducer, initialBookingState);
```

### `useMemo` and `useCallback` — only with measured evidence

These hooks have a cost. Add them only after profiling shows a real render bottleneck, not preemptively.

### Never `useEffect` to derive data from props

```tsx
// Bad — derived state via effect (double render + stale state risk)
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(`${firstName} ${lastName}`); }, [firstName, lastName]);

// Good — derived inline (no effect needed)
const fullName = `${firstName} ${lastName}`;
```

### Event handler naming

Prefix with `handle` + the event noun:

```tsx
function handleSubmit(event: React.FormEvent) { … }
function handleToggleMenu() { … }
function handleDateChange(date: Date) { … }
```

### Conditional rendering

Use `&&` for presence/absence, ternary for one-or-another. Never nested ternaries.

```tsx
// Good — presence guard
{hasSpa && <SpaSection content={content.spa} />}

// Good — one-or-another
{isLoading ? <Spinner /> : <Results data={results} />}

// Bad — nested ternary
{isLoading ? <Spinner /> : hasError ? <Error /> : <Results />}
// ↑ extract to a helper function or use early returns instead
```

### Never `dangerouslySetInnerHTML`

If content comes from a user or an external source, it can contain XSS payloads. Use a sanitization library if rich text rendering is unavoidable, and document the security review.

---

## CSS / Tailwind

- **ONE `globals.css` per client, ZERO CSS per block.** Each client site has exactly one `src/app/globals.css` (containing `@font-face`, `:root` token variables, `@keyframes`, third-party widget overrides, and `@media print`). Blocks use only Tailwind utility classes and CVA recipes — no `.css` file next to a block component, ever.
- **Utility classes for everything.** No CSS-in-JS, no `style={{ color: 'red' }}` except for truly dynamic values Tailwind cannot express (e.g. a CSS custom property computed at runtime).
- **Tokens always via Tailwind utilities.** Never `text-[#3D2B1F]` when `text-brand-primary` exists in the token set.
- **CVA for variants.** Never build class strings with manual conditionals:

```tsx
// Bad
const classes = `px-4 py-2 ${variant === 'primary' ? 'bg-brand-primary text-white' : 'bg-transparent border'}`;

// Good
const buttonVariants = cva('px-4 py-2 rounded', {
  variants: {
    variant: {
      primary: 'bg-brand-primary text-white',
      ghost: 'bg-transparent border border-current',
    },
  },
  defaultVariants: { variant: 'primary' },
});
```

- **Mobile-first responsive.** Base classes target mobile; breakpoint prefixes (`md:`, `lg:`) add larger-screen overrides. Never desktop-first.

---

## Images (Next.js)

See also `frontend-standards.md` §Performance and `docs/specs/seo/semantic-html.md`.

- **Always `<Image>` from `next/image`.** Never native `<img>` in production code.
- **Always explicit `width` and `height`.** They prevent CLS (layout shift).
- **Hero / above-the-fold → `priority`.** This emits a `<link rel="preload">` and `fetchpriority="high"`.
- **Everything else → `loading="lazy"`** (Next.js default — do not omit it, make it explicit).

```tsx
// Hero image
<Image src={src} alt={alt} width={1440} height={600} priority />

// Content image
<Image src={src} alt={alt} width={800} height={500} loading="lazy" />
```

---

## Error handling

- **Never swallow exceptions silently.** A try/catch with an empty catch block hides bugs.
- **Zod `.parse()` at every boundary.** Inside a package, trust your own types.
- **User-facing errors go to the UI.** System errors get logged + a graceful fallback rendered.
- **No defensive error handling for impossible states.** If TypeScript says a path is unreachable, trust it — don't add a `try/catch` around code that cannot throw.

```tsx
// Bad — silent swallow
try {
  await sendBooking(data);
} catch { /* nothing */ }

// Good — surface and handle
try {
  await sendBooking(data);
} catch (err) {
  logger.error('sendBooking failed', { err, data });
  setError('Booking could not be completed. Please try again.');
}
```

---

## Comments

Write the **why**, never the **what**. Well-named identifiers already explain what.

| Tag | Use for |
|---|---|
| `// Why:` | A non-obvious constraint, invariant, or workaround |
| `// TODO:` | Known debt — include a ticket reference (`// TODO: US-042`) |
| `// HACK:` | Workaround for a specific bug — document what breaks if removed |

**Never commit commented-out code.** Git has the history.

```tsx
// Bad
// const oldPrice = price * 1.1; // old tax calculation

// Bad — explains the what
// Loop over all blocks
for (const block of blocks) { … }

// Good — explains the why
// Why: Payload returns blocks sorted by `order` but client compositions
// may override that order — we re-sort here to guarantee visual consistency.
const sorted = blocks.slice().sort((a, b) => a.order - b.order);
```

---

## Tests

Rules from `base-standards.md` §Testing apply. hwe-specific elaborations:

- **Behavior-named, not implementation-named:**

```ts
// Bad
it('calls handleSubmit when button is clicked', …)

// Good
it('submits the booking form when the guest clicks Reserve', …)
```

- **One principal assertion per test.** A test should fail for exactly one reason.
- **Minimal fake data.** Build only the properties the test actually exercises. Use a factory helper for the rest.
- **Never mock React or Next.js internals.** Test your code against the real framework. If you cannot test without mocking the framework, extract the logic out of the component.

---

## Multi-tenant rules

These rules exist because hwe serves up to 300 independent clients from a shared codebase.

- **No `if (client === '...')` anywhere in `packages/`.** Client-specific behavior belongs in the client's independent repo (`site-{slug}/`) or in `client.config.ts`.
- **Generic names in `packages/`.** `AccommodationGridBlock`, not `BungalowsGrid`. The block renders any accommodation type; the client's composition chooses what to pass in.
- **Every DB query scoped by `tenantId`.** A query without `where: { tenantId }` is a data isolation bug.
- **Client-specific blocks live in the client repo, not in `packages/`.** Per DEC-015, `site-{slug}/src/blocks/` holds the client's block implementations (re-exports, slot-customized, or full custom). Only platform-reusable blocks belong in `packages/core-ui/src/base-blocks/`.
- **Per-client overrides go in `site-{slug}/`:** blocks, compositions, tokens, content, route metadata.

---

## Anti-patterns

| Never do this | Do this instead | Why |
|---|---|---|
| `any` | `unknown` + Zod parse or narrowing | `any` silently bypasses the type system |
| `@ts-ignore` | `@ts-expect-error` + comment | Hiding errors doesn't fix them |
| `as SomeType` mid-logic | `Schema.parse(data)` | `as` is a lie to the compiler |
| `enum` | `as const` + derived union | Enums produce extra runtime artifacts and behave unexpectedly with `keyof` |
| `<img>` | `<Image>` from `next/image` | `<img>` bypasses lazy loading, sizing, and the LCP preload pipeline |
| Inline `style={{ color: … }}` | Tailwind utility or CSS custom property | Inline styles can't be responsive, themed, or overridden by design tokens |
| Manual class concatenation | CVA recipe | Manual concatenation breaks when variants multiply |
| `useEffect` to derive state from props | Compute inline | Effect-derived state causes double renders and stale reads |
| Nested ternaries in JSX | Helper function or early-return | Nested ternaries are unreadable and untestable |
| Silent `catch {}` | Log + UI error state | Silent errors hide real bugs in production |
| `if (client === 'camping-x')` in `packages/` | Config or composition in `apps/site-{slug}/` | Hard-codes client names into shared code |
| Deep import `@hwe/core-ui/src/blocks/Hero` | `import { HeroBlock } from '@hwe/core-ui/base-blocks'` (Level 1) or `@hwe/core-ui/schemas` for types only | Breaks when internal structure changes; violates package encapsulation |
| CSS file next to a block component (`HeroBlock.css`, `HeroBlock.module.css`) | Tailwind utilities + CVA recipe only | One `globals.css` per client, ZERO CSS per block (DEC-015) |
| `dangerouslySetInnerHTML` | Sanitized renderer or plain text | Raw HTML from external sources enables XSS |
| Comment explaining **what** | Rename the function/variable | Comments rot; names are refactored |

---

## In simple terms

Think of this document as the house rules for a shared codebase. Like a WordPress plugin on WordPress.org must follow strict coding standards so any developer can read and maintain it — hwe has the same requirement, because the platform is shared across up to 300 client sites and an entire team.

**WordPress equivalent:** this is our `WPCS` (WordPress Coding Standards) — but for React/TypeScript/Tailwind instead of PHP.

**Day-to-day impact:** before submitting any code, check against the anti-patterns table at the bottom of this file. If your PR does any of those things, fix it first. The review will catch it anyway, and fixing it early is cheaper.
