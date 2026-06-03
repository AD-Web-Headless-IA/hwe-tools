# Security audit — AI content safeguards

> **Status: placeholder — N/A until Payload CMS + AI content generation is integrated.**
>
> This document specifies what will be audited when the AI-assisted content pipeline goes live. The audit areas are defined now so implementation can be validated against them from day one.

---

## Trigger

**Not active yet.** Activate this audit when:
- Payload CMS is integrated with an AI content generation workflow.
- Any hwe site allows AI-generated content to be published directly (draft or live).
- The Claude API is used to suggest, rewrite, or translate page content that goes through an editorial flow.

Until then: skip this audit in the `/security-audit` runner. The runner marks it as `N/A (pre-integration)`.

---

## Agent

`security-specialist` — read-only; produces a report only.

---

## What will be audited (specification for implementers)

When the AI content pipeline is implemented, it must satisfy every item below before going to production. This list is the acceptance criteria for the implementation team.

---

### 1. Content versioning

Every piece of AI-generated content must be stored with a version history:
- Before: the original human-authored (or previous AI) version.
- After: the AI-suggested version.
- Metadata: timestamp, Claude model used, prompt hash (not the full prompt), editor who triggered the generation, editor who approved.

Without versioning, rollback is impossible. Without audit metadata, attribution is impossible.

**What to verify:**
```
- Payload collection has a `versions` field (Payload versioning enabled).
- Each version record carries: { createdAt, modelId, approvedBy, status: 'draft' | 'published' }.
- The UI shows a diff between the current and previous version before publishing.
```

---

### 2. Draft / publish workflow — mandatory human gate

AI-generated content must go through a mandatory human review step. The workflow:

```
AI generates draft → Editor reviews → Editor approves → Content published
```

An AI must **never** be able to publish content directly. The `status` field transition from `draft` to `published` must require a human action (Payload access-controlled mutation).

**What to verify:**
```
- Payload collection has `status: 'draft' | 'published'`.
- The `published` state is only settable by a user with `editor` or `admin` role.
- No Route Handler or background job can set status to 'published' without a human principal.
```

---

### 3. Pre-publication guardrails

Before an editor can publish AI-generated content, automatic checks must flag anomalies:

| Guardrail | Trigger condition | Required behavior |
|---|---|---|
| Price anomaly | Any displayed price changed by > 50% compared to the previous version | Publish blocked; editor shown the diff; requires explicit override |
| Field deletion | A required field (phone, address, booking URL) is absent in the AI version | Publish blocked with specific field name |
| Language mismatch | Generated text detected in a different language than the site's configured locale | Publish blocked; language detected shown |
| Contact data modification | Phone number, email address, or URL changed | Warning shown with diff; requires explicit acknowledgment |
| Scope creep | Generated content references products/services not in the client's catalog | Warning shown; editor must confirm |

**What to verify:**
```
- A validation step runs automatically when the editor clicks "Publish".
- Each guardrail has a test case in the test suite.
- Override is possible (with confirmation) for non-critical guardrails.
- The audit log records which guardrails were triggered and whether overridden.
```

---

### 4. Session scope limits

Each AI generation session must have hard limits to prevent runaway generation:

| Limit | Default value | Rationale |
|---|---|---|
| Max fields editable per session | 10 | Prevent bulk replacement of all content |
| Max tokens generated per session | 4000 | Cost control + review feasibility |
| Max sessions per editor per day | 20 | Rate limiting against abuse |
| Cooldown after price-field edit | 24h | Prevent rapid price manipulation |

**What to verify:**
```
- Limits are enforced server-side in the Route Handler (not only in the UI).
- Exceeding a limit returns a 429 with a clear error message.
- Limits are configurable per client in client.config.ts (with the defaults above).
```

---

### 5. Prompt injection prevention in content generation

When AI generates content based on existing page data (accommodation descriptions, prices, reviews), that existing data is external content and must be treated as untrusted:

**What to verify:**
```
- Page data passed to Claude is delimited with explicit XML tags:
  <existing-content source="payload-cms">
    {existingContent}
  </existing-content>
- The system prompt instructs the model to treat delimited content as data, not instructions.
- The system prompt is not modifiable by the editor through the UI.
- LLM output is parsed through a Zod schema before being stored as a draft.
```

---

### 6. Rollback

A published AI-assisted content change must be reversible with one action:

**What to verify:**
```
- Payload UI has a "Restore previous version" button.
- Restoring a version is atomic (all fields restored simultaneously).
- The rollback itself is logged in the version history.
- Rollback is available to editors, not only admins.
```

---

### 7. Audit log

Every AI interaction must be logged for compliance and debugging:

**What to verify:**
```
- Log record contains: { timestamp, editorId, modelId, action, fieldsModified[], status, guardrailsTriggered[] }.
- Log is append-only (no record can be deleted).
- Log is accessible to admins in the Payload admin UI.
- Log is retained for at least 12 months.
```

---

## Output (when active)

```markdown
# Security Audit — AI Content Safeguards: {SLUG}

**Date:** {YYYY-MM-DD}
**Status:** Active / N/A (pre-integration)

## Content versioning

| Check | Status | Severity |
|---|---|---|
| Payload versioning enabled | Yes / No | Pass / Blocker |
| Metadata stored per version | Yes / No | Pass / Major |

## Draft / publish gate

| Check | Status | Severity |
|---|---|---|
| AI cannot publish directly | Yes / No | Pass / Blocker |
| Publish requires editor role | Yes / No | Pass / Blocker |

## Pre-publication guardrails

| Guardrail | Implemented | Tested | Severity |
|---|---|---|---|
| Price > 50% change | Yes / No | Yes / No | Pass / Major |
| Field deletion | Yes / No | Yes / No | Pass / Major |
| Language mismatch | Yes / No | Yes / No | Pass / Major |
| Contact data change | Yes / No | Yes / No | Pass / Major |

## Session limits

| Limit | Enforced server-side | Configurable | Severity |
|---|---|---|---|
| Max fields / session | Yes / No | Yes / No | Pass / Major |

## Prompt injection

| Check | Status | Severity |
|---|---|---|
| External content delimited | Yes / No | Pass / Blocker |
| LLM output parsed with Zod | Yes / No | Pass / Blocker |

## Verdict

**Green** — all safeguards implemented and tested.
**Red** — at least one Blocker; AI content pipeline cannot go to production.
```

---

## In simple terms

En WordPress, cuando usas Yoast o un plugin de redacción con IA, confías en que el proveedor ha implementado las salvaguardas. En hwe, construimos la integración nosotros — así que las salvaguardas también son nuestra responsabilidad.

**WordPress equivalent:** imagine a WordPress editorial flow where AI suggests content changes but a human must click "Publish" to approve them. That's exactly what this audit verifies — with the additional safety rails that a hospitality platform requires (prices, contact data, booking URLs).

**Day-to-day impact:** cuando el equipo implemente la integración de IA con Payload, esta lista es la checklist de aceptación. El `security-specialist` la auditará antes de que esa funcionalidad llegue a producción. Cualquier item en rojo bloquea el lanzamiento de la feature.
