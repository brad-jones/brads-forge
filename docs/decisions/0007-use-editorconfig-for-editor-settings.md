---
status: accepted
date: 2026-06-01
---

# Use EditorConfig for editor settings

## Context and Problem Statement

The project is worked on across different editors and IDEs (VS Code, IntelliJ, Neovim, etc.) by contributors who may
have different default editor settings. Without a shared baseline, files can accumulate inconsistent indentation, line
endings, and trailing whitespace. What is the lightest-weight way to enforce a consistent baseline across all editors?

## Considered Options

- EditorConfig
- Per-editor configuration files (`.vscode/settings.json`, etc.)

## Decision Outcome

Chosen option: "EditorConfig", because it is natively supported or available via plugin in virtually every editor,
requires no runtime, and establishes a universal baseline (charset, indent style/size, line endings, trailing
whitespace) from a single `.editorconfig` file at the repo root.

### Consequences

- Good, because editors automatically apply consistent settings with no additional tooling required.
- Good, because `.editorconfig` is widely understood and supported across the ecosystem.
- Good, because it complements dprint rather than conflicting with it — EditorConfig handles editor-level defaults,
  dprint enforces formatting on save/CI.
- Bad, because EditorConfig only covers basic settings; it cannot enforce language-specific style rules beyond
  indentation.
