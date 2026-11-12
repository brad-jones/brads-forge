# Recipe Plan: nsc

> **Skill reference:** [.apm/skills/forge-recipe/SKILL.md](../../../../../.apm/skills/forge-recipe/SKILL.md)\
> **DSL reference:**
> [.apm/skills/forge-recipe/references/recipe-dsl-reference.md](../../../../../.apm/skills/forge-recipe/references/recipe-dsl-reference.md)\
> **Examples:**
> [.apm/skills/forge-recipe/references/recipe-examples.md](../../../../../.apm/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| Name        | `nsc`                                                                              |
| Upstream    | `https://github.com/namespacelabs/foundation`                                      |
| Description | The Namespace Cloud CLI (`nsc`), used to manage Namespace compute, builders & more |
| License     | `Apache-2.0`                                                                       |
| Homepage    | `https://namespace.so/docs`                                                        |

The `foundation` repo releases two independent CLIs: `nsc` (this recipe) and `ns` (not packaged yet). Recipes live one
level below the repo directory so `ns` can be added later as a sibling without moving anything:

```
forge/github.com/namespacelabs/foundation/nsc/recipe.ts   <- this plan
forge/github.com/namespacelabs/foundation/ns/recipe.ts    <- future
```

## Version Source

- **Method:** GitHub tags
- **Tag format:** `v0.0.595` (asset names use the version without the `v`)
- **Filter:** none needed (no pre-release tags seen)
- **Owner/Repo:** `namespacelabs` / `foundation`

## Source Assets

- **Release page:** https://github.com/namespacelabs/foundation/releases
- **Asset naming pattern:** `nsc_{version}_{os}_{arch}.tar.gz` (unix) / `nsc_{version}_{os}_{arch}.zip` (windows)
- **Archive format:** `.tar.gz` on linux/macOS, `.zip` on windows. Archives are flat (no top-level directory) and
  contain `nsc`, `docker-credential-nsc`, `bazel-credential-nsc`, `LICENSE` & `README.md` (`.exe` suffix on windows).
- **Checksum strategy:** GitHub's per-asset `digest` field, with the release-wide `checksums.txt` as fallback.
- **Gotcha:** the same release also contains `ns_*` archives, so `fileName` must be set to select only `nsc_*`.
  Otherwise both would be matched to the same platform.

### OS Mapping

| Pixi OS | Asset string |
| ------- | ------------ |
| `linux` | `linux`      |
| `osx`   | `darwin`     |
| `win`   | `windows`    |

### Arch Mapping

| Pixi Arch           | Asset string |
| ------------------- | ------------ |
| `64`                | `amd64`      |
| `arm64` / `aarch64` | `arm64`      |

### Supported Platforms

- [x] linux-64
- [x] linux-aarch64
- [x] osx-64
- [x] osx-arm64
- [x] win-64
- [x] win-arm64

## Build Steps

Archives are flat, so extracted files sit directly in `$SRC_DIR/<asset name>/` (rattler-build `target_directory`).

1. Move each binary by explicit name (a `nsc*` glob would match the helpers too): `nsc`, `docker-credential-nsc`,
   `bazel-credential-nsc` from `./nsc_*/<name>{.exe}` to `$PREFIX/bin/<name>{.exe}`.
2. `chmod 755` each on Unix.

The two `*-credential-nsc` helpers are included because Docker and Bazel discover credential helpers by name on `PATH`;
`nsc` configures them (eg: `nsc docker login`) and expects them to sit next to it.

## Runtime Dependencies

None.

## Test Strategy

- **Command:** `nsc version` (there is no `--version` flag)
- **Expected output:** multi-line, first line `version v0.0.595 (commit <sha>)`
- **Validation:** `r.coerceSemVer(output)` equals `pkgVersion`. If `coerceSemVer` can't cope with the multi-line output,
  match only the first line.
- **Invocation:** via `` r.$`${exe("nsc")} version` `` so Windows resolves `nsc.exe`.

## Verification Steps

```bash
task generate RECIPE=forge/github.com/namespacelabs/foundation/nsc/recipe.ts
ls forge/github.com/namespacelabs/foundation/nsc/generated/
task dryrun RECIPE=forge/github.com/namespacelabs/foundation/nsc/recipe.ts
```

### Expected outcomes

- `task generate` completes and emits YAML for all 6 platforms in `generated/`
- `task dryrun` builds and passes the test on the current platform
- On failure, diagnose and update the recipe

## Open Questions

1. **Bundle the credential helpers?** Plan says yes (`docker-credential-nsc`, `bazel-credential-nsc` ship in `bin/`).
   Say so if you want `nsc` only.
2. **`about.description`:** upstream's root README documents the whole foundation platform, not `nsc`, so the plan uses
   a short static description (same approach as the `devbox` recipe). Prefer the archive's README or the root README
   instead?
