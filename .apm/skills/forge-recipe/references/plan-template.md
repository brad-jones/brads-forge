# Plan Template

Use this template when writing a `PLAN.md` for a new forge recipe. Copy and fill in all sections. The plan must be
self-contained — assume the reader (which may be a different LLM) has no prior context beyond what's in this document
and the linked skill reference.

**IMPORTANT:** Ensure the skill reference links actually work and point to the correct files based on where you save the
PLAN.md file. Always link to the source of truth under `.apm/skills/forge-recipe/`, never to `.agents/` (or any other
generated harness directory such as `.claude/`), because those are git ignored build output and the links would be
broken for anyone viewing the plan on GitHub. Links are relative to the PLAN.md, so use `../` segments to climb to the
repo root (eg: `forge/github.com/<owner>/<repo>/PLAN.md` needs `../../../../.apm/...`, one more `../` when the extra
package-name level is used).

---

````markdown
# Recipe Plan: <package-name>

> **Skill reference:** [.apm/skills/forge-recipe/SKILL.md](.apm/skills/forge-recipe/SKILL.md)\
> **DSL reference:**
> [.apm/skills/forge-recipe/references/recipe-dsl-reference.md](.apm/skills/forge-recipe/references/recipe-dsl-reference.md)\
> **Examples:**
> [.apm/skills/forge-recipe/references/recipe-examples.md](.apm/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value              |
| ----------- | ------------------ |
| Name        | `<package-name>`   |
| Upstream    | `<url>`            |
| Description | <one-line summary> |
| License     | `<SPDX-ID>`        |
| Homepage    | `<url>`            |

## Version Source

- **Method:** <GitHub tags / GitLab tags / custom API / scraping>
- **Tag format:** <e.g. `v1.2.3`, `release-1.2.3`>
- **Filter:** <regex or description of filtering logic, or "none needed">
- **Owner/Repo:** <if GitHub/GitLab>

## Source Assets

- **Release page:** <url>
- **Asset naming pattern:** <e.g. `tool_v{version}_{os}_{arch}.tar.gz`>
- **Archive format:** <.tar.gz / .zip / .gz (single file) / platform-dependent>
- **Checksum strategy:** <per-file .sha256 / checksums.txt / computed from download / GitHub digest>

### OS Mapping

| Pixi OS | Asset string |
| ------- | ------------ |
| `linux` | `<linux>`    |
| `osx`   | `<darwin>`   |
| `win`   | `<windows>`  |

### Arch Mapping

| Pixi Arch           | Asset string |
| ------------------- | ------------ |
| `64`                | `<amd64>`    |
| `arm64` / `aarch64` | `<arm64>`    |

### Supported Platforms

- [ ] linux-64
- [ ] linux-aarch64
- [ ] osx-64
- [ ] osx-arm64
- [ ] win-64
- [ ] win-arm64

## Build Steps

1. <Step 1: e.g. "Extract archive — binary is at `./<name>_v*/<name>`">
2. <Step 2: e.g. "Move binary to `$PREFIX/bin/<name>`">
3. <Step 3: e.g. "chmod 755 on Unix">
4. <Any additional steps: env vars, PATH modifications, symlinks>

> **Note:** If the archive format is plain `.gz` (single gzipped binary, NOT `.tar.gz`), rattler-build does NOT
> auto-extract it. Use `r.archive.gunzipFile()` instead of `r.moveGlob()` in the build function.

## Runtime Dependencies

- <List any tools required at runtime, e.g. `tmux`, `git`>
- <Check availability on conda-forge: https://prefix.dev/channels/conda-forge/packages/<dep>>
- <If none, write "None">

## Test Strategy

- **Command:** `<binary> --version`
- **Expected output format:** <e.g. "`tool 1.2.3`" — extract with split/coerce>
- **Validation:** Compare `r.coerceSemVer(output)` against `pkgVersion`
- **Platform-specific tests:** <any Windows/Unix-specific checks>

## Verification Steps

After writing the recipe to `<recipe-dir>/recipe.ts`, run:

```bash
# Generate rattler build recipes for all platforms (no build, no upload)
task generate RECIPE=<recipe-dir>/recipe.ts

# Check generated output
ls <recipe-dir>/generated/

# Build and test locally (current platform only, no upload)
task dryrun RECIPE=<recipe-dir>/recipe.ts
```

### Expected outcomes

- `task generate` should complete without errors and produce YAML files in `generated/`
- `task dryrun` should build and pass tests on the current platform
- If either fails, diagnose the error and update the recipe accordingly

## Open Questions

- <List any unresolved questions or assumptions that need user confirmation>

```
```
````
