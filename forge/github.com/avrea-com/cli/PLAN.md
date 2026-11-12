# Recipe Plan: avr

> **Skill reference:** [.apm/skills/forge-recipe/SKILL.md](../../../../.apm/skills/forge-recipe/SKILL.md)\
> **DSL reference:**
> [.apm/skills/forge-recipe/references/recipe-dsl-reference.md](../../../../.apm/skills/forge-recipe/references/recipe-dsl-reference.md)\
> **Examples:**
> [.apm/skills/forge-recipe/references/recipe-examples.md](../../../../.apm/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                            |
| ----------- | -------------------------------- |
| Name        | `avr`                            |
| Upstream    | https://github.com/avrea-com/cli |
| Description | Official CLI for Avrea           |
| License     | `Apache-2.0`                     |
| Homepage    | https://avrea.com                |

## Version Source

- **Method:** GitHub tags
- **Tag format:** `v0.8.0`
- **Filter:** none needed
- **Owner/Repo:** `avrea-com/cli`

## Source Assets

- **Release page:** https://github.com/avrea-com/cli/releases
- **Asset naming pattern:** `avr_{version}_{os}_{arch}.tar.gz` (`.zip` on Windows)
- **Archive format:** `.tar.gz` / `.zip`, top-level dir `avr_{version}_{os}_{arch}/`
- **Checksum strategy:** per-file `.sha256` (`<hash>  <filename>`, default parsing)

### OS Mapping

| Pixi OS | Asset string |
| ------- | ------------ |
| `linux` | `linux`      |
| `osx`   | `darwin`     |
| `win`   | `windows`    |

### Arch Mapping

| Pixi Arch | Asset string |
| --------- | ------------ |
| `64`      | `amd64`      |
| `arm64`   | `arm64`      |

### Supported Platforms

- [x] linux-64
- [x] linux-aarch64
- [ ] osx-64 (not published)
- [x] osx-arm64
- [x] win-64
- [ ] win-arm64 (not published)

## Build Steps

1. Binary is at `./avr_*/avr` (`avr.exe` on Windows).
2. Move it to `$PREFIX/bin/avr`, chmod 755 on Unix.

## Runtime Dependencies

None

## Test Strategy

- **Command:** `avr --version` → `avr version 0.8.0+f9e1a1a0ba12`
- **Validation:** `r.coerceSemVer` on the output must equal `pkgVersion` (build metadata stripped; verified in dryrun)

## Verification Steps

```bash
task generate RECIPE=forge/github.com/avrea-com/cli/recipe.ts
task dryrun RECIPE=forge/github.com/avrea-com/cli/recipe.ts
```

## Open Questions

- Shell completions and man pages are shipped in the archive but skipped for now.
