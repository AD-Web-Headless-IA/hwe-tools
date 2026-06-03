# DEC-016 — Design agent: visual language extraction and block design without Figma reference

> **Status:** Proposed
> **Date:** 2026-06-01
> **Extends:** DEC-002 (Figma Make import), DEC-014 (Agent system), DEC-015 (Client-owned blocks)
> **Depends on:** DEC-015 must be executed first (base-blocks, schemas, slots)

---

## Part 1 — The Decision

### Context

The current workflow assumes every block has a Figma reference:

```
Figma design → /import-figma → tokens + analysis → implement block
```

In reality, the designer delivers 5–6 base pages per client. After that, the team needs to create blocks and pages that were **never designed in Figma**: a gallery with animations, a rates page with tabs, a seasonal offers landing, a FAQ section. Someone must make the visual decisions — layout, spacing, typography hierarchy, interaction style, animation approach.

Today, no one in the system fills this role:

1. **`ux-ui-analyst`** only **validates** implementations against existing Figma. If there is no Figma, the agent has nothing to compare against and cannot help.

2. **`/import-figma`** extracts tokens (colors, fonts, spacing, radii, shadows) but not the **design patterns** — the visual language that makes a client's site feel cohesive. Two clients can share the same teal palette but look completely different because one uses cards with shadows and rounded corners while the other uses flat sections with sharp borders.

3. **Developers improvise.** When building a block without Figma, they make spacing/layout/hierarchy decisions ad hoc. With 300 clients, this produces visual inconsistency within a single site — the hero follows the designer's style, the FAQ section looks generic.

### Decision

Three additions to the hwe tooling system:

#### 1. Design language extraction (amplify `/import-figma`)

When `/import-figma` processes a client's Figma Make repo, it now produces an additional artifact: `docs/clients/{slug}/design-language.md`.

This document captures the **visual patterns** — not the token values (those are in `figma-analysis.md` and `tokens.json`), but how those values are applied:

```markdown
# Design language — {Client Name}

## Layout patterns
- **Section spacing:** generous (section-y: clamp(4rem, 10vw, 8rem))
- **Content width:** constrained (max-w-container 1200px, not full-bleed)
- **Grid preference:** 3-column grid on desktop, single column on mobile
- **Asymmetry:** none — all sections centered, balanced

## Card style
- **Separation:** shadow (shadow-card), not border
- **Corners:** rounded-lg (12px)
- **Padding:** generous (p-6 to p-8)
- **Hover:** subtle scale (scale-[1.02]) + shadow-elevated

## Typography hierarchy
- **Eyebrow:** uppercase, tracking-wide, text-xs, text-accent
- **Section title:** h2, font-heading, text-3xl
- **Body:** font-body, text-base, text-muted-foreground
- **Pattern:** eyebrow → h2 → body (consistent across all sections)

## Interaction style
- **Animations:** subtle — fade-in on scroll, no dramatic slides
- **Transitions:** 300ms ease, never instant
- **Hover effects:** color shift on links, scale on cards
- **CTAs:** filled buttons (bg-primary), never ghost/outline as primary action

## Visual density
- **Whitespace:** high — sections breathe, no dense grids
- **Image treatment:** full-bleed hero, contained elsewhere
- **Overlay style:** dark overlay (bg-black/40) on hero images

## Component patterns observed
- **Buttons:** rounded-full, px-8 py-3, font-medium
- **Links:** text-primary with underline on hover
- **Icons:** lucide-react, size 20px, inline with text
- **Lists:** no bullets, icon-prefixed items
```

The extraction is semi-automated: `/import-figma` scans the Figma Make components, identifies recurring patterns, and generates a first draft. A human (the designer or a senior dev) reviews and refines it. Once approved, it becomes the **visual contract for the client** — any new block built without Figma must follow these patterns.

#### 2. Evolve `ux-ui-analyst` to dual role

The existing `ux-ui-analyst` agent (`.claude/agents/ux-ui-analyst.md`) gains a second operating mode:

**Mode A — Validation (existing).** When a Figma reference exists for the block/page being reviewed, the agent compares implementation vs Figma. No change to this behavior.

**Mode B — Design proposal (new).** When NO Figma reference exists, the agent:

1. Reads `docs/clients/{slug}/design-language.md`
2. Reads the client's `tokens.json`
3. Reads 2–3 already-implemented blocks of the client (to detect consistent patterns)
4. Produces a **visual specification** for the new block that is consistent with the client's design language

The agent declares which mode it's operating in at the start of its output:

```
Mode: DESIGN PROPOSAL (no Figma reference for GalleryBlock)
Reference: docs/clients/camping-mer/design-language.md
Consistency check: HeroBlock, MediaTextBlock, AmenitiesBlock
```

The agent does NOT produce code. It produces a spec that the `planner` and `implementer` consume.

#### 3. New skill: `/design-block`

A skill that orchestrates the design proposal workflow:

```
/design-block {BlockName} --client {slug}
```

**Input:**
- Block name and which client it's for
- `docs/clients/{slug}/design-language.md` (required — if it doesn't exist, the skill says "run `/import-figma` first")
- `site-{slug}/src/theme/tokens.json`
- 2–3 existing block implementations from the client's `src/blocks/`

**Process:**
1. The `ux-ui-analyst` agent (Mode B) analyzes the design language + tokens + existing blocks
2. It produces a **block visual spec** with:
   - Recommended layout (grid/flex, columns, alignment)
   - Spacing values (which token-based spacing classes to use)
   - Typography hierarchy (which heading level, which font, which size)
   - Card/container style (shadow vs border, corners, padding)
   - Interaction patterns (hover effects, animations, transitions)
   - Responsive behavior (mobile/tablet/desktop adaptations)
   - Slot recommendations (which visual pieces should be slots for future customization)
3. The spec is saved as `docs/clients/{slug}/block-specs/{BlockName}.visual-spec.md`
4. The spec is reviewed by a human before implementation

**Output:** a visual specification document, NOT code. The spec feeds into the normal SPECBOOT cycle:

```
/design-block GalleryBlock --client camping-mer
    → ux-ui-analyst produces visual spec
    → Human reviews and approves
    → /propose uses the visual spec as input
    → /apply implements with TDD
    → /verify + audits
```

### Why

- **Consistency without a designer.** The design language document captures what the designer intended. New blocks follow the same patterns even if the designer is not available.
- **Scales to 300 clients.** Each client's `design-language.md` is a 1-page document. Creating a new block for any client takes the same workflow — the agent reads the doc and proposes accordingly.
- **No new agent needed.** Evolving `ux-ui-analyst` is simpler and cheaper than creating a separate `designer` agent. The visual analysis skills needed for Mode B (pattern recognition, consistency checking) are a superset of Mode A (comparison).
- **Human in the loop.** The agent proposes; the human approves. No block gets implemented from an AI-only design decision. The visual spec is a checkpoint.
- **Complements DEC-015.** The three usage levels (re-export, slots, full custom) are most powerful when there's a clear visual spec. Level 2 (slots) especially benefits — the spec tells the implementer which slots to customize and what the slot render should look like.

### Consequences

- `/import-figma` gains a second output: `design-language.md` alongside the existing `figma-analysis.md`.
- `ux-ui-analyst` agent file is updated with Mode A/Mode B documentation and the expanded prompt.
- New skill `/design-block` is created in `.claude/skills/design-block/`.
- New directory `docs/clients/{slug}/block-specs/` for per-client visual specifications.
- `docs/catalog.md` gains entries for the updated skill and the design-language artifact.
- The `planner` agent is updated to look for `block-specs/{BlockName}.visual-spec.md` when proposing a block that has no Figma reference.
- `docs/guides/daily-workflow.md` gains a section on the design-first workflow for non-Figma blocks.

### Alternatives considered

- **Dedicated `designer` agent** — rejected. A separate agent would need its own prompt, tool scope, and team composition rules. The visual analysis skills overlap heavily with `ux-ui-analyst`; splitting them creates coordination overhead and a "which agent do I call?" ambiguity.
- **Skip design language, let developers improvise** — rejected. With 300 clients and a team coming from WordPress, visual inconsistency within a single site is guaranteed. The design language document is cheap (one-time extraction per client) and high-value (every future block benefits).
- **Use AI to generate the design itself (images/mockups)** — rejected for V1. Generating pixel mockups adds complexity (image generation API, review tooling) for a problem that a text-based visual spec solves adequately. The spec describes patterns in terms of Tailwind classes and token references — the implementer can build directly from it.
- **Require the designer to create Figma for every block** — rejected operationally. The designer can deliver 2–3 new designs per month. At the rate of 12+ new blocks in Phase 1, the designer becomes the bottleneck. The design language extraction front-loads the designer's input so the team can move independently.

---

## Part 2 — Implementation Plan for Claude Code

> Scope: smaller than DEC-015. Three new artifacts + two updates. No structural migration.

### Step 1 — Append DEC-016 to decisions.md

**File:** `docs/architecture/decisions.md`
**Action:** Append Part 1 of this document as DEC-016 after DEC-015.

---

### Step 2 — Update /import-figma skill

**File:** `.claude/skills/import-figma/SKILL.md`

Add a new phase at the end of the existing process:

```
### Phase N — Extract design language

After token extraction and figma-analysis.md generation:

1. Read ALL component .tsx files in the Figma Make repo
2. Identify recurring visual patterns:
   - Card style: shadow vs border, corner radius, padding
   - Section spacing: section-y values, container width
   - Typography hierarchy: eyebrow patterns, heading levels, body text
   - Interaction style: hover effects, transitions, animation patterns
   - Layout preferences: grid columns, asymmetry, alignment
   - CTA style: filled vs outline, shape, size
   - Image treatment: full-bleed vs contained, overlays, aspect ratios
3. Generate `docs/clients/{slug}/design-language.md` with the template structure
4. Mark the file as "DRAFT — requires human review" at the top
```

The skill should generate the file even if some patterns are uncertain — it marks uncertain items with `(?)` for the reviewer to confirm.

---

### Step 3 — Update ux-ui-analyst agent

**File:** `.claude/agents/ux-ui-analyst.md`

Add Mode B documentation after the existing Mode A:

```markdown
## Mode B — Design proposal (no Figma reference)

When invoked for a block or page that has NO Figma reference, switch to proposal mode.

### Required context
- `docs/clients/{slug}/design-language.md` (MUST exist — if not, tell the user to run `/import-figma` first)
- `site-{slug}/src/theme/tokens.json`
- 2–3 already-implemented blocks from the client's `src/blocks/`

### Output format
Produce a block visual specification with these sections:

1. **Layout** — grid/flex, columns, alignment, responsive breakpoints
2. **Spacing** — which spacing tokens, section padding, element gaps
3. **Typography** — heading levels, font families, sizes, patterns (eyebrow → h2 → body?)
4. **Containers** — cards vs sections, shadow vs border, corners, padding
5. **Interactions** — hover effects, transitions, animations (with durations and easings)
6. **Responsive** — mobile/tablet/desktop behavior, stack/collapse/hide decisions
7. **Slot recommendations** — which visual pieces should be customizable via slots
8. **Consistency notes** — specific references to existing blocks: "use the same card style as AccommodationGridBlock", "match the eyebrow pattern from HeroBlock"

### Rules
- ALWAYS reference design-language.md patterns by name: "Per design language: card style uses shadow, not border"
- ALWAYS specify Tailwind classes, not abstract descriptions: "gap-6 md:gap-8", not "medium gap"
- NEVER invent a new visual pattern that contradicts design-language.md
- NEVER produce code — only a spec document
- DECLARE your mode at the start: "Mode: DESIGN PROPOSAL (no Figma reference for {BlockName})"
```

---

### Step 4 — Create /design-block skill

**File:** `.claude/skills/design-block/SKILL.md`

```markdown
---
name: design-block
description: Generate a visual specification for a block that has no Figma reference, based on the client's design language and existing blocks. The spec feeds into the SPECBOOT /propose phase.
argument-hint: <BlockName> --client <slug>
allowed-tools: Read Glob Grep
---

# Design Block

## When to use

When you need to create a block for a client but there is NO Figma design for it. The designer delivered base pages but this specific block/page was not included.

## Prerequisites

- `docs/clients/{slug}/design-language.md` MUST exist. If not → tell the user: "Run `/import-figma` first to extract the design language, then re-run `/design-block`."
- `site-{slug}/src/theme/tokens.json` MUST exist.
- At least 2 blocks already implemented in `site-{slug}/src/blocks/`.

## Process

1. **Read context:**
   - `docs/clients/{slug}/design-language.md`
   - `site-{slug}/src/theme/tokens.json`
   - 2–3 block implementations from `site-{slug}/src/blocks/` (pick the most visually rich ones — prefer blocks with cards, images, or complex layouts over simple text blocks)
   - `docs/specs/frontend/block-architecture.md` §4-layers (to determine which layers the new block needs)

2. **Invoke ux-ui-analyst in Mode B** via Task tool:
   - Pass: block name, design language, tokens, existing block code
   - Receive: visual specification

3. **Save the spec:**
   - Create directory `docs/clients/{slug}/block-specs/` if it doesn't exist
   - Save as `docs/clients/{slug}/block-specs/{BlockName}.visual-spec.md`
   - Mark as "DRAFT — requires human review before implementation"

4. **Print summary:**
   ```
   Visual spec created: docs/clients/{slug}/block-specs/{BlockName}.visual-spec.md
   Status: DRAFT — review and approve before /propose
   Design language reference: docs/clients/{slug}/design-language.md
   Layers recommended: L1 + L2a (or whatever the spec recommends)
   ```

## After approval

Once the human approves the visual spec, the normal SPECBOOT cycle continues:

```
/propose {BlockName} — planner reads the visual spec as input
/apply — implementer follows the spec's Tailwind classes and patterns
/verify — verifier runs CI gates
ux-ui-analyst Mode B — re-invoked to verify implementation matches the spec
```

## Refusal cases

- No design-language.md → refuse, suggest /import-figma
- No tokens.json → refuse, suggest extracting tokens first
- Fewer than 2 existing blocks → refuse, suggest implementing base blocks first (not enough pattern data)
```

---

### Step 5 — Create design-language.md template

**File:** `docs/clients/_template/design-language.md`

Create a template file that `/import-figma` uses as the starting structure:

```markdown
# Design language — {Client Name}

> DRAFT — requires human review. Generated by `/import-figma` on {date}.
> This document captures the visual patterns of the client's design, beyond the raw token values.
> It is the reference for any block built without a Figma design.

## Layout patterns
- **Section spacing:** {generous | compact | standard} (section-y: {value})
- **Content width:** {constrained | full-bleed | mixed} (container-max: {value})
- **Grid preference:** {2-col | 3-col | 4-col} on desktop, {stack | 2-col} on mobile
- **Asymmetry:** {none — centered | some — offset headers | heavy — masonry/collage}

## Card style
- **Separation method:** {shadow | border | background change | none}
- **Corners:** {rounded-none | rounded-md | rounded-lg | rounded-xl}
- **Padding:** {compact (p-4) | standard (p-6) | generous (p-8)}
- **Hover:** {none | scale | shadow-change | border-color | background-change}

## Typography hierarchy
- **Eyebrow present?** {yes — uppercase tracking-wide | no}
- **Section title:** {h2 | h3}, {font-heading | font-body}, {text-2xl | text-3xl | text-4xl}
- **Body text:** {font-body}, {text-sm | text-base | text-lg}, {text-muted-foreground | text-foreground}
- **Typical pattern:** {eyebrow → h2 → body | h2 → subtitle → body | h2 → body}

## Interaction style
- **Animations:** {none | subtle (fade) | moderate (slide) | dramatic (parallax)}
- **Transition duration:** {150ms | 200ms | 300ms | 500ms}
- **Transition easing:** {ease | ease-in-out | spring}
- **Hover on cards:** {describe}
- **Hover on links:** {describe}
- **CTA hover:** {describe}

## Visual density
- **Whitespace:** {high | medium | low}
- **Image treatment:** {full-bleed hero, contained sections | all contained | all full-bleed}
- **Overlay style:** {dark (bg-black/{opacity}) | gradient | none}

## Component patterns observed
- **Primary CTA:** {shape, padding, font-weight, style}
- **Secondary CTA:** {shape, style}
- **Links:** {color, decoration, hover behavior}
- **Icons:** {library, size, usage pattern}
- **Lists:** {bullet style, spacing}
- **Dividers:** {border-t | spacing only | decorative element}
```

---

### Step 6 — Update catalog.md

**File:** `docs/catalog.md`

Add entries:

```markdown
| design-block | alpha | 0.1.0 | `.claude/skills/design-block/` | Generate visual spec for a block without Figma reference. Reads design-language.md + tokens + existing blocks. Output: block-specs/{Name}.visual-spec.md. |
```

Update the `import-figma` entry to mention design-language.md extraction.

Update the `ux-ui-analyst` agent entry to mention Mode A (validation) and Mode B (design proposal).

---

### Step 7 — Update planner agent

**File:** `.claude/agents/planner.md`

Add to the "Context to load" section:

```markdown
- If the block has no Figma reference, check for `docs/clients/{slug}/block-specs/{BlockName}.visual-spec.md`. If it exists, use it as the visual guide for the proposal. If it does not exist, tell the user: "No Figma reference and no visual spec found. Run `/design-block {BlockName} --client {slug}` first."
```

---

### Step 8 — Update guides

**File:** `docs/guides/daily-workflow.md`

Add a section:

```markdown
## Building a block without Figma

When you need to create a block that wasn't in the designer's deliverable:

1. Verify `docs/clients/{slug}/design-language.md` exists (it's created by `/import-figma`)
2. Run `/design-block {BlockName} --client {slug}`
3. Review the visual spec in `docs/clients/{slug}/block-specs/{BlockName}.visual-spec.md`
4. Once approved, proceed with normal SPECBOOT: /propose → /apply → /verify
```

**File:** `docs/guides/glossary.md`

Add terms:
- **design language**: the documented visual patterns of a client beyond token values — card style, spacing density, animation approach, typography hierarchy
- **visual spec**: a document describing how a block should look and behave, written when no Figma reference exists
- **Mode B**: the design-proposal mode of the ux-ui-analyst agent, used when there's no Figma to compare against

---

### Verification checklist

```
□ decisions.md has DEC-016 appended after DEC-015
□ .claude/skills/import-figma/SKILL.md has design-language extraction phase
□ .claude/agents/ux-ui-analyst.md has Mode A + Mode B documentation
□ .claude/skills/design-block/SKILL.md created
□ docs/clients/_template/design-language.md created
□ docs/catalog.md updated (design-block skill + import-figma update + ux-ui-analyst update)
□ .claude/agents/planner.md references visual spec as input
□ docs/guides/daily-workflow.md has "Building a block without Figma" section
□ docs/guides/glossary.md has new terms
□ All technical artifacts in English (DEC-001)
```