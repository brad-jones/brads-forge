---
name: lefthook
description: Use whenever working in a repo that has (or should have) a lefthook.yml/.toml/.json config, or when the user mentions "lefthook", Git hooks, pre-commit/pre-push automation, or asks to lint/format/test staged files on commit. Covers writing and editing lefthook config, the jobs/commands/scripts schemas, file-template placeholders like {staged_files}, skip/only conditions, the CLI (install/run/validate/dump), and lefthook's beta support for wiring hooks into Claude Code/Codex/Cursor/Copilot. Always consult this before hand-writing a lefthook.yml from memory — the schema has evolved (jobs syntax, ai key) and guessing produces configs that silently no-op.
---

# Lefthook

Lefthook (https://lefthook.dev, by Evil Martians) is a fast, dependency-free Git hooks manager written in Go. You write
a declarative config; `lefthook install` turns it into thin scripts in `.git/hooks/` that shell out to `lefthook run
<hook>`.

Two things make lefthook configs easy to get subtly wrong: there are **two job schemas** (legacy `commands`/`scripts`
vs. modern `jobs`), and behavior like file filtering, `stage_fixed`, and template placeholders only fire under specific
conditions. Prefer editing the existing config's style over introducing a second schema in the same file, and check the
reference tables below rather than guessing option names.

## 1. Find or create the config

Lefthook looks for exactly one of these (mixing formats in one repo is not supported — if more than one exists, which
one wins is undefined):

| Format | Accepted filenames                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------- |
| YAML   | `lefthook.yml`, `lefthook.yaml`, `.lefthook.yml`, `.lefthook.yaml`, `.config/lefthook.yml`, `.config/lefthook.yaml` |
| TOML   | `lefthook.toml`, `.lefthook.toml`, `.config/lefthook.toml`                                                          |
| JSON   | `lefthook.json`, `.lefthook.json`, `.config/lefthook.json`                                                          |
| JSONC  | `lefthook.jsonc`, `.lefthook.jsonc`, `.config/lefthook.jsonc`                                                       |

An optional `lefthook-local.yml` (same naming rules — if the main config has a leading dot, so must the local one) is
merged on top for personal, gitignored overrides. It can also exist **without** a main config, for someone who wants
hooks locally without imposing them on the team.

Before editing, `view` the existing file to see which format and which job schema (see below) the repo already uses.

## 2. Top-level shape

Each top-level key is either a **Git hook name** (`pre-commit`, `commit-msg`, `pre-push`, `post-merge`, etc. — any real
Git hook) or a **custom hook name** you invoke manually with `lefthook run <name>`:

```yaml
# lefthook.yml
pre-commit: # real Git hook
  jobs:
    - run: yarn lint --fix {staged_files}
      glob: "*.{js,ts}"
      stage_fixed: true

check-docs: # custom hook, run via `lefthook run check-docs`
  jobs:
    - run: yarn check-docs
```

## 3. Jobs vs. commands/scripts — use `jobs`

**`jobs`** (lefthook ≥ 1.10.0) is the current, more capable schema and the default choice for any new config. Named jobs
merge cleanly across `extends`/local overrides; unnamed jobs append in order. Jobs can be grouped for `parallel` or
`piped` sub-flows:

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: migrate
      root: backend/
      glob: "db/migrations/*"
      group:
        piped: true # these two run in sequence...
        jobs:
          - run: bundle install
          - run: rails db:migrate
    - run: yarn lint --fix {staged_files} # ...while this runs in parallel with the group
      root: frontend/
      stage_fixed: true
    - script: verify.sh
      runner: bash
```

Note: inside a `group`, only `root`, `glob`, and `exclude` cascade to the nested jobs — other options must be set
per-job.

The **legacy schema** (`commands:` map + `scripts:` map, keyed by name) still works and you'll see it in older repos:

```yaml
pre-commit:
  commands:
    lint:
      run: yarn lint {staged_files} --fix
      glob: "*.js"
  scripts:
    "good_job.js":
      runner: node
```

If a repo already uses `commands`/`scripts`, match that style rather than mixing in `jobs` — don't migrate an existing
config's schema unless the user asks for it.

## 4. Job/command option reference

| Option          | Purpose                                                                      |
| --------------- | ---------------------------------------------------------------------------- |
| `name`          | Job name (for `--job` filtering, logs, `{lefthook_job_name}`)                |
| `run`           | Shell command to execute (mutually exclusive with `script`)                  |
| `script`        | Path to a script file (paired with `runner`)                                 |
| `runner`        | Interpreter for `script`, e.g. `bash`, `node`                                |
| `args`          | Extra args appended to `run`/`script`                                        |
| `group`         | Nested `{ parallel / piped, jobs }` for sub-flows                            |
| `glob`          | Only run if matching staged/changed files exist (string or list)             |
| `files`         | Shell command that produces the file list `{files}` expands to               |
| `file_types`    | Filter by file type (e.g. `text`, `binary`)                                  |
| `root`          | Run from this subdirectory (monorepos)                                       |
| `exclude`       | Glob(s) to exclude from the file set                                         |
| `only` / `skip` | Conditionally run/skip — see §6                                              |
| `tags`          | Labels for `lefthook run <hook> --tag <tag>` and `exclude_tags`              |
| `env`           | Extra environment variables for this job                                     |
| `stage_fixed`   | `git add` the (filtered) files back after the job runs — **pre-commit only** |
| `fail_text`     | Custom message shown on failure                                              |
| `interactive`   | Attach TTY (for prompts, e.g. AI commit-message tools)                       |
| `use_stdin`     | Pipe matched files to the command's stdin instead of args                    |
| `priority`      | Execution order hint among sibling jobs                                      |

Hook-level (not per-job) options include `parallel`, `piped`, `follow`, hook-wide `files`, `fail_on_changes`,
`fail_on_changes_diff`, `exclude_tags`, `only`, `skip`, and `setup`.

## 5. `run` template placeholders

```
{files}              — output of this job's `files:` command
{staged_files}        — staged files (pre-commit)
{push_files}          — committed-but-not-pushed files (pre-push)
{all_files}           — every file tracked by git
{cmd}                 — shorthand for the job's own command (useful for local docker wrapping)
{0}                   — all git hook arguments, space-joined
{1}, {2}, ...          — individual git hook arguments (e.g. {1} = commit-msg file path)
{lefthook_job_name}    — the current job/command/script name
```

```yaml
pre-commit:
  jobs:
    - run: yarn eslint {staged_files}
      glob: "*.{js,ts,jsx,tsx}"

pre-push:
  jobs:
    - run: yarn eslint {push_files}
      glob: "*.{js,ts,jsx,tsx}"

commit-msg:
  jobs:
    - run: 'test $(grep -c "^Signed-off-by: " {1}) -lt 2'
```

Long file lists are automatically split across multiple invocations to respect the OS command-length limit — don't
hand-roll batching. If filenames may contain spaces, quote the placeholder: `run: yarn eslint "{staged_files}"`.

## 6. `only` / `skip` conditions

Both accept the same condition vocabulary, at the hook level (skips the whole hook) or job level (skips just that job):

- `rebase` / `merge` / `merge-commit` — current Git state
- `ref: main` or `ref: dev/*` — current branch (glob supported)
- `run: <shell condition>` — skip/only if the command exits 0
- `skip: true` — unconditional (handy for overriding to `false`/`true` in `lefthook-local.yml` per person)

```yaml
pre-push:
  jobs:
    - run: yarn test
      skip:
        - run: test "$NO_TEST" -eq 1
    - run: yarn lint
      only:
        - ref: main
```

## 7. `stage_fixed`: auto-restage fixed files

Only works on `pre-commit`. After the job runs, lefthook re-runs `git add` on the files it touched — using the job's
`files:` command if set, otherwise `{staged_files}`, with any `glob`/`exclude` filters re-applied. This is how "run
prettier/eslint --fix and auto-stage the result" configs work; don't reach for a separate `git add` step.

## 8. `templates`: shared prefixes / local overrides

Factor out repeated wrappers (e.g. a docker-compose prefix) and let teammates override them locally without touching
every job:

```yaml
# lefthook.yml
templates:
  wrapper: docker-compose run --rm -v $(pwd):/app service
pre-commit:
  jobs:
    - run: "{wrapper} yarn lint"
```

```yaml
# lefthook-local.yml
templates:
  wrapper: "" # run natively instead, just for this person
```

## 9. CLI

```
lefthook install [<hook> ...]   # write .git/hooks scripts (safe to re-run; also creates
                                 # an empty lefthook.yml if none exists). NPM installs of
                                 # the `lefthook` package do this in postinstall automatically.
lefthook uninstall              # remove installed hooks
lefthook run <hook>             # run a hook's jobs directly (what the installed hooks call)
  --job <name>  --tag <tag>     # run only matching jobs (repeatable)
  --all-files                   # force {staged_files}/etc. to resolve to {all_files}
  --file <path>                 # force the file set explicitly (repeatable; wins over --all-files)
lefthook add <hook>             # scaffold a hook entry
lefthook validate               # lint the config itself — run this after hand-editing
lefthook dump                   # print the fully-resolved effective config
lefthook check-install          # verify hooks are installed and up to date (good for CI)
lefthook self-update            # update the lefthook binary
```

You do **not** need to re-run `install` after editing `lefthook.yml` — the config is read fresh on every hook
invocation. Re-run `install` only when hook _names_ change (a new custom hook, or enabling the `ai` key below) or after
uninstalling.

Useful env vars: `LEFTHOOK=0 git commit ...` skips lefthook entirely for one command; conversely `LEFTHOOK=1 npm
install` forces the postinstall hook-install step to run even when a CI environment would normally suppress it. Others
(`LEFTHOOK_VERBOSE`, `LEFTHOOK_OUTPUT`, `LEFTHOOK_CONFIG`, `LEFTHOOK_EXCLUDE`, `NO_COLOR`) are documented at
https://lefthook.dev/usage/envs/.

## 10. `ai` (beta): wiring hooks into AI coding agents

Lefthook can generate the hook-settings file for an AI coding agent so that _agent_ lifecycle events (not just Git
events) call `lefthook run <hook>`. This is a genuinely good fit for this skill's own use case — e.g. running your test
suite when Claude Code finishes a turn, or a security check before it uses a tool.

```yaml
# lefthook.yml
ai:
  claude:
    Stop: validate
    PreToolUse: security-check
  codex:
    Stop: validate
  cursor:
    stop: validate
    preToolUse: security-check
  copilot:
    postToolUse: validate

validate:
  jobs:
    - run: go test ./...

security-check:
  jobs:
    - run: ./scripts/security.sh
```

| Provider  | Generated file                | Event names come from                                                                                   |
| --------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `claude`  | `.claude/settings.json`       | [Claude Code hooks](https://code.claude.com/docs/en/hooks.md)                                           |
| `codex`   | `.codex/hooks.json`           | [Codex CLI hooks](https://developers.openai.com/codex/hooks)                                            |
| `cursor`  | `.cursor/hooks.json`          | [Cursor hooks](https://cursor.com/docs/agent/hooks)                                                     |
| `copilot` | `.github/hooks/lefthook.json` | [Copilot CLI hooks](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks) |

Running `lefthook install` (re-)generates these. For `claude`/`codex`/`cursor` it replaces only lefthook-managed entries
and leaves any hand-authored entries in the same file untouched; `lefthook uninstall` strips just the lefthook-managed
ones. `copilot` is all-or-nothing: install rewrites `.github/hooks/lefthook.json` from scratch and uninstall deletes it.
This is still beta — check https://lefthook.dev/configuration/ai/ for the current provider/event list before relying on
it.

## 11. Common recipes

**Lint + auto-fix + restage on commit:**

```yaml
pre-commit:
  parallel: true
  jobs:
    - run: yarn stylelint --fix {staged_files}
      glob: "*.css"
      stage_fixed: true
    - run: yarn eslint --fix {staged_files}
      glob: "*.{ts,js,tsx,jsx}"
      stage_fixed: true
```

**Monorepo, scoped per package:**

```yaml
pre-commit:
  parallel: true
  jobs:
    - run: yarn lint --fix {staged_files}
      root: frontend/
      stage_fixed: true
    - run: bundle exec rubocop
      root: backend/
    - run: golangci-lint run
      root: services/proxy/
```

**Skip entirely during merge/rebase, and let CI bypass a slow check:**

```yaml
pre-commit:
  skip:
    - merge
    - rebase
  jobs:
    - run: yarn test
      skip:
        - run: test "$CI" = "true"
```

## 12. Sanity-check your edits

After hand-editing a config, run `lefthook validate` to catch schema errors, and `lefthook dump` to see the
fully-resolved config (useful for confirming `extends`/`templates`/local overrides merged the way you expect) before
telling the user it's done.
