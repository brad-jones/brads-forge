---
name: task
description: Work with Task (go-task) in any repo that has a Taskfile (Taskfile.yml, .yaml, or .dist.yaml). Covers discovering and running existing tasks (task --list, passing args, watch mode, dry-run) and authoring/editing Taskfiles (schema, vars, deps, sources/generates for incremental builds, preconditions, includes for monorepos, templating, Makefile conversion). Use this at the start of any build, test, run, lint, fmt, clean, migrate, deploy, or codegen action in a repo that has a Taskfile — read the Taskfile before falling back to guessed ecosystem defaults like bare npm/cargo/make commands. Also use when asked to add a task, wire up automation, or convert a Makefile/Justfile to Task.
---

# Task (go-task)

Task is a YAML-based task runner. When a repo has a Taskfile, it's the project's own documented interface to its tooling
— it often wraps extra setup (env vars, flags, pre-steps, package-manager detection) that a bare `npm test` or `go
build` would skip. Read it before guessing.

## 1. Discover before running

- Look for `Taskfile.yml`, `Taskfile.yaml`, or `Taskfile.dist.yml/yaml` at the repo root, and check `includes:` for
  nested Taskfiles in subdirectories (common in monorepos).
- Run `task --list` (`-l`) to see documented tasks and their `desc`. `task --list-all` (`-la`) also shows tasks without
  a description.
- `task --summary <name>` prints a task's summary, deps, and commands without running it — use this instead of guessing
  what a task does from its name.
- If a task named `default` exists, bare `task` runs it — that's usually the project's "start here" entrypoint.

## 2. Running tasks

- `task <name>` runs it; `task lint test build` runs several in sequence.
- Everything after `--` is passed through as `{{.CLI_ARGS}}` inside the task: `task run -- --flag value`.
- Override a var for one invocation: `task build TAG=v1.2.3`.
- `-w/--watch` reruns on file changes (uses the task's `sources:`).
- `-d/--dir <path>` runs as if invoked from another directory.
- `-n/--dry` prints the commands without executing them — useful to sanity check a task before trusting it.
- `-s/--silent` suppresses command echo; `-v/--verbose` shows more, including why a checksum/timestamp task decided to
  skip or run.
- `-f/--force` re-runs a task even if `sources`/`status` say it's up to date.

## 3. Taskfile anatomy

```yaml
version: "3"

vars:
  BIN_DIR: bin

env:
  CGO_ENABLED: "0"

dotenv: [".env"]

includes:
  web:
    taskfile: ./web/Taskfile.yml
    dir: ./web

tasks:
  build:
    desc: Build the binary
    cmds:
      - go build -o {{.BIN_DIR}}/app .
```

- `version` — keep at `'3'`; that's the current schema.
- `vars` — Taskfile-level variables, referenced as `{{.NAME}}` anywhere in the file.
- `env` — exported into every task's shell.
- `dotenv` — loads `.env`-style files without overriding vars already set in the environment.
- `includes` — namespaces another Taskfile's tasks (`task web:build`). Prefer this over one giant flat Taskfile once a
  repo has more than a couple of sub-projects.

## 4. Task fields worth knowing

- `desc` / `summary` — `desc` is the one-liner shown in `--list`; `summary` is longer help shown by `task --summary`.
  Give every human-facing task a `desc`; leave it off (or use `internal: true`) for helper tasks that shouldn't clutter
  the list.
- `cmds` — a list of shell commands (or `- task: other-task` to call another task). Each list item runs as its own shell
  invocation unless chained with `&&` or wrapped in a multi-line block.
- `deps` — other tasks to run first, **in parallel with no guaranteed order**. If one step must finish before another
  starts, don't rely on `deps` for that — call them as ordered `cmds` entries (`cmds: [{task: a}, {task: b}]`) instead.
- `sources` / `generates` (+ `method: checksum|timestamp|none`, default `checksum`) — the incremental-build mechanism:
  the task is skipped if none of `sources` changed since `generates` was last produced. This is the main reason to
  prefer Task over a naive script for anything expensive (compiling, codegen) — use it rather than hand-rolling your own
  "has this changed" checks.
- `status` — an alternative to `sources`/`generates`: a command whose exit code (0 = up to date) decides whether to skip
  the task. Use this when "up to date" isn't well modeled by file timestamps/checksums (e.g. "is this container already
  running").
- `preconditions` — a `sh` check plus `msg`; fails the task immediately with a clear message if false, instead of
  letting the real command fail cryptically later. Use this for missing binaries, unset secrets, or wrong working
  directory.
- `requires.vars` — declares vars that must be set (and, depending on the Task version, can restrict them to an enum);
  confirm the exact syntax against the schema reference below since this area of the schema has evolved.
- `platforms` — restricts a task to specific OS/arch.
- `vars` (task-level) — can be static or computed: `vars: { GIT_SHA: {sh: git rev-parse --short HEAD} }` runs the shell
  command once and assigns the trimmed output.
- `for` — repeats a task's commands over a list (`for: [a, b, c]`) or over another task's `sources`, exposing
  `{{.ITEM}}` — use this instead of copy-pasting near-identical tasks.
- `run: once | always | when_changed` — controls de-duplication when a task is a shared dependency of several other
  tasks in the same run.
- `silent`, `interactive`, `ignore_error`, `dir` — suppress command echo, mark a task as needing a TTY (e.g. it
  prompts), tolerate a non-zero exit, or run in a specific directory, respectively.

## 5. Templating

Task uses Go templates plus Sprig functions. Useful built-ins: `{{.TASK}}` (current task name), `{{.ROOT_DIR}}`,
`{{.TASKFILE_DIR}}`, `{{.USER_WORKING_DIR}}`, `{{.CLI_ARGS}}`, `{{.ITEM}}` (inside `for`), and the `OS`/`ARCH` functions
for cross-platform branches. A var containing spaces or special characters may need `{{.VAR | quote}}` — the
substitution happens before the shell ever sees the line, so shell quoting rules alone won't save you.

## 6. Authoring conventions

- **Edit, don't duplicate.** If a Taskfile already exists, add to it — don't create a second one alongside it. If
  `Taskfile.yml` is `.gitignore`d, a checked-in `Taskfile.dist.yml` is probably the real target for your edit; check
  before writing to the wrong file.
- **File naming**, in order of preference for a new file: `Taskfile.dist.yaml` > `Taskfile.dist.yml` > `Taskfile.yaml` >
  `Taskfile.yml`. Only introduce the `.dist` split if the project actually wants a committed base file plus an optional
  local, uncommitted override — don't invent that structure unprompted.
- **Mirror what already exists**, don't invent it. Before writing new tasks, check CI config (`.github/workflows`,
  `.gitlab-ci.yml`), `package.json` scripts, or an existing Makefile/Justfile for the real commands a project uses,
  rather than guessing at flags.
- **Detect, don't assume, the toolchain.** e.g. check for `yarn.lock` / `pnpm-lock.yaml` before defaulting to `npm`; use
  `sources`/precondition checks rather than hardcoding one package manager.
- **Fail fast and clearly.** Prefer a `precondition` with a helpful `msg` over letting a missing tool produce a raw
  "command not found".
- **Converting a Makefile/Justfile:** each `.PHONY` target becomes a task; recipe lines become `cmds`; `$(VAR)`/Make
  vars become Task `vars` referenced as `{{.VAR}}`; Make's implicit dependency ordering maps to either `deps` (parallel)
  or ordered `- task: x` steps in `cmds` (sequential) depending on whether order actually matters.

## 7. Gotchas

- Multi-line shell commands in YAML (`cmds: - |` or `>-`) are sensitive to indentation — check it renders as one block,
  not several list items.
- Task's default shell interpreter (`mvdan/sh`) is POSIX-ish and cross-platform for basics like `cp`/`rm`/`mkdir`; don't
  assume GNU coreutils flags exist, especially if the repo needs to run on Windows.
- After writing or editing a task, run `task --list` (and `task <name> --dry` where safe) to confirm it parses and does
  what you intended before calling it done.

## Reference

- Docs: https://taskfile.dev
- Schema reference: https://taskfile.dev/reference/schema/ — the authoritative source for exact field names/behavior;
  Task's schema evolves, so verify anything unusual here rather than trusting memory.
- CLI reference: https://taskfile.dev/reference/cli/
