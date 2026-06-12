---
status: accepted
date: 2026-06-01
---

# Use go-task (Taskfile) over the built-in pixi task system

## Context and Problem Statement

The project uses pixi for environment and dependency management, which includes a built-in task runner. We need a task
runner to orchestrate build, lint, format, and other developer workflows. Should we use pixi's built-in task system or
adopt a dedicated task runner?

## Considered Options

- go-task (Taskfile)
- Pixi built-in tasks

## Decision Outcome

Chosen option: "go-task (Taskfile)", because it upholds the Unix philosophy of one tool for one job — pixi manages
environments and packages, while go-task handles task orchestration. This separation keeps responsibilities clear and
avoids coupling workflow logic to the package manager.

### Consequences

- Good, because task definitions are portable and not tied to pixi's task model.
- Good, because `Taskfile.yaml` is a well-known, standalone format with its own ecosystem and documentation.
- Bad, because developers need to have both `pixi` and `task` installed (though `task` is managed via pixi, so this is
  transparent in practice).
