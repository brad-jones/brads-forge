---
status: accepted
date: 2026-06-01
---

# Use xcaffold to manage AI agent configuration across providers

## Context and Problem Statement

We use multiple AI coding agents (GitHub Copilot, Claude Code, Gemini CLI, etc.) that each read configuration from
different locations and in slightly different formats. While there is ongoing work to standardise this — through
conventions like `AGENTS.md` and `.agents/skills/` — not all agents honour these standards yet. Managing per-agent
configuration files manually leads to duplication and drift. How should we maintain a single source of truth for our
agent harness that can be applied consistently across all supported providers?

## Considered Options

- xcaffold — a deterministic agent configuration compiler that compiles a shared `xcaf/` source tree into
  provider-specific output directories
- Maintain per-provider configuration files manually (e.g. `.claude/`, `.github/copilot-instructions.md`, `.gemini/`)
- Use only the emerging community standards (`AGENTS.md`, `.agents/`) and accept limited coverage

## Decision Outcome

Chosen option: "xcaffold", because it provides a single authoritative source (`xcaf/`) that compiles to the correct
provider-specific layout for each agent, eliminating duplication and allowing the team to take advantage of different
models and pricing tiers without maintaining divergent configuration by hand.

### Consequences

- Good, because agent skills, rules, and context are defined once and applied consistently across all providers.
- Good, because adopting a new agent provider requires only running `xcaffold apply` rather than manually authoring new
  configuration files.
- Good, because as community standards mature (e.g. `.agents/`) xcaffold can add a new target without changing the
  source `xcaf/` files.
- Bad, because xcaffold is an additional tool in the chain that contributors need to understand and run when changing
  agent configuration.
- Bad, because provider-specific output directories (`.claude/`, `.cursor/`, etc.) must not be edited directly, which
  may be unintuitive for contributors unfamiliar with the workflow.
