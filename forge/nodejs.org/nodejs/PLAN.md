# Recipe Plan: nodejs

> **Skill reference:** [forge-recipe skill](../../../.apm/skills/forge-recipe/SKILL.md)

## Package Summary

| Field    | Value                                                          |
| -------- | -------------------------------------------------------------- |
| Name     | `nodejs` (same name as conda-forge, so brads-forge shadows it) |
| Upstream | <https://nodejs.org/>                                          |
| About    | Node.js is an open-source, cross-platform JavaScript runtime   |
| License  | `MIT`                                                          |

## Version Source

`https://nodejs.org/dist/index.json` — a JSON array of every release, newest first, each with `version` (`v26.12.0`) and
a `files` list of the platform builds that exist for it.

We only package the **Current** release, which is simply the highest version in the index (LTS status is ignored). The
recipe sorts by semver rather than relying on the index ordering.

## Source Assets

Everything is downloaded directly from `https://nodejs.org/dist/<version>/`, nothing comes from GitHub.

| Platform        | `index.json` key | Archive                              |
| --------------- | ---------------- | ------------------------------------ |
| `linux-64`      | `linux-x64`      | `node-<version>-linux-x64.tar.xz`    |
| `linux-aarch64` | `linux-arm64`    | `node-<version>-linux-arm64.tar.xz`  |
| `osx-64`        | `osx-x64-tar`    | `node-<version>-darwin-x64.tar.xz`   |
| `osx-arm64`     | `osx-arm64-tar`  | `node-<version>-darwin-arm64.tar.xz` |
| `win-64`        | `win-x64-zip`    | `node-<version>-win-x64.zip`         |
| `win-arm64`     | `win-arm64-zip`  | `node-<version>-win-arm64.zip`       |

Checksums come from `https://nodejs.org/dist/<version>/SHASUMS256.txt`. A platform is skipped if its key is absent from
the release's `files` list.

## Build Steps

Each archive is extracted into `./node` (rattler-build strips the single top-level directory). The contents already
mirror a conda prefix, so every entry is moved straight into `$PREFIX`, except the upstream `CHANGELOG.md`, `LICENSE`
and `README.md`:

- unix: `bin/` (`node`, `npm`, `npx`, `corepack`), `lib/node_modules`, `include/`, `share/`
- windows: `node.exe`, `npm.cmd`, `npx.cmd`, `node_modules/` etc. at the prefix root, which pixi puts on `PATH`

`overlinking_behavior` is `ignore` because the upstream Linux binary links against system `libc`, `libstdc++` and
`libatomic`.

## Test Strategy

`node --version` must match the package version. On unix `npm --version` must also print something, proving the
`bin/npm` symlink into `lib/node_modules` survived packaging.

## Verification Steps

```bash
task generate RECIPE=forge/nodejs.org/nodejs/recipe.ts
task dryrun RECIPE=forge/nodejs.org/nodejs/recipe.ts
```
