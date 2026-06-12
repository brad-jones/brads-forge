---
status: accepted
date: 2026-06-01
---

# Use Lefthook for git hook management

## Context and Problem Statement

The project needs a way to enforce code quality checks (linting, formatting, commit message validation) at commit and
push time via git hooks. Popular alternatives like Husky are tightly coupled to Node.js and `npm`/`package.json`, which
conflicts with our tooling-agnostic, pixi-managed environment. What tool should we use to manage git hooks?

## Considered Options

- Lefthook
- Husky
- Plain shell scripts in `.git/hooks/`

## Decision Outcome

Chosen option: "Lefthook", because it is tooling-agnostic and integrates cleanly with any package manager or environment
— including our pixi setup — without requiring a Node.js project structure.

### Consequences

- Good, because hooks work regardless of the language or runtime used in the project.
- Good, because Lefthook is available via conda-forge and can be managed directly through pixi.
- Good, because configuration lives in a single `lefthook.yaml` file at the repo root, which is easy to read and
  version-control.
- Bad, because team members familiar with Husky will need to learn Lefthook's configuration format.
