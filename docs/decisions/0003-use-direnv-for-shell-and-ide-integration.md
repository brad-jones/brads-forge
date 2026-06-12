---
status: accepted
date: 2026-06-01
---

# Use direnv for shell and IDE environment activation

## Context and Problem Statement

The project uses pixi to manage the development environment. Developers need the pixi environment activated (PATH, env
vars, etc.) whenever they open a shell in the project root or launch an IDE. The existing pattern `pixi run code` (and
similar per-tool commands) launches VS Code with the environment applied, but it requires developers to remember and use
a specific command, only works for tools explicitly wrapped in pixi tasks, and does not integrate with IDEs or shells
that are opened independently. We need an approach that activates the environment automatically and works across any
shell or IDE that the developer chooses.

## Considered Options

- direnv (`.envrc` + `pixi shell-hook`)
- `pixi run <tool>` task wrappers per tool/IDE

## Decision Outcome

Chosen option: "direnv", because it activates the pixi environment automatically on `cd` — once configured it requires
no per-invocation ceremony, works generically for any shell (bash, zsh, fish, nushell, …) and any IDE or editor that
respects the shell environment, removing the need to maintain a separate `pixi run` task for every tool.

### Consequences

- Good, because any terminal session or IDE launched from within the project directory gets the correct environment
  without extra steps.
- Good, because it eliminates the need for per-tool `pixi run <ide>` task wrappers.
- Good, because it is a widely adopted pattern supported by bash, zsh, fish, nushell, and most modern IDEs (VS Code,
  JetBrains, Neovim, etc.) via shell integration or plugins.
- Bad, because developers must install and configure direnv once in their shell (a one-time setup step outside the pixi
  environment).
- Bad, because direnv requires a deliberate `direnv allow` after each change to `.envrc`, adding a small friction point
  when the file is updated.

## Notes

The `.envrc` file at the project root runs `pixi shell-hook` to inject the environment and then calls `task init` to
ensure any first-time setup steps are applied on entry. The `pixi run code` task is retained for compatibility but is no
longer the recommended primary workflow.
