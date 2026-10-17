# cog.toml — full configuration reference

Source: https://docs.cocogitto.io/reference/config.html. All fields are optional unless noted; cocogitto falls back to
sensible defaults for anything unset.

## Top-level `Settings`

| Field                                   | Type                                | Default               | Notes                                                                                                                                     |
| --------------------------------------- | ----------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `branch_whitelist`                      | `Array<String>`                     | `[]` (no restriction) | Glob patterns; `cog bump` only runs on a matching branch.                                                                                 |
| `bump_profiles`                         | `Map<String, BumpProfile>`          | `{}`                  | Named alternate hook sets, selected with `cog bump -H <name>`.                                                                            |
| `changelog`                             | [`Changelog`](#changelog)           | see below             | Changelog generation settings.                                                                                                            |
| `commit_types`                          | `Map<String, CommitConfig>`         | `{}`                  | Add/override/disable commit types.                                                                                                        |
| `disable_bump_commit`                   | `Boolean`                           | `false`               | If `true`, `cog bump` tags HEAD instead of creating a version commit.                                                                     |
| `disable_changelog`                     | `Boolean`                           | `false`               | If `true`, `cog bump` won't touch `CHANGELOG.md`.                                                                                         |
| `from_latest_tag`                       | `Boolean`                           | `false`               | If `true`, commands consider only commits since the latest SemVer tag by default (equivalent to always passing `--from-latest-tag`/`-l`). |
| `generate_mono_repository_global_tag`   | `Boolean`                           | `true`                | Monorepo: whether to create the global tag on bump.                                                                                       |
| `generate_mono_repository_package_tags` | `Boolean`                           | `true`                | Monorepo: whether to create per-package tags on bump.                                                                                     |
| `git_hooks`                             | `Map<GitHookType, GitHook>`         | `{}`                  | Shared git hooks installed via `cog install-hook`.                                                                                        |
| `ignore_fixup_commits`                  | `Boolean`                           | `false`               | Silently ignore `fixup!`-style commits when checking/bumping.                                                                             |
| `ignore_merge_commits`                  | `Boolean`                           | `false`               | Silently ignore merge commits when checking/bumping.                                                                                      |
| `monorepo`                              | [`MonorepoConfig`](#monorepoconfig) | —                     | Newer-style monorepo config: packages + a dependency `resolver`.                                                                          |
| `monorepo_version_separator`            | `String \| Null`                    | —                     | Character(s) separating package name from version in per-package tags.                                                                    |
| `post_bump_hooks`                       | `Array<String>`                     | `[]`                  | Root-level hooks run after a bump.                                                                                                        |
| `post_package_bump_hooks`               | `Array<String>`                     | `[]`                  | Default post-bump hooks applied to every monorepo package (overridable per package).                                                      |
| `pre`                                   | `String`                            | `"alpha.*"`           | Default pre-release pattern for auto-incrementing pre-release versions; must contain exactly one `*` wildcard.                            |
| `pre_bump_hooks`                        | `Array<String>`                     | `[]`                  | Root-level hooks run before a bump.                                                                                                       |
| `pre_package_bump_hooks`                | `Array<String>`                     | `[]`                  | Default pre-bump hooks applied to every monorepo package (overridable per package).                                                       |
| `scopes`                                | `Array<String> \| Null`             | —                     | If set, restricts valid commit scopes to this list.                                                                                       |
| `skip_ci`                               | `String`                            | `"[skip ci]"`         | String appended to bump/commit messages when `--skip-ci` is used.                                                                         |
| `skip_untracked`                        | `Boolean`                           | `false`               | If `true`, allow bumping with a dirty working tree (prints a warning instead of aborting).                                                |
| `tag_prefix`                            | `String \| Null`                    | —                     | e.g. `"v"` — cocogitto will only recognize/generate tags with this prefix.                                                                |

Minimal example combining several of these:

```toml
from_latest_tag = true
ignore_merge_commits = true

[changelog]
path = "CHANGELOG.md"
template = "remote"

[git_hooks.pre-commit]
script = "./scripts/pre-commit.sh"

[packages.my-package]
path = "packages/my-package"
```

## `Changelog`

Nested under `[changelog]`.

| Field              | Type                   | Default          | Notes                                                                       |
| ------------------ | ---------------------- | ---------------- | --------------------------------------------------------------------------- |
| `authors`          | `Array<AuthorSetting>` | `[]`             | Maps commit signatures to usernames for the `full_hash`/`remote` templates. |
| `owner`            | `String \| Null`       | —                | Repo owner/org, used by the `remote` template.                              |
| `package_template` | `String \| Null`       | —                | Template to use specifically for per-package changelogs in a monorepo.      |
| `path`             | `String`               | `"CHANGELOG.md"` | Where the changelog is written.                                             |
| `remote`           | `String \| Null`       | —                | Host, e.g. `"github.com"`, used by the `remote` template.                   |
| `repository`       | `String \| Null`       | —                | Repo name, used by the `remote` template.                                   |
| `template`         | `String \| Null`       | —                | `"remote"`, `"full_hash"`, or a path to a custom `.tera` template.          |

```toml
[changelog]
template = "remote"
path = "CHANGELOG.md"
remote = "github.com"
owner = "cocogitto"
repository = "cocogitto"
```

### `AuthorSetting`

```toml
[[changelog.authors]]
signature = "user@example.com" # required — the git commit signature
username = "githubuser" # required — display name/handle in changelogs
```

## `CommitConfig`

Nested under `[commit_types.<name>]`. Used both to add brand-new commit types and to override the built-in ones.

| Field                 | Type              | Notes                                                                    |
| --------------------- | ----------------- | ------------------------------------------------------------------------ |
| `bump_minor`          | `Boolean \| Null` | Let this type trigger a MINOR bump (built-in default: only `feat` does). |
| `bump_patch`          | `Boolean \| Null` | Let this type trigger a PATCH bump (built-in default: only `fix` does).  |
| `changelog_title`     | `String \| Null`  | Section heading used in generated changelogs.                            |
| `omit_from_changelog` | `Boolean \| Null` | Hide commits of this type from changelogs entirely.                      |
| `order`               | `Integer \| Null` | Sort position among changelog sections.                                  |

An empty table (`perf = {}`) disables a built-in type. See the main SKILL.md's "Custom commit types" section for worked
examples.

## `GitHook` / `GitHookType`

Nested under `[git_hooks.<hook-name>]`. A hook is either an inline `script` string or a `path` to a script file — pick
one:

```toml
[git_hooks.pre-commit]
script = "./scripts/pre-commit.sh"

[git_hooks.commit-msg]
script = """#!/bin/sh
cog verify --file $1
"""

[git_hooks.pre-push]
path = "hooks/pre-push.sh"
```

`<hook-name>` must be one of the standard git hook names: `applypatch-msg`, `pre-applypatch`, `post-applypatch`,
`pre-commit`, `pre-merge-commit`, `pre-prepare-commit-msg`, `commit-msg`, `post-commit`, `pre-rebase`, `post-checkout`,
`post-merge`, `pre-push`, `pre-auto-gc`, `post-rewrite`, `sendemail-validate`, `fsmonitor-watchman`, `p4-changelist`,
`p4-prepare-changelist`, `p4-postchangelist`, `p4-pre-submit`, `post-index-change`.

Install with `cog install-hook --all` or `cog install-hook <hook-name>`.

## `BumpProfile`

Nested under `[bump_profiles.<name>]`. Overrides the root `pre_bump_hooks`/`post_bump_hooks` when selected via `cog bump
-H <name>`.

```toml
[bump_profiles.production]
pre_bump_hooks = ["./scripts/pre-release.sh"]
post_bump_hooks = ["./scripts/post-release.sh"]
```

| Field             | Type            | Default |
| ----------------- | --------------- | ------- |
| `pre_bump_hooks`  | `Array<String>` | `[]`    |
| `post_bump_hooks` | `Array<String>` | `[]`    |

## `MonoRepoPackage`

Nested under `[packages.<name>]` (legacy form) or `[monorepo.packages.<name>]` (newer form alongside a `resolver`).

| Field             | Type                       | Default | Notes                                                                                                                          |
| ----------------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `path`            | `String`                   | `""`    | Package path relative to repo root; used both to scan commits touching the package and as the cwd for its hooks.               |
| `bump_order`      | `Integer \| Null`          | —       | Manual bump ordering when no dependency `resolver` is set (lower = bumped first; unset packages go first).                     |
| `bump_profiles`   | `Map<String, BumpProfile>` | `{}`    | Per-package bump profiles.                                                                                                     |
| `changelog_path`  | `String \| Null`           | —       | Override where this package's changelog is written.                                                                            |
| `ignore`          | `Array<String>`            | `[]`    | Glob patterns (relative to repo root) to exclude from this package's commit scanning.                                          |
| `include`         | `Array<String>`            | `[]`    | Extra glob patterns (relative to repo root) to include in this package's commit scanning.                                      |
| `post_bump_hooks` | `Array<String> \| Null`    | —       | Overrides the global `post_package_bump_hooks` for this package.                                                               |
| `pre_bump_hooks`  | `Array<String> \| Null`    | —       | Overrides the global `pre_package_bump_hooks` for this package.                                                                |
| `public_api`      | `Boolean`                  | `true`  | If `true`, bumping this package also bumps the global monorepo version under `--auto`. Set `false` for internal-only packages. |

```toml
[packages.my-package]
path = "packages/my-package"
include = ["packages/my-package/**"]
ignore = ["**/test/**"]
changelog_path = "CHANGELOG.md"
public_api = true
bump_order = 1
```

## `MonorepoConfig`

Nested under `[monorepo]` — the newer alternative to top-level `[packages]` that adds dependency-aware bump ordering.

| Field      | Type                           | Default | Notes                                                                                                                                                                                                                |
| ---------- | ------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages` | `Map<String, MonoRepoPackage>` | `{}`    | Same package schema as top-level `[packages]`.                                                                                                                                                                       |
| `resolver` | `String \| Null`               | —       | `"Cargo"`, `"Maven"`, or `"Npm"` — reads that ecosystem's manifest files to topologically sort package bump order by real dependency relationships. Takes precedence over manual `bump_order` when both are present. |

```toml
[monorepo]
resolver = "Cargo"

[monorepo.packages.my-package]
path = "packages/my-package"
```
