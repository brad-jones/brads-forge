---
description: Working with this repo's agent harness.
applyTo: "**"
---

### APM Agent Harness Configuration

This repo uses [Microsoft's Agent Package Manager (apm)](https://microsoft.github.io/apm/). Refrain from editing files
like AGENTS.md, CLAUDE.md, GEMINI.md, .github/copilot-instructions.md, or anything under .claude/, .cursor/,
.github/instructions/, .agents/, .grok/, .kiro/, .opencode/, .windsurf/ directly. Instead, edit the source of truth in
`.apm/` and run `apm install` (and `apm compile` when the target needs it) to regenerate the output files. More
information about APM can be found in the `apm` skill.
