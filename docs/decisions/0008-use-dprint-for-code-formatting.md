---
status: accepted
date: 2026-06-01
---

# Use dprint for code formatting

## Context and Problem Statement

The project spans multiple file types (TypeScript, JSON, TOML, Markdown, etc.) and needs a consistent, fast code
formatter. We want a single configuration file that covers all supported file types without depending on a Node.js
runtime, which may not be present in non-Node-based environments.

## Considered Options

- dprint
- Prettier

## Decision Outcome

Chosen option: "dprint", because it allows code style rules for all file types to be defined in a single `dprint.json`,
runs as compiled WASM plugins (no Node.js dependency), and is significantly faster than Prettier — making it suitable
for both Node.js and non-Node.js project stacks.

### Consequences

- Good, because a single `dprint.json` centralises formatting rules for all file types.
- Good, because WASM-based plugins have no Node.js runtime requirement, supporting polyglot project setups.
- Good, because dprint is faster than Prettier, improving developer feedback loops and CI times.
- Bad, because the dprint plugin ecosystem is smaller than Prettier's; some file types may lack a mature plugin.
