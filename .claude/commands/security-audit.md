---
description: Run all 7 active security audits against a running HWP site and save a consolidated report to docs/audits/security/security-audit-{date}.md. Run from within the client repo. Use before any production deployment, after adding user-input blocks, or when setting up a new client site.
allowed-tools: Read Write Glob Bash(curl *) Bash(node *) Bash(pnpm *) Bash(grep *) Bash(ls *) Bash(test *) Bash(mkdir *) Bash(git *)
argument-hint: [site-slug]
---

Invoke the `security-audit` skill with site slug: $ARGUMENTS

Load `.claude/skills/security-audit/SKILL.md` and follow every step exactly.
