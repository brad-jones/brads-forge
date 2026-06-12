---
status: accepted
date: 2026-06-01
---

# Use Deno for tasks and automation instead of shell scripting

## Context and Problem Statement

Project automation often starts as short shell commands in a Taskfile or CI config, but grows into multi-line bash that
is hard to read, test, and maintain reliably across platforms. We need a rule that defines when to reach for a
higher-level scripting language instead of embedding shell logic inline in YAML.

## Considered Options

- Deno (TypeScript)
- Bash / shell scripts embedded in YAML

## Decision Outcome

Chosen option: "Deno (TypeScript)", because it provides TypeScript out of the box with no separate install or
`node_modules` overhead, and runs identically everywhere — meeting our maintainability and portability decision drivers.

**Rule of thumb:** if you are tempted to embed multi-line bash inside YAML, write a Deno script in `scripts/` instead.

> Really any higher-level scripting language would work, such as Python, so long as it can be executed from a Taskfile
> without extra package install steps. ie: The script MUST by self-contained. `uv` supports this:
> <https://docs.astral.sh/uv/guides/scripts/#declaring-script-dependencies>

### Consequences

- Good, because scripts are type-checked and easier to refactor than inline shell.
- Good, because no separate dependency install step — Deno is already managed by pixi.
- Good, because scripts can be tested and linted like any other TypeScript code.
- Bad, because contributors less familiar with TypeScript/Deno may have a steeper initial learning curve compared to
  bash.
