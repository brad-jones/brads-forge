---
status: accepted
date: 2026-06-01
---

# Keep CI pipelines as thin orchestration layers over portable tasks

## Context and Problem Statement

The project uses GitHub Actions for CI/CD. As pipelines grow, there is a natural tendency to reach for platform-specific
actions (e.g. `actions/setup-*`, marketplace actions) to handle logic inline. Doing so embeds build knowledge inside the
CI platform, making it hard to reproduce pipelines locally and costly to migrate to another platform. How should
pipeline logic be structured to balance convenience with portability?

## Decision Drivers

- Pipelines should be reproducible locally without a CI environment.
- Migrating to a different CI platform (e.g. GitLab CI/CD, Buildkite) should not require rewriting pipeline logic.
- Developers should be able to run the same steps that CI runs from their own machine.
- Complexity and platform coupling should be minimised in CI configuration files.

## Considered Options

- Keep CI pipelines as thin orchestration layers that delegate to Taskfile tasks and Deno scripts
- Use GitHub Actions–native features (composite actions, reusable workflows, marketplace actions) for pipeline logic
- Mix: use platform actions for setup/infrastructure steps, tasks for build/test/deploy logic

## Decision Outcome

Chosen option: "Keep CI pipelines as thin orchestration layers that delegate to Taskfile tasks and Deno scripts",
because it is the only approach that keeps all meaningful pipeline logic portable and locally reproducible — meeting our
core decision drivers around portability and developer experience.

GitHub Actions YAML files should do only what the platform must own: checking out code, setting up the environment (via
`setup-pixi`), and invoking tasks. All build, test, lint, release, and deployment logic lives in `Taskfile.yaml` or
`scripts/`.

Using a specific action is acceptable when it handles something that is genuinely platform-specific and has no
meaningful portable equivalent (e.g. creating github attestations). Such exceptions should be kept to a minimum and
noted explicitly.

_NB: This is a guiding principle, not a hard & fast rule._

### Consequences

- Good, because any pipeline step can be run locally with `task <name>` or `deno run scripts/<name>.ts`.
- Good, because migrating to another CI platform requires only a thin new config file — not a rewrite.
- Good, because pipeline logic is type-checked and testable (Deno scripts) or clearly structured (Taskfile).
- Bad, because some GitHub Actions marketplace actions offer convenience that requires equivalent Taskfile/script work
  to replicate.
- Bad, because developers must remember to add new logic to tasks first, not directly to workflow YAML.

### Confirmation

Review CI workflow files in `.github/workflows/`. Each step should be one of:

1. A platform setup step (checkout, environment activation).
2. A call to `task <name>` or `deno run scripts/<name>.ts`.

Any step containing significant inline shell logic, or that uses a non-setup marketplace action for business logic, is a
violation of this ADR and should be refactored into a task or script.

## Pros and Cons of the Options

### Keep CI pipelines as thin orchestration layers

- Good, because full portability — the same `task` commands work on any developer machine and any CI platform.
- Good, because a single source of truth for pipeline logic in `Taskfile.yaml` and `scripts/`.
- Good, because Deno scripts are type-checked, testable, and version-controlled like application code.
- Bad, because initial setup requires writing a task or script rather than dropping in a marketplace action.

### Use GitHub Actions–native features for pipeline logic

- Good, because marketplace actions are quick to adopt and well-documented.
- Bad, because logic becomes locked to GitHub Actions — impossible to run locally without `act` or similar tooling.
- Bad, because migrating to another platform requires identifying and porting every action used.
- Bad, because composite actions and reusable workflows add indirection without portability benefits.

### Mix: platform actions for setup, tasks for logic

- Good, because setup/infrastructure concerns (environment activation, credentials) are handled by well-maintained
  actions.
- Neutral, because the boundary between "setup" and "logic" is ambiguous and drifts over time.
- Bad, because without a clear rule the mix tends to grow towards more platform coupling, not less.
