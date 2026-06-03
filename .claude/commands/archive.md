---
description: Close a SPECBOOT story after verify passes green. Syncs specs to code reality, updates catalog and project-map, marks the story done, repairs cross-references, and commits. Run after /verify green.
allowed-tools: Read Write Edit Glob Grep Bash(git log *) Bash(git diff *) Bash(git status *) Bash(git add *) Bash(git commit *) Bash(pnpm *)
argument-hint: <story-path>
---

Invoke the `archive` skill with story path: $ARGUMENTS

Load `.claude/skills/archive/SKILL.md` and follow every step exactly.
