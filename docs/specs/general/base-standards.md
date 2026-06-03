# Base standards

> Common rules every artifact in hwe respects, regardless of layer (frontend, backend, scripts, prompts).
> Every other `docs/specs/*.md` extends these — do not repeat them elsewhere.
> Always loaded into agent context. Keep this file short — under 200 lines.

## Language

- **Technical artifacts in English**: code, identifiers, comments, tests, commits, user stories, plans, ADRs, specs, catalog entries, skill prompts. No mixed languages in code (`getRooms` next to `obtenerHabitaciones` is a bug).
- **Business artifacts in their natural language**: client briefings, brand guidelines, site copy delivered to users, marketing material.
- **Human ↔ AI conversation in Spanish** (this team's working language).

## TypeScript

- `strict: true` always. `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess` all on.
- `any` is a lint error. Use `unknown` when the type is genuinely unknown and narrow it.
- `as` casts only at validated boundaries (after `zod.parse`, after `JSON.parse` + parse). Never to shut up the compiler.
- No `@ts-ignore`. `@ts-expect-error` is allowed only with a comment explaining what is expected to fail and why.
- Use `type` by default. Use `interface` only when you need declaration merging or an `extends` hierarchy that genuinely benefits from it.
- Discriminated unions over boolean flag combinations.

## Validation

- **Zod at every system boundary**: HTTP request bodies, query params, env vars, file content, third-party API responses, LLM outputs, Payload-to-frontend data.
- Internal code trusts its own types — do not re-validate data that has already been parsed.
- A schema defined once; never duplicated. If two places need it, one imports from the other.
- Schemas are colocated with the type they validate (block schemas with the block, API schemas with the route handler).
- Never trust an LLM response — always pipe through `Schema.parse(...)` before use or storage.

## Testing — TDD

- Tests are written **before** the implementation they validate. The proposal artifact for a feature includes the test design.
- Coverage thresholds: **booking adapters > 90%**, content adapters > 90%, core-ui blocks > 80% (interaction + a11y), templates > 70%, glue code > 60%.
- Co-locate unit tests next to source: `Hero.test.tsx` next to `Hero.tsx`. E2E tests in `tests/e2e/` of each app.
- Never mock the database in integration tests — use a real test DB. Mocks are fine for external HTTP APIs.
- Test names describe behavior, not implementation: `"redirects to PMS when dates are selected"`, not `"calls handleSubmit"`.
- One assertion per test when possible; tests should fail for one reason.

## Architecture

- **Adapter pattern** at every external boundary: `BookingAdapter`, `ContentRepository`, `AIProviderAdapter`. Concrete implementations (`CloudbedsAdapter`, `PayloadAdapter`) inject through the interface. The core never imports a concrete adapter.
- **No `if (client === '...')` in the core** — ever. Per-client behavior goes in the client repo's `src/` or in `client.config.ts`, not in `hwe-core/packages/*`.
- **DDD 4 layers** (Presentation / Application / Domain / Infrastructure). Domain does not import Infrastructure. Application orchestrates Domain via interfaces.
- **Bounded contexts**: Booking, Content, Tenant, AI. Same real-world concept gets different names per context if semantics differ — never share types across contexts just because the shape matches.

## Naming

- Folders: `kebab-case`.
- React components: `PascalCase.tsx`.
- TS modules (utils, hooks, types): `camelCase.ts`.
- Types and interfaces: `PascalCase`. Schemas: `PascalCase` ending in `Schema` is optional but consistent (`AccommodationContent` and its schema can share the name via `z.infer`).
- Constants: `SCREAMING_SNAKE_CASE` only for true constants known at design time (HTTP status codes, fixed table names). Configuration values are `camelCase`.
- Dynamic route segments: always `[slug]`, never `[id]`.
- Boolean variables: positive form with a verb (`isLoaded`, `hasSpa`, `canEdit`), not negated (`isNotLoaded`).
- No abbreviations except domain-standard ones (`url`, `id`, `db`, `ui`).

## Commits

- **Conventional Commits in English**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`, `ci:`. Scope optional but useful: `feat(core-ui): add HeroBlock`.
- Subject line ≤ 72 chars, imperative mood ("add", not "added").
- Body explains the **why**, not the what (the diff already shows the what).
- Reference user stories in the body when applicable: `Closes US-007`.
- One logical change per commit. If a PR has 30 commits each fixing a typo, squash before merge.

## Documentation discipline

- **Documentation before code** (per SPECBOOT). Never implement without an approved proposal artifact.
- When a proposal and the resulting code diverge, **update the proposal**, do not let docs rot.
- Every package has a `README.md` describing its responsibility and public API.
- Every ADR (DEC-NNN in `docs/architecture/decisions.md`) is immutable once Accepted — superseded by a new DEC, not edited.

## Security baseline

- Secrets never in code or config files committed to git. Only env vars, named in `.env.example` with empty values.
- Claude API and PMS credentials are never reachable from the browser — always proxied through a server-side Next.js Route Handler with the secret in `process.env` (Vercel env vars). See DEC-007.
- Validate, then act — never the reverse. No partial writes followed by validation rollback.
- Multi-tenant isolation: every DB query is scoped by `tenantId`. A query without a tenant scope is a bug.

For the complete security reference — RGPD compliance, input handling pipeline, CSP template, cookie consent, secrets management, prompt injection prevention, and pre-deploy checklist — see [`docs/specs/security/security-standards.md`](../security/security-standards.md).

## Anti-patterns (don't)

- Don't add features, abstractions, or "future-proofing" beyond what the current task requires.
- Don't add error handling for impossible cases. Trust your own types.
- Don't write comments that explain WHAT the code does. Names should already do that. Comments are for WHY when it is non-obvious.
- Don't create planning, analysis, or summary documents unless asked.
- Don't catch and swallow exceptions silently. If you can't handle it, let it propagate.
- Don't ship a `console.log` to production. Use the logger.

## Documentation accessibility — STD-DOC-SIMPLE

**STD-DOC-SIMPLE:** Every technical document created or updated in `docs/` must include an **"In simple terms"** section at the end.

Requirements:

- Written in plain language — no jargon, no acronyms without expansion, no assumed prior knowledge.
- Maximum 10 lines. If the concept needs more, it is not simple enough.
- Include the **WordPress equivalent** concept when applicable (the team comes from a WP background).
- If the document describes a constraint or rule, the simple terms section must answer: "What does this mean for me, day-to-day?"

Example closing section for a new contract document:

```markdown
## In simple terms

This contract defines how a reusable website block must be structured.
Think of it like the rules for a Gutenberg block: it has a name, a schema
(the fields the editor can fill in), and a React component that renders it.

**WordPress equivalent:** `register_block_type()` + ACF field group + block template.

**Day-to-day impact:** when you create a new block, follow the 5-file structure
in this contract. If you skip a file, the block cannot be promoted past `alpha`.
```

**When this rule applies:** any new `docs/contracts/`, `docs/specs/`, `docs/skills/`, or `docs/architecture/` document. It does NOT apply to `docs/guides/` (those are already written in plain language) or `docs/plans/` (those are internal planning artifacts).

## Agent quality gates

For agent invocation rules, see `docs/specs/general/agent-standards.md`.

---

## Related specs

- [`docs/specs/frontend/coding-standards.md`](../frontend/coding-standards.md) — hwe-specific elaboration of these rules for frontend code: component structure, React patterns, import grouping, anti-patterns table.
- [`docs/specs/security/security-standards.md`](../security/security-standards.md) — security and RGPD rules that extend the security baseline above.
