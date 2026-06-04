# Content operations — product AI agents

> **Canonical home for the product's content-AI system**: the agents that generate, edit, and bulk-operate on client content in Payload, plus the client-facing editing portal. Extracted from the legacy `architecture.md` during the DEC-018 cleanup and updated to the current stack (DEC-007 Vercel + Route Handlers; no PHP proxy, no MariaDB).
>
> Load this file when working on: AI content generation/editing, the client portal, prompt chaining for content, bulk content operations, or content-agent evals.

---

## ⚠️ Two different agent systems — do not confuse them

hwe has **two unrelated sets of "agents"**. They share some role names (e.g. "planner") but live in different planes:

| | **Product content-AI agents** (this file) | **Claude Code dev agents** (`.claude/agents/`) |
|---|---|---|
| Purpose | Generate/edit **client content** in Payload at runtime | Build the **platform code** during development |
| Who runs them | The deployed site/portal/admin, via Anthropic API | Developers, inside Claude Code |
| Examples | Content Editor, Content Generator, Bulk Operator, Code Builder, Planner | planner, implementer, reviewer, verifier, architect, … (11 total) |
| Defined in | `agent-rules.ts` (runtime config) | `.claude/agents/*.md` |
| Reference | **this document** | [`agent-directory.md`](./agent-directory.md), [`agent-teams-playbook.md`](./agent-teams-playbook.md), DEC-014 |

When a doc says "planner", check which plane it means. The **product Planner** designs content schemas and analyzes analytics; the **dev planner** writes implementation proposals in the SPECBOOT pipeline. Different things.

---

## 1. The five product agents

| Agent | Context | Tasks | Model tier | Autonomous | Backup |
|---|---|---|---|---|---|
| **Content Editor** | client portal | simple edits — text, photo, price | Haiku | No — always user confirmation | Yes — before each change |
| **Content Generator** | agency panel | initial generation of accommodations, services, FAQs in multiple locales | Sonnet | No — agency reviews before publish | No — generates as draft |
| **Bulk Operator** | agency panel | mass edits, migrations, N documents | Sonnet | No — confirmation before acting, always | Yes — backup of all affected docs |
| **Code Builder** | claude-code (dev) | Figma Make → `@hwe/core-ui` blocks | Sonnet | No — dev reviews always | No — code is in git |
| **Planner** | agency panel (internal) | content-schema design, analytics analysis, complex content decisions | Opus | No — human always in the loop | No |

> Concrete model IDs are configuration, not architecture — they live in `agent-rules.ts` and are bumped without a DEC. The binding choice is the **tier** (Haiku for cheap/mechanical, Sonnet for focused generation, Opus for reasoning).

---

## 2. Agent rules & router (controlled without code)

Rules define which agent runs in each situation. They are managed from the agency admin panel — no deploy needed to change a model, token cap, or confirmation requirement.

```typescript
// agent-rules.ts
export const agentRules: AgentRule[] = [
  {
    id: 'content-simple-edit',
    description: 'Simple text/photo/price changes',
    context: 'portal-cliente',
    triggers: ['cambiar', 'actualizar', 'subir foto', 'precio'],
    model: 'claude-haiku-4-5',
    maxTokens: 1000,
    requiresConfirmation: true,
    requiresBackup: true,
    active: true,
  },
  // content-generation (Sonnet), bulk-operation (Sonnet),
  // code-generation (Sonnet), architecture-planning (Opus) …
];
```

The **router** picks the rule whose `triggers` match the request for the active `context`, falling back to a per-context default rule when nothing matches.

What the agency controls without touching code:
- which model each operation uses, and its max tokens,
- whether an operation requires confirmation and/or backup,
- enabling/disabling operation types per client,
- cost per client and per operation type, with threshold alerts.

---

## 3. Prompt management (harness engineering)

Prompts live as versioned Markdown files, editable without deploy, shared across all clients.

```
prompts/
  content-generation.md
  content-edit.md
  bulk-operations.md
  code-generation.md
  block-reorder.md
```

- **Per-tenant context** is injected at call time by a `buildSystemPrompt(tenant)` builder: client name/type/location, available schemas, the tenant-scoping rule, default locale, and brand voice.
- **Prompt versioning**: prompts are versioned (`vM.N`); a regression is reverted by pointing back to a prior version. Track changes against eval scores (§7).

---

## 4. Prompt chaining

Complex tasks are split into chains of simple, individually-validatable prompts. Each prompt does one thing; outputs are small and Zod-checkable. Haiku where sufficient, Sonnet where quality matters.

### Flow 1 — Initial content generation
```
Structurer (Haiku)  → clean structured JSON from raw inputs
Writer (Sonnet ×N locales, parallel) → { title, description } per locale
SEO Enhancer (Haiku) → optimized copy preserving tone
Validator (no LLM)  → Zod.parse → fail: retry Writer with clearer instructions; pass: save as Payload draft
```

### Flow 2 — Portal edit (client)
```
Intent Classifier (Haiku) → text|image|price|amenity|unknown   (~50 tokens)
Change Extractor (Haiku)   → { field, currentValue, newValue }  (~200 tokens)
Confirmation Generator (Haiku) → friendly message stating exactly what will change
→ client confirms (human in the loop — always)
Validator (no LLM) → Zod.parse → fail: error to client; pass: backup + apply in Payload
```

### Flow 3 — Block reorder (agency only)
```
Reorder Interpreter (Sonnet) → new full block array (same blocks, order only)
Validator (no LLM) → same count, valid types/variants, consecutive orders → pass: human approval
```

Why chaining: each prompt is precise and cheap, outputs validate with Zod, and prompts improve in isolation.

---

## 5. Output validation (Zod)

Every LLM output is validated before it touches Payload. Claude can be wrong; Zod is the safety net.

```typescript
const AccommodationAIOutput = z.object({
  title:       z.record(z.string()),
  description: z.record(z.string()),
  price:       z.number().positive(),
  maxGuests:   z.number().int().positive(),
  amenities:   z.array(z.string()),
});
const validated = AccommodationAIOutput.parse(claudeOutput); // never saved without this
```

This is the same "Zod at every boundary" rule as the rest of the platform — the AI→Payload edge is a boundary.

---

## 6. Bulk content editing — three mechanisms

| Mechanism | Who | When |
|---|---|---|
| **1 — Portal AI** | client or agency | simple change across many docs, in natural language ("add wifi to all accommodations") |
| **2 — Bulk script** | agency | CSV import, structural field changes, post-AI corrections, seasonal price updates |
| **3 — Payload admin** | agency | 2–5 specific docs, edited by hand, no script/AI |

All AI/bulk paths share two invariants: **show a summary and require confirmation before acting**, and **back up every affected document first**. A single rebuild runs at the end, not one per change.

```typescript
export async function bulkUpdate(tenantId, collection, filter, operation): Promise<BulkResult> {
  const docs = await payload.find({ collection, where: filter });
  await backupAll(tenantId, collection, docs.docs);          // backup before mutating
  for (const doc of docs.docs) await payload.update({ collection, id: doc.id, data: operation.apply(doc) });
  await triggerRebuild(tenantId);                            // one rebuild at the end
  return { updated: docs.totalDocs };
}
```

---

## 7. Client portal

A per-client app (`portal.{client-domain}`) where the **client edits their own content** without entering the CMS.

**Can:** free-form chat to request content changes; guided form for structured changes; upload images; view change history; undo recent changes (from temporary backup).

**Cannot:** change block structure or layout (agency only); change technical config; access another client's data; publish without their own confirmation.

The portal calls Anthropic via a **Next.js Route Handler** (server-side, credentials in Vercel env vars — DEC-007). The AI can only modify content of the authenticated tenant, never block structure when invoked by the client, and never publishes without confirmation.

---

## 8. Observability

Every Anthropic call is logged and cost-tracked.

```typescript
await aiLogger.log({ tenantId, agentId, model, promptSent, responseReceived,
  validationPassed, tokensUsed: { input, output }, estimatedCost, actionTaken, timestamp });
```

A token tracker feeds the agency admin dashboard: tokens/cost per client per month, which agent is used most, and threshold alerts.

---

## 9. Evals

Quality metrics for the agents. "Looks right" is not enough; without metrics you cannot improve prompts.

Stored in the **platform Postgres DB** (DEC-007 — replaces the legacy `plataforma_db` MariaDB table):

```sql
create table agent_evals (
  id uuid primary key, agent_id text, tenant_id uuid,
  score numeric(3,2), metrics jsonb, passed boolean,
  created_at timestamptz default now()
);
```

Approval thresholds per agent:

```
Content Editor    → 0.95   (critical — touches real client content)
Content Generator → 0.80   (flexible — human review follows)
Bulk Operator     → 0.99   (very critical — affects many documents)
Code Builder      → CI/CD  (Lighthouse + vitest-axe + tsc + Vitest)
SEO Auditor       → 0.75   (advisory — quarterly manual review)
```

Per-agent metrics (e.g. Content Editor: requested change applied, untouched fields intact, Zod passed, tone coherent; Bulk Operator: affected==expected, backup created, time/doc within limit) are measured automatically where possible (Zod pass/fail + before/after diff) and by monthly human sampling otherwise. A dashboard shows 30-day average score and trend per agent and per tenant, with email alerts to the tech lead on threshold breach.

> Code Builder has no dedicated eval — CI/CD (the Claude Code `verifier` dev agent + GitHub Actions) already gates it.

---

## 10. AI security rules

- Anthropic API is **always** called from a server-side Route Handler — never from the browser (DEC-007; replaces the legacy "PHP proxy on cdmon").
- AI may only modify content of the **authenticated tenant**.
- The client (via portal) can never alter block structure.
- Nothing is published directly — always requires user confirmation.
- Everything is Zod-validated before any DB write.
- A temporary backup (30-day TTL) is mandatory before any change — individual or mass.

---

## Status & open questions

- **Status:** specification — not yet implemented. This system activates with the Payload + AI integration phase (post Phase-0/1). The skills `/security-audit` and `/seo-audit` already note the AI-content audit is a placeholder (N/A until this integration lands).
- **Open:** the exact `agent-rules.ts` / router / prompt-builder live in product code (the CMS/portal apps), not in hwe-core packages. Their home repo is decided when the integration phase is planned.
