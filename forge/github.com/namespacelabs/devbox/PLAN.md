# Recipe Plan: devbox

> **Skill reference:** [.apm/skills/forge-recipe/SKILL.md](../../../../.apm/skills/forge-recipe/SKILL.md)\
> **DSL reference:**
> [.apm/skills/forge-recipe/references/recipe-dsl-reference.md](../../../../.apm/skills/forge-recipe/references/recipe-dsl-reference.md)\
> **Examples:**
> [.apm/skills/forge-recipe/references/recipe-examples.md](../../../../.apm/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                                                   |
| ----------- | ----------------------------------------------------------------------- |
| Name        | `devbox`                                                                |
| Upstream    | `https://github.com/namespacelabs/devbox`                               |
| Description | CLI for creating & managing Namespace devboxes (remote development VMs) |
| License     | `LicenseRef-Proprietary` (upstream repo has no LICENSE file, see below) |
| Homepage    | `https://namespace.so`                                                  |

## Version Source

- **Method:** GitHub tags
- **Tag format:** `v0.0.213` (asset names use the version without the `v`)
- **Filter:** none needed (no pre-release tags seen)
- **Owner/Repo:** `namespacelabs` / `devbox`

## Source Assets

- **Release page:** https://github.com/namespacelabs/devbox/releases
- **Asset naming pattern:** `devbox_{version}_{os}_{arch}.tar.gz` (unix) / `devbox_{version}_{os}_{arch}.zip` (windows)
- **Archive format:** `.tar.gz` on linux/macOS, `.zip` on windows. Each archive contains a single file: `devbox` /
  `devbox.exe`
- **Checksum strategy:** single `checksums.txt` (`<sha256>  <filename>` lines); GitHub asset digests are used first
- **Gotcha:** every release also publishes the _bare_ binaries (`devbox_{version}_linux_amd64`,
  `devbox_{version}_windows_amd64.exe`) next to the archives, so `fileName` is required to select only the archives.

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

1. Archives are auto-extracted by rattler-build into `$SRC_DIR/<asset name>/`.
2. Move `./devbox_*/devbox*` (the only file in each archive) to `$PREFIX/bin/devbox` (`devbox.exe` on Windows).
3. `chmod 755` on Unix.

## Runtime Dependencies

None.

## Test Strategy

- **Command:** `devbox version` (the CLI has **no** `--version` flag, `devbox --version` errors with `unknown flag`)
- **Expected output:** bare version, eg: `0.0.213`
- **Validation:** `r.coerceSemVer(output) === pkgVersion`

## Verification Steps

```bash
task generate RECIPE=forge/github.com/namespacelabs/devbox/recipe.ts
ls forge/github.com/namespacelabs/devbox/generated/
task dryrun RECIPE=forge/github.com/namespacelabs/devbox/recipe.ts
```

### Expected outcomes

- `task generate` completes and produces YAML for all 6 platforms in `generated/`
- `task dryrun` builds and passes the test on the current platform

## Open Questions

- **License:** the repo contains only a README (`# devbox`), no LICENSE. Proposed: `LicenseRef-Proprietary` (same as
  `ngrok`). Confirm or supply another identifier.
- **Description:** the upstream README is empty, so `about.description` will be a short hand-written paragraph instead
  of a fetched README.
