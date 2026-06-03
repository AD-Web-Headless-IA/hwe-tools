# Plans

This directory holds **implementation plans** (PRDs) and the **user stories** derived from them.

## Layout

```
docs/plans/
├── README.md                          ← this file
└── {epic-name}/                       ← one folder per epic
    ├── plan.md                        ← the source plan / PRD (generic, methodology only)
    ├── sources/                       ← (optional) per-input tracking files
    │   └── {slug}.md                  ← one file per input source feeding the epic
    └── stories/                       ← output of /plan-to-stories
        ├── INDEX.md                   ← summary + dependency graph
        ├── OPEN-QUESTIONS.md          ← questions flagged during enrichment
        ├── phase-1-stories.md         ← raw Phase 1 output (before split)
        └── US-{NNN}-{slug}.md         ← one enriched story per file
```

### When to use `sources/`

If an epic is fed by multiple discrete inputs that each need their own progress tracking — e.g. the design system epic processes one Figma Make visual reference per client — keep `plan.md` generic and put the per-input checklist in `sources/{slug}.md`. The plan stays stable as new inputs arrive; only new source files are added.

Skip `sources/` for epics with a single input or no per-input state worth tracking.

## Workflow

```
1. Write an implementation plan at docs/plans/{epic-name}/plan.md
2. Run /plan-to-stories docs/plans/{epic-name}/plan.md {epic-name}
   → Phase 1 extracts user stories (you confirm the list)
   → Phase 2 enriches each story with its own sub-agent
3. Review the enriched stories under docs/plans/{epic-name}/stories/
4. Implement one story at a time, in dependency order, with TDD
5. When the epic is done, archive the folder (do not delete)
```

## Conventions

- One epic = one folder.
- Plan files are markdown. Frontmatter optional.
- Story IDs are sequential per epic: `US-001`, `US-002`, ...
- Slugs are short kebab-case derived from the story title.
- All files in English.

## Single-story enrichment

For one-off stories outside an epic, use `/enrich-us <path-to-story-file>` instead.
The skill enriches the story in place using the same Phase 2 prompt.
