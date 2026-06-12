---
status: accepted
date: 2026-06-01
---

# Use conventional commits standard for commit messages

## Context and Problem Statement

As the project grows, a consistent commit message format is needed to make history readable and to support automated
tooling. Without a shared convention, commit messages vary in style and content, making it difficult to understand what
changed and why.

## Considered Options

- Conventional Commits
- Free-form commit messages

## Decision Outcome

Chosen option: "Conventional Commits", because it provides a machine-readable structure
(`<type>[(scope)]: <description>`) that enables automated changelog generation and semantic versioning via
`cog bump --auto`, while also improving human readability of the git history.

> Full spec: <https://www.conventionalcommits.org/en/v1.0.0>

### Consequences

- Good, because `cog` _(and other tools like it)_ can automatically determine the next semantic version (`fix` → PATCH,
  `feat` → MINOR, breaking change → MAJOR).
- Good, because changelogs can be generated directly from commit history.
- Good, because commit intent is immediately clear from the type prefix.
- Bad, because contributors must learn and follow the convention, adding a small authoring overhead.
