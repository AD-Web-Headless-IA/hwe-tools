---
description: Apply security fixes from the latest audit report in up to 6 committed groups (headers → RGPD → input handling → secrets → dependencies → Next.js patterns). Skips categories with no findings. Run /security-audit {slug} first if no report exists.
allowed-tools: Read Write Edit Glob Grep Bash(git *) Bash(pnpm *) Bash(node *) Bash(ls *) Bash(find *) Bash(curl *) Bash(mkdir *)
argument-hint: [site-slug]
---

Invoke the `security-fix` skill with site slug: $ARGUMENTS

Load `.claude/skills/security-fix/SKILL.md` and follow every step exactly.
