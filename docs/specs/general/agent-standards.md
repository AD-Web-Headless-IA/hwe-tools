# Agent standards

> Rules governing when and how to invoke agents during development. Every agent audit that is required before promotion is listed here. For the full agent catalog and team compositions, see `docs/specs/ai/agent-directory.md` and `docs/specs/ai/agent-teams-playbook.md`.

---

## Promotion quality gates

These gates are checked during the `/review` phase (the reviewer requests specialist reports when applicable) and are enforced by the `docs/specs/general/lifecycle.md` promotion criteria. See DEC-014 for the full agent system rationale.

**STD-AGENT-VISUAL:** Every new block in `@hwp/core-ui` must be validated against its Figma reference by the `ux-ui-analyst` agent before promotion to `beta`. A block without a visual audit is capped at `alpha`.

**STD-AGENT-SEO:** Any block rendering headings, images, or links (`<h1>`–`<h6>`, `<img>`, `<a>`) must be audited by the `seo-geo-specialist` agent before promotion to `beta`.

**STD-AGENT-SECURITY:** Any block handling user input, cookies, personal data, or external API calls must be audited by the `security-specialist` agent before promotion to `beta`.

**STD-AGENT-ARCHITECTURE:** Every new block in `@hwp/core-ui` must pass the 4-layer architecture check before promotion to `beta`. The `reviewer` verifies this during `/review` using the checklist in `docs/specs/frontend/block-architecture.md §10`: Layer 1 (content schema) always present; Layer 2 (variants) at the correct level (CVA / structural / functional); Layer 3 (config schema) present if and only if the block has behavioral options; Layer 4 (adapter) present if and only if the block connects to an external service.

---

## In simple terms

These are the three mandatory checks before a block can be called production-ready:

| Gate | Who checks it | When |
|---|---|---|
| STD-AGENT-VISUAL | `ux-ui-analyst` | After every block — does it match Figma? |
| STD-AGENT-SEO | `seo-geo-specialist` | If the block has headings, images, or links |
| STD-AGENT-SECURITY | `security-specialist` | If the block has forms, cookies, or API calls |
| STD-AGENT-ARCHITECTURE | `reviewer` (checklist) | After every block — 4-layer structure correct? |

**WordPress equivalent:** like having a checklist before a plugin goes live — SEO reviewed, security scanned, design approved by the client. Here each check has a dedicated agent instead of relying on the developer's memory.

**Day-to-day impact:** when you finish implementing a block, ask Claude Code to run the relevant specialist(s) before marking it `beta`. The reviewer will catch a missing audit and block the merge.
