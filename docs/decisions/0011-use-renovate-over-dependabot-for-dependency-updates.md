---
status: accepted
date: 2026-06-01
---

# Use Renovate over Dependabot for dependency updates

## Context and Problem Statement

We need an automated tool to keep dependencies up to date across the monorepo. Both Renovate and Dependabot are widely
used, but they differ significantly in configurability, ecosystem coverage, and hosting options. Which tool should we
standardise on?

## Considered Options

- Renovate
- Dependabot

## Decision Outcome

Chosen option: "Renovate", because it is more configurable, supports self-hosting, and has historically been faster to
adopt new ecosystems than Dependabot.

### Consequences

- Good, because `renovate.json` provides fine-grained control over update schedules, grouping, automerge rules, and
  more.
- Good, because Renovate can be self-hosted, reducing reliance on GitHub's infrastructure and allowing use in air-gapped
  or private environments.
- Good, because Renovate has a strong track record of rapid support for new package managers and ecosystems (e.g.
  pixi/conda, Deno).
- Bad, because Renovate requires more initial configuration effort compared to Dependabot's zero-config setup.
