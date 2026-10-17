---
description: How to work with this repo's development environment.
applyTo: "**"
---

### Pixi Development Environment

This repo is built on [pixi](https://pixi.prefix.dev/latest/). All tooling is managed via `pixi.toml`. Always prefix
commands with `pixi run` (eg: `pixi run -- deno run foo.ts`) to ensure the correct environment is used. More information
about pixi can be found in the `pixi` skill.

> In Claude Code on the web (`CLAUDE_CODE_REMOTE=true`) the `remote` pixi environment is already activated in every
> shell, so run tools directly (eg: `deno run foo.ts`).

#### Tools that don't need pixi

Tools that would typically be installed on a developers machine do not need to be prefixed with `pixi run`. eg: `git`,
`grep`, `sed`, `awk`, `curl`, `wget`, etc. If unsure check what is installed by reading `pixi.toml` at the root of the
repo.

#### Downloaded Dependencies

**IMPORTANT: Never search the entire root filesystem for dependencies! eg: Any command starting with `find /` is
expressly forbidden. This is too slow.**

##### Deno Module Cache Location

The Deno module cache is located inside the pixi environment, **not** in the user's home directory:
`./.pixi/envs/default/var/cache/deno`. When looking for cached Deno module source code, inspect this path rather than
`~/.cache/deno`.
