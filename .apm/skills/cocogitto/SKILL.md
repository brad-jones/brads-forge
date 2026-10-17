---
name: cocogitto
description: Guide for using cocogitto (the `cog` CLI) to create Conventional Commits, check commit history for spec compliance, auto-bump semantic versions from commit history, and generate changelogs for git repositories, including monorepos. Use this whenever the user mentions cocogitto, cog.toml, the `cog` binary or any of its subcommands (init, commit, check, verify, edit, log, changelog, bump, install-hook, get-version), or asks to set up conventional commits, automatic semver bumping, changelog generation, or a cocogitto-based release pipeline for a git repo — even if they don't name cocogitto explicitly (e.g. "auto-generate my CHANGELOG from commits", "bump my crate version based on commit history", "enforce conventional commits in CI").
---

# Cocogitto

Cocogitto is a CLI toolbox ("the conventional commit toolbox") built around the
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. It ships a single binary, `cog`,
that can create compliant commits, lint commit history, bump semantic versions based on commit types, and render
changelogs — for a single repo or a monorepo with multiple packages. Its only system dependency is `libgit2`. Docs:
https://docs.cocogitto.io — source: https://github.com/cocogitto/cocogitto.

Everything cocogitto does revolves around one config file, `cog.toml`, at the repository root, and one convention: **the
type prefix of a commit message determines whether — and how — the version bumps.**

## When to reach for which command

| Goal                                                                           | Command                                 |
| ------------------------------------------------------------------------------ | --------------------------------------- |
| Set up a repo for cocogitto                                                    | `cog init`                              |
| Write a compliant commit without hand-typing the prefix                        | `cog commit <type> "<message>" [scope]` |
| Lint existing commit history against the spec                                  | `cog check`                             |
| Test whether an arbitrary string is a valid commit message (no commit created) | `cog verify "<message>"`                |
| Rewrite non-compliant commits interactively                                    | `cog edit`                              |
| `git log`, but conventional-commit-aware (filter by type/scope/author)         | `cog log`                               |
| Render a changelog from tags/commits                                           | `cog changelog`                         |
| Compute the next version and tag it (the main release command)                 | `cog bump`                              |
| Install shared git hooks defined in `cog.toml`                                 | `cog install-hook`                      |
| Print the current version for scripts                                          | `cog get-version`                       |

Run `cog --help` or `cog <subcommand> --help` for the full flag list at any time — this skill covers the behavior and
config that aren't obvious from `--help` alone.

## Installation

```bash
cargo install cocogitto      # crates.io, works everywhere Rust does
pacman -S cocogitto          # Arch Linux
brew install cocogitto       # macOS
choco install cocogitto      # Windows
nix-env -iA nixos.cocogitto  # NixOS
xbps-install cocogitto       # Void Linux
```

A Docker image is published at `ghcr.io/cocogitto/latest`. Shell completions (bash/elvish/fish/zsh) are generated with
`cog generate-completions <shell>`.

## Repository setup

```bash
cog init                # new repo: git-inits, writes cog.toml, and creates "chore: initial commit"
cog init my_repo         # same, but at a target path
```

Run inside an existing repo, `cog init` just stages a template `cog.toml` without creating a commit — so it's safe to
run on a project with history already.

## Conventional commits (`cog commit`)

`cog commit` is a drop-in replacement for `git commit` that assembles a spec-compliant message for you instead of you
typing the `type(scope): description` syntax by hand:

```bash
# git commit -m "feat: implement the parser specification"
cog commit feat "implement the parser specification"
```

The general shape is `cog commit [FLAGS] <type> <message> [scope]` — note the scope comes _after_ the message, as a
positional argument, which is why it doesn't need its own flag. Built-in types are the two required by the spec plus the
Angular set: `feat`, `fix`, `build`, `ci`, `revert`, `docs`, `test`, `style`, `chore`, `perf`, `refactor`.

If a commit is malformed (e.g. a scope containing parentheses), `cog` refuses and prints a parser error pinpointing the
problem instead of writing a bad commit.

**Breaking changes** use the `-B` flag:

```bash
cog commit fix -B "fix a nasty bug" cli
# → fix(cli)!: fix a nasty bug
```

Cocogitto also recognizes the alternate `BREAKING CHANGE:` footer form if you write commits manually.

**Body and footers**: pass `-e` (or `--edit`) to open `$EDITOR` with a template for the body and footer instead of a
single-line message:

```bash
cog commit refactor -e -B "drop support for Node 6" runtime
```

Footers follow either `token: message` or `token #message` (the latter is what GitHub auto-links to issues, e.g. `Closes
#127`).

### Custom commit types

Add entries under `[commit_types]` in `cog.toml` to introduce new types, reorder them in the changelog, rename their
changelog section, or exclude them entirely:

```toml
[commit_types]
hotfix = { changelog_title = "Hotfixes" } # new type -> `cog commit hotfix ...`
release = { changelog_title = "Releases", order = 0 } # new type + custom sort order
feat = { order = 2 } # reorder an existing type
fix = { changelog_title = "🪲 Fixes", order = 1 } # rename an existing type's section
chore = { changelog_title = "", omit_from_changelog = true } # hide from changelog
perf = {} # empty config disables the type entirely
```

Default changelog order (when unset) is: `feat, fix, perf, revert, docs, test, build, ci, refactor, chore, style`.

### Merge commits

Git's default `Merge branch 'x'` messages aren't conventional-commit compliant. Either avoid them by setting `ff = only`
in `.gitconfig`, or tell cocogitto to ignore them:

```toml
ignore_merge_commits = true
```

## Checking and fixing history

- **`cog check`** — lints the whole history (or, with `-l`/`--from-latest-tag`, only commits since the last tag) and
  reports every non-compliant commit with a parser error, similar to what `cog commit` shows inline.
- **`cog verify "<message>"`** — a sandbox: validates an arbitrary string against the spec without creating any commit.
  Accepts `--file <path>` to read a message from a file, and `--file -` to read from stdin, which is handy in CI (`git
  log -1 --pretty=%B | cog verify --file -`).
- **`cog edit`** — interactively rewrites every non-compliant commit via an automatic rebase, opening `$EDITOR` for each
  one in turn. `-l`/`--from-latest-tag` restricts it to commits since the last tag. **This rewrites history and changes
  SHAs** for the edited commits and all of their descendants, so treat it like any rebase (don't run it on commits
  already pushed and shared, unless you're prepared to force-push).
- **`cog log`** — `git log` enriched with conventional-commit fields. Filter with `-B` (breaking changes only), `-t`
  (type), `-s` (scope), `-a` (author), `-e`/`--no-error` (skip non-compliant commits). Flags combine:

  ```bash
  cog log --author "Paul Delafosse" "Mike Lubinets" --type feat --scope cli --no-error
  ```

## Changelogs (`cog changelog`)

Running `cog changelog` with no arguments renders every semver tag's changes, most recent first, grouped by commit type
(and by scope within a type).

Scope the range with git-log-style syntax:

```bash
cog changelog --at 2.0.0        # changes for the tag 2.0.0 specifically
cog changelog 8806a5..1.0.0     # a custom range
cog changelog 8806a55..         # from a commit to HEAD
cog changelog ..1.0.0           # from the first commit to a tag
```

Three built-in templates, selected with `-t`/`--template`:

- **`default`** — plain markdown, no links. What you get with no `-t` flag.
- **`full_hash`** — full commit SHAs and `@username` authors; meant to be pasted straight into a GitHub Release body.
- **`remote`** — full markdown links to commits, tags, diffs and author profiles, for a specific hosting platform:

  ```bash
  cog changelog --at 0.1.0 -t remote --remote github.com --owner cocogitto --repository cocogitto
  ```

To avoid retyping `--remote`/`--owner`/`--repository`/`-t` every time, set defaults in `cog.toml` — this is also where
`full_hash`/`remote` learn to map git signatures to GitHub usernames for nicer attribution:

```toml
[changelog]
path = "CHANGELOG.md"
template = "remote"
remote = "github.com"
owner = "cocogitto"
repository = "cocogitto"
authors = [
  { signature = "Paul Delafosse", username = "oknozor" },
]
```

### Custom templates

Changelog rendering uses the [Tera](https://keats.github.io/tera/) template engine (Jinja2-like). Point `template` at a
`.tera` file path instead of a built-in name to fully control output. Cocogitto exposes reusable macros in a `macros`
module — import them with `{% import "macros" as macros %}` and call `macros::simple(commit=commit)`,
`macros::remote(commit=commit)`, or `macros::fullhash(commit=commit)` inside a `{% for %}` loop instead of
hand-formatting every line. See `references/changelog-templates.md` for a worked custom-template example, the macro
output formats, and the full context object exposed to templates (also documented at
https://docs.cocogitto.io/reference/template.html).

## Automatic versioning (`cog bump`)

This is cocogitto's headline feature: turn a history of typed commits into a semver bump, a changelog entry, a version
commit, and a tag — in one command. `cog bump` runs, in order: (1) compute the next version from commits since the last
tag, (2) run pre-bump hooks, (3) prepend the new section to `CHANGELOG.md`, (4) create a version commit with those
changes, (5) tag that commit, (6) run post-bump hooks.

### How the version is computed

Only three signal types move the version by default (configurable via `[commit_types]`, see below):

- `fix` → PATCH
- `feat` → MINOR
- a `!` after the type/scope, or a `BREAKING CHANGE:` footer, on _any_ commit type → MAJOR

```bash
cog bump --auto
```

```
Skipping irrelevant commits:
    - docs: 1
Found feature commit 8e08b7
Found bug fix commit 8bc0d2
Found feature commit a0c905
Bumped version: ... -> 0.1.0
```

Note the special-case for pre-1.0 projects: `--auto` will **never** bump you to `1.0.0` on its own, even in the presence
of breaking changes — that jump is treated as an intentional milestone, so it must be requested explicitly (`cog bump
--major` or `--version 1.0.0`).

If you'd rather not let cocogitto decide, be explicit:

```bash
cog bump --major                       # force a MAJOR bump
cog bump --minor                       # force a MINOR bump
cog bump --patch                       # force a PATCH bump
cog bump --version 3.2.1               # set the version outright
cog bump --pre "beta.*"                # set/increment a pre-release identifier
cog bump --build "foo.bar"             # set build metadata
cog bump --major --pre "beta.*" --build "foo.bar"
# 1.2.3 -> 2.0.0-beta.1+foo.bar
```

Add `--dry-run` to any of the above to print only the resulting version number to stdout without touching the repo —
useful for capturing it in a shell script:

```bash
VERSION=$(cog bump --dry-run --auto)
```

### Pre- and post-bump hooks

Hooks are shell command lists in `cog.toml`, run in the repo root, that can reference the version being computed through
a small template DSL: `{{version}}` and `{{latest}}` (optionally with a default via `{{version|0.0.0}}` in case no
version exists yet).

```toml
pre_bump_hooks = [
  "cargo build --release",
  "echo 'bumping from {{latest|0.0.0}} to {{version|0.0.1}}'",
  "cargo bump {{version|0.0.1}}",
]
post_bump_hooks = [
  "git push",
  "git push origin {{version}}",
  "cargo publish",
]
```

Pre-bump hooks run _before_ the version commit is created, so they're the place to update version strings in manifests
(`Cargo.toml`, `package.json`, `pom.xml`, ...) — the resulting file changes get folded into the version commit. If a
pre-bump hook fails, cocogitto aborts and stashes any changes made so far under `cog_bump_{{version}}` (recoverable with
`git stash apply`). Post-bump hooks run after the tag exists and are typically pushes/publishes — **there is no rollback
for a failed post-bump hook**, so keep them simple and idempotent where possible.

The version DSL used in hooks (and in `cog.toml` generally) supports more than a bare `{{version}}`:

- Keywords: `version`, `version_tag`, `latest`, `latest_tag`, `package` (in monorepos).
- Optional default: `{{version|1.0.0}}` (not valid with `package`).
- Optional arithmetic: `{{version+1minor}}` == `{{version+minor}}`, and increments can chain:
  `{{version+2major+1patch}}`.
- Optional trailing label: `{{version+minor-SNAPSHOT}}`.

This is commonly used to bump a _development-branch_ manifest to the next snapshot right after cutting a release:

```toml
post_bump_hooks = [
  "git push",
  "git push origin {{version|1.0.0}}",
  "git checkout develop",
  "git rebase master",
  "mvn versions:set -DnewVersion={{version|1.0.0+minor-SNAPSHOT}}",
  "cog commit chore \"bump snapshot to {{version|1.0.0+1minor-SNAPSHOT}}\"",
  "git push",
]
```

### Bump profiles

Different branches or release types (hotfix vs. normal release) often need different hooks. Define named profiles and
select one with `-H`/`--hook-profile`:

```toml
[bump_profiles.hotfix]
pre_bump_hooks = [
  """
    [[ "$(git rev-parse --abbrev-ref HEAD)" == "release/{{latest}}" ]] && echo "On branch release/{{latest}}" || exit 1
  """,
]
post_bump_hooks = []
```

```bash
cog bump -H hotfix --auto
```

### Restricting where bumps can happen

```toml
branch_whitelist = ["main", "release/**"]
```

`cog bump` refuses to run on any branch that doesn't match one of these glob patterns — a cheap guard against accidental
releases from feature branches.

For the full field-by-field `cog.toml` schema (every setting, its type, and its default), see
`references/config-reference.md`.

## Managing git hooks (`cog install-hook`)

Distinct from bump hooks, this feature lets a team share real git hooks (`commit-msg`, `pre-push`, etc.) through version
control instead of everyone installing them by hand. Define hooks inline or by file path in `cog.toml`:

```toml
[git_hooks.commit-msg]
script = """#!/bin/sh
set -e
cog verify --file $1
cog check
cargo fmt -v --all --check
cargo clippy
"""

[git_hooks.pre-push]
path = "hooks/pre-push.sh"
```

```bash
cog install-hook --all        # install every hook defined in cog.toml
cog install-hook commit-msg   # install just one
```

Valid hook names are the standard git hook set: `applypatch-msg`, `pre-applypatch`, `post-applypatch`, `pre-commit`,
`pre-merge-commit`, `pre-prepare-commit-msg`, `commit-msg`, `post-commit`, `pre-rebase`, `post-checkout`, `post-merge`,
`pre-push`, `pre-auto-gc`, `post-rewrite`, `sendemail-validate`, `fsmonitor-watchman`, `p4-changelist`,
`p4-prepare-changelist`, `p4-postchangelist`, `p4-pre-submit`, `post-index-change`.

## Monorepo support

For a repo with multiple independently-versioned packages, declare each one's path under `[packages]` (or the newer
`[monorepo.packages]` form alongside a dependency `resolver`):

```toml
[packages]
gill-app = { path = "crates/gill-app" }
gill-authorize = { path = "crates/gill-authorize-derive", public_api = false }
gill-db = { path = "crates/gill-db", public_api = false }
```

`public_api = false` excludes a package's changes from triggering the global monorepo version bump — useful for
internal-only crates.

With packages configured, `cog bump --auto` changes behavior:

1. Computes a next version _per package_ from commits touching that package's path.
2. Computes a _global_ monorepo version from the package bumps plus any commits outside all package paths.
3. Writes package changes to `{package_path}/CHANGELOG.md` and global changes to the root `CHANGELOG.md`.
4. Runs `pre_package_bump_hooks`/`post_package_bump_hooks` around each package bump (overridable per package), and root
   `pre_bump_hooks`/`post_bump_hooks` around the whole operation.
5. Tags each bumped package and creates one global monorepo tag.

```bash
cog bump --auto                          # bump every changed package + the global version
cog bump --package=my_package --auto     # bump a single package only
cog bump --minor --include-packages      # manual global bump that also cascades into packages
```

Manual bump flags (`--major`/`--minor`/`--patch`/`--version`) touch only the global version unless `--include-packages`
is passed — this exists mainly for cutting an initial `1.0.0`. Prefer `--auto` whenever possible; reach for manual bumps
only for changes cocogitto can't detect on its own (e.g. a breaking change introduced transitively through a dependency
bump).

**Dependency-aware ordering**: instead of specifying `bump_order` on every package by hand, cocogitto can infer bump
order from real package manifests:

```toml
[monorepo]
resolver = "Cargo" # or "Maven", "Npm"

[monorepo.packages]
my-package = { path = "packages/my-package" }
my-dependency = { path = "packages/my-dependency" }
```

The resolver reads `Cargo.toml`/`pom.xml`/`package.json` dependency graphs and topologically sorts packages so
dependencies are bumped (and thus have a real version to depend on) before their dependents. Manual `bump_order` still
works and is respected when no resolver is set, or as a tiebreaker.

Package-level hooks reference the current package by name via the `{{package}}` DSL keyword:

```toml
pre_package_bump_hooks = [
  "echo 'upgrading {{package}} to {{version}}'",
  "cargo set-version {{version}}",
]

[packages]
rust-package-one = { path = "packages/rust-one" }
java-package = { path = "packages/java-package", pre_bump_hooks = [
  "mvn build",
] } # per-package override
```

Changelogs come in three flavors in a monorepo: **package** changelogs (one package's changes, like a standard
changelog), **monorepo** changelogs (global changes only, from `cog bump`/`cog changelog`), and **unified** changelogs
(everything, via `cog changelog --unified`). Every built-in template (`default`/`full_hash`/`remote`) has variants for
all four modes automatically.

## Tag prefixes

Many projects tag releases as `v1.2.3` rather than `1.2.3`. Tell cocogitto so it parses and generates tags correctly:

```toml
tag_prefix = "v"
```

Once set, use `{{version_tag}}` (rather than `{{version}}`) in hooks when you need the prefixed form, e.g. `git push
origin {{version_tag}}`.

## Useful odds and ends

- **`cog get-version`** — prints the current (latest tag) version; add `-v` _before_ the subcommand for version-only
  output with no extra text, `--fallback <ver>` for repos with no tags yet, `--include-prereleases` to consider
  prerelease tags, `--tag` to print the full tag name (prefix included), and `--package <name>` for a specific monorepo
  package.
- **Skip CI on release commits** — `cog bump --skip-ci` (or `cog commit --skip-ci`) appends a skip-ci marker (default
  `[skip ci]`, override via `skip_ci = "..."` in `cog.toml` or `--skip-ci-override "<string>"` at the CLI, which wins
  over the config value) to the generated commit message, so most CI systems won't re-trigger on the bump commit itself.
- **Allow bumping with a dirty tree** — by default `cog bump` refuses to run with untracked/uncommitted changes. Set
  `skip_untracked = true` in `cog.toml`, or pass `--skip-untracked`, to downgrade this to a warning.
- **Skip creating the version commit** — `disable_bump_commit = true` (or `--disable-bump-commit`) makes `cog bump`
  create the tag(s) on the current HEAD instead of a new commit; anything a pre-bump hook changed on disk is then left
  uncommitted for you (e.g. via a post-bump hook) rather than folded automatically.
- **Non-default config location** — `cog --config /path/to/cog.toml <subcommand> ...` to point at a config file outside
  the repo root.

## CI/CD

**GitHub Action** (`cocogitto/cocogitto-action`, x86 Linux runners only) covers the two most common CI jobs:

```yaml
# 1. Just lint commit messages on every push
- uses: actions/checkout@main
  with: { fetch-depth: 0 } # full history is required — shallow clones break `cog check`
- uses: cocogitto/cocogitto-action@v3
  # add `with: { check-latest-tag-only: true }` to only check commits since the last tag
```

```yaml
# 2. Cut a release: runs `cog bump --auto` and exposes the new version
- uses: actions/checkout@v3
  with: { fetch-depth: 0 }
- name: Semver release
  id: release
  uses: cocogitto/cocogitto-action@v3
  with:
    release: true
    git-user: "Cog Bot"
    git-user-email: "mycoolproject@org.org"
- run: echo '${{ steps.release.outputs.version }}' # e.g. feed into a GitHub Release step
```

Action inputs: `check` (default `true`), `check-latest-tag-only` (default `false`), `release` (default `false`),
`git-user` (default `cog-bot`), `git-user-email` (default `cog@demo.org`).

For anything the action's `with:` options don't cover, call `cog` directly in a step — e.g. `cog changelog --at ${{
steps.release.outputs.version }} -t full_hash > GITHUB_CHANGELOG.md` to feed a GitHub Release body. A Docker image
(`ghcr.io/cocogitto/latest`) and a GitHub bot (`cocogitto-bot`, which posts compliance status checks on PRs) are also
available for non-Actions setups.

## Common bump-hook recipes

**Cargo library** (git-ignored `Cargo.lock`) — requires `cargo-edit`:

```toml
pre_bump_hooks = [
  "cargo build --release",
  "cargo set-version {{version}}",
]
post_bump_hooks = [
  "git push",
  "git push {{version}}",
]
```

**Cargo executable** (committed `Cargo.lock` — also stage the lockfile's version bump):

```toml
pre_bump_hooks = [
  "cargo build --release",
  "cargo set-version {{version}}",
  "cargo check --release",
  "git add :/Cargo.lock",
]
post_bump_hooks = [
  "git push",
  "git push {{version}}",
]
```

**Java Maven**:

```toml
pre_bump_hooks = [
  "mvn versions:set -DnewVersion={{version}}",
  "mvn clean package",
]
post_bump_hooks = [
  "mvn deploy", # optional, only if this phase is wired up in pom.xml
  "git push origin {{version}}",
  "git push",
]
```

## Reference files

- `references/config-reference.md` — every `cog.toml` field (`Settings`, `Changelog`, `CommitConfig`,
  `GitHook`/`GitHookType`, `MonoRepoPackage`, `MonorepoConfig`, `BumpProfile`, `AuthorSetting`), its type, and its
  default. Consult this whenever you need a setting not already shown inline above, or want to double check a default
  value.
- `references/changelog-templates.md` — a full worked custom Tera changelog template, the three built-in macros
  (`macros::simple`, `macros::remote`, `macros::fullhash`) with their exact output, and how to import/use them.

## Common pitfalls

- Forgetting `fetch-depth: 0` on `actions/checkout` — cocogitto needs full history to find the last tag and walk commits
  since it; a shallow clone makes `cog check`/`cog bump` behave as if there's no prior version.
- Expecting `--auto` to reach `1.0.0` on its own — it deliberately won't, even with breaking changes present, while the
  latest version is `0.y.z`. Bump to `1.0.0` explicitly when the project is ready.
- Running `cog edit` or `cog check` (without `-l`/`--from-latest-tag`) on a repo that only _recently_ adopted
  conventional commits — it will flag every pre-existing non-compliant commit all the way back to the initial commit.
  Scope to `--from-latest-tag` if older history isn't meant to be rewritten.
- Adding a new entry under `[commit_types]` and expecting it to affect version bumps automatically — a custom type
  doesn't bump anything unless it's `feat`/`fix`/marked breaking, _or_ the type config explicitly enables
  `bump_minor`/`bump_patch`.
- Treating `post_bump_hooks` failures as recoverable — unlike pre-bump hooks (which stash and can be restored), there's
  no rollback after the tag is created, so keep post-bump hooks simple, idempotent, and put anything risky in
  `pre_bump_hooks` instead where a failure is safe.
