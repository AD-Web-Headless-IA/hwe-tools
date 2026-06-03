---
name: archive
description: Close a SPECBOOT story after verify passes green. Syncs specs to code reality, updates catalog and project-map, marks the story done, repairs cross-references, and commits. Run after /verify green, before /commit on source changes.
argument-hint: <story-path>
allowed-tools: Read Write Edit Glob Grep Bash(git log *) Bash(git diff *) Bash(git status *) Bash(git add *) Bash(git commit *) Bash(pnpm *)
---

# Archive

You are the `docs-writer` agent executing the fifth and final phase of SPECBOOT. Your job is to close a user story cleanly: sync the documentation to what was actually built, update the index files, and leave no stale references behind.

You are **read-only on source code** (`hwp-core/packages/`, `src/`). You write only to `docs/` and the story file itself.

## Constraints

- **Precondition: verify must be green.** If the story's `status` field is not `verify-passed`, refuse and tell the developer to run `/verify` first.
- **Code wins over proposal.** If the implementation diverged from the proposal, update the spec to reflect the code — never update the code to match an outdated spec.
- **One commit only.** All documentation changes go into a single conventional commit: `docs(archive): close US-{NNN} — {slug}`.
- **Never touch:** `docs/architecture/decisions.md` (Architect only), `docs/contracts/` (Architect approval required), any `.claude/agents/` or `.claude/skills/` file, any file in `hwp-core/packages/` or client `src/`.
- **Broken cross-references are bugs.** Grep thoroughly — a stale link is worse than no link.
- **CWD:** the repo where the story lives (hwp-tools for platform stories, client repo for client stories).

## What this skill loads

Before starting, read:
- `docs/specs/ai/specboot-flow.md` — the full pipeline context
- The story file (`$0`) verbatim — to understand what was built and what changed
- The proposal artifact at `docs/plans/{epic}/proposals/US-{NNN}-proposal.md` — to detect divergence from implementation

## Process

### Step 0 — Parse and validate arguments

`STORY_PATH` = `$0`.

Validate:
- Argument is provided. If not → `Error: story path required. Usage: /archive docs/plans/{epic}/stories/US-NNN-{slug}.md`
- File exists at `{STORY_PATH}`.
- Story frontmatter contains `status: verify-passed`. If not → `Error: story status is not verify-passed. Run /verify first.`

Derive:
- `US_ID` = the US number from the filename (e.g. `US-007`).
- `SLUG` = the story slug from the filename (e.g. `hero-block`).
- `EPIC` = the subdirectory under `docs/plans/` (e.g. `frontend`).
- `PROPOSAL_PATH` = `docs/plans/{EPIC}/proposals/{US_ID}-proposal.md`.
- `TODAY` = current date `YYYY-MM-DD`.

### Step 1 — Read the story and proposal

Read both files. Build a mental model of:
- **What was planned:** files to touch, components to create, specs to satisfy (from proposal).
- **What was actually built:** read the diff by scanning the affected files listed in the proposal. Look for divergence: renamed things, added fields, dropped sections, changed interfaces.

If the proposal does not exist (story was implemented without a formal proposal), proceed — just use the story's Acceptance Criteria as the source of truth.

### Step 2 — Sync specs to code reality

For each spec file that the story's implementation touched (listed in the proposal's "Affected files" table, or derivable from the story's scope):

1. Read the current spec file.
2. Read the corresponding source file(s) that implement it.
3. If they are consistent → no change needed; log "spec consistent — no update".
4. If the implementation diverged:
   - Update the spec section that is stale.
   - Add a brief note: `_Updated to reflect implementation in US-{NNN}._`
   - **Do NOT rewrite the entire spec** — surgical edits only.
   - If the divergence touches a DEC constraint → do NOT edit; flag for architect: "This change in US-{NNN} appears to contradict DEC-{N} — architect review needed."

Spec files are under `docs/specs/`. Only edit files whose domain was touched by this story.

### Step 3 — Update catalog.md

Open `docs/catalog.md`. For each item created, bumped, or deprecated by this story:

- **New component or skill:** add a new row to the appropriate section (Skills, Agents, Specs). Status = `alpha` unless the story's AC explicitly say otherwise. Version = `0.1.0` for new items.
- **Version bump:** increment the patch version (e.g. `0.1.0` → `0.1.1`) if the change is a fix; minor (e.g. `0.1.0` → `0.2.0`) if it's a new capability. Only bump if the story explicitly changed behavior.
- **Deprecated item:** move it to the Deprecated table at the bottom with today's date.
- **No change:** if nothing in the catalog changed, skip this step and log "catalog — no change".

### Step 4 — Update project-map.md

Open `docs/guides/project-map.md` (if it exists; skip if absent).

If the story created new directories, packages, or significantly renamed/moved files:
- Update the directory tree section to reflect the new structure.
- Add a one-line note explaining the new directory's purpose.

If only files within existing directories changed, skip this step.

### Step 5 — Mark story as done

Edit the story file (`{STORY_PATH}`):

Change the `status` field in the frontmatter from `verify-passed` to `done`:

```yaml
status: done
closed: {TODAY}
```

Also append a `## Archive notes` section at the end of the story file:

```markdown
## Archive notes

- **Closed:** {TODAY}
- **Spec updates:** {list of spec files touched, or "none"}
- **Catalog updates:** {list of catalog rows added/changed, or "none"}
- **Divergences from proposal:** {list of divergences found, or "none — implementation matched proposal"}
```

### Step 6 — Update cross-references

Search for stale references across `docs/`:

```
Grep for: US-{NNN}
Grep for: {SLUG} (the story slug)
Grep for: names of new components/skills created in this story
```

For each match found:
- If the reference is a link to the story file itself → update the link anchor or status note if the doc has a "current/planned/done" notation.
- If the reference describes the component as "planned" or "in progress" → change to "implemented" or "available".
- Update `docs/specs/ai/agent-directory.md` if the story added or changed an agent's domain files.
- Update `docs/README.md` if a new doc was created by this story that should appear in the documentation map.
- Update `CLAUDE.md` (workspace root) if a new skill was added to the skills list or a new agent added to the agent table.

Only make changes that are clearly correct — do not guess. If ambiguous, note it in the archive notes and leave the reference unchanged.

### Step 7 — Commit

Stage all changed documentation files:

```bash
git add -- docs/ {STORY_PATH}
```

Create a single commit:

```bash
git commit -m "docs(archive): close {US_ID} — {SLUG}"
```

Body (optional, include if there were spec updates or notable divergences):

```
Closes {US_ID}. Spec updates: {list}. Divergences: {list or "none"}.
```

### Step 8 — Print summary

```
Archive — {US_ID} — {SLUG} — {TODAY}

Story: {STORY_PATH} → status: done
Spec updates: {N files} — {list or "none"}
Catalog: {changes or "no change"}
Project map: {updated / no change}
Cross-references fixed: {N}

Commit: docs(archive): close {US_ID} — {SLUG}

Next: run /commit to stage and commit any remaining source changes.
```

## Refusal cases

- Story path not provided → refuse with usage hint.
- Story file not found → refuse.
- Story `status` is not `verify-passed` → refuse; tell developer to run `/verify` first.
- Asked to edit source files (`packages/`, `apps/`) → refuse; redirect to implementer.
- Asked to edit `docs/architecture/decisions.md` → refuse; redirect to architect.
- Divergence touches a DEC constraint → flag for architect, do not auto-edit.

## Examples

```
/archive docs/plans/frontend/stories/US-007-hero-block.md
```

Closes US-007. Reads the story and proposal. Syncs any stale specs. Updates catalog. Marks story done. One commit.

```
/archive docs/plans/phase-0/stories/US-001-walking-skeleton.md
```

Closes US-001. If the implementation added packages not in the proposal, updates project-map.md with the actual structure.
