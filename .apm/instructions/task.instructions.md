---
description: Rules for running (& writing) development tasks and automation.
applyTo: "**"
---

### Task Runner

We use [Task (go-task)](https://taskfile.dev/) (`Taskfile.yaml`) for orchestrating our automation. It's our own
documented interface to our tooling — it wraps extra setup (env vars, flags, pre-steps, package-manager detection) that
a bare `npm test` or `go build` would skip. Read it before guessing. More information about how to use task effectively
can be found in the `task` skill.

#### Additional Scripts & Automation

The `scripts/` directory holds automation that does not easily fit into a Taskfile. **Rule of thumb:** if you are
tempted to embed multi-line bash inside YAML, write a Deno script in `scripts/` instead.

Scripts are authored in TypeScript and executed with Deno:

```bash
deno run -A scripts/<script-name>.ts
```

> Always add the she-bang line (`#!/usr/bin/env -S deno run -qA --ext=ts`) to the top of scripts & ensure they are
> executable (`chmod +x scripts/<script-name>.ts`). This allows scripts to easily be referred to and executed anywhere
> in the repo, just like they were standalone executables.

##### Script Location

This is a monorepo and may have multiple `projects/` directories. Each with their own Taskfile. Scripts that are shared
across the entire repo should be placed in the top-level `scripts/` directory. Scripts that are specific to a project
should be placed in the `scripts/` directory of that project.
