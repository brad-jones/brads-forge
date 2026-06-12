---
status: accepted
date: 2026-06-01
---

# Use pixi for development environment setup

## Context and Problem Statement

Projects need a reproducible, cross-platform development environment that installs all required tooling consistently for
every contributor. Ad-hoc installation instructions drift over time and lead to "works on my machine" problems. What
tool should we standardise on to manage the development environment?

## Decision Drivers

- Must be cross-platform (Linux, macOS, Windows)
- Must be reproducible — same tool versions for all contributors
- Must be fast to set up with minimal friction
- Should not rely on brittle shell-script shims or virtualisation overhead

## Considered Options

- pixi
- mise
- asdf
- pkgx
- Dev Containers (containers.dev)

## Decision Outcome

Chosen option: "pixi", because it meets all decision drivers — it is cross-platform, reproducible via a lock file and
fast.

### Consequences

- Good, because the entire toolchain is declared in `pixi.toml` and pinned in `pixi.lock`, giving every contributor
  identical environments.
- Good, because pixi is a single static binary with no shell-script shims, making it reliable across platforms.
- Good, because environment activation is explicit (`pixi shell` / `pixi run`) rather than silently hooking into the
  shell, which avoids subtle path-poisoning issues.
- Bad, because contributors must install pixi itself before they can use it — though this is a one-time, well-documented
  step.
- Bad, because pixi is a relatively young tool; some edge-case packages on conda-forge may lag behind upstream releases.

## Pros and Cons of the Options

### pixi

Cross-platform package and task manager built on the conda-forge ecosystem.

- Good, because full Windows, macOS, and Linux support out of the box.
- Good, because `pixi.lock` guarantees byte-for-byte reproducible environments.
- Good, because task runner (`pixi run`) is built in, replacing some shell-script glue.

### mise

Polyglot runtime manager (successor to rtx/asdf-in-rust).

- Good, because fast and written in Rust; avoids the shell-script brittleness of asdf.
- Good, because supports a wide range of language runtimes via plugins.

> This is a strong contender, the author just hasn't tried it yet because he did not know about it when he started
> evaluating options.

### asdf

Extensible version manager via shell plugins.

- Good, because mature ecosystem with many community plugins.
- Bad, because built on shell scripts that are fragile and difficult to debug across shells.
- Bad, because plugin quality varies significantly; some plugins are unmaintained.

### pkgx

Decentralised package runner that resolves packages on demand.

- Good, because zero-install UX for ad-hoc tool usage.
- Bad, because Windows support was absent when the author first needed a cross-platform dev-env solution; support
  remains limited.

### Dev Containers (containers.dev)

Containerised development environments defined via `devcontainer.json`.

- Good, because fully isolated and reproducible environments.
- Good, because first-class VS Code integration.
- Bad, because requires Docker, which introduces significant overhead — especially on non-Linux systems where a Linux VM
  is needed for Docker to run.
- Bad, because container startup and rebuild times add friction to day-to-day development.
- Bad, because native filesystem performance is degraded on macOS and Windows due to bind-mount overhead.
