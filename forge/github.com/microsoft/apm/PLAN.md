# Build Plan: microsoft/apm

> Reference: `xcaf/skills/forge-recipe/forge-recipe.xcaf` for general guidance on the recipe DSL and available library
> helpers (`lib/mod.ts`).

## Package Summary

- **Name:** `apm`
- **Upstream:** https://github.com/microsoft/apm
- **Homepage:** https://microsoft.github.io/apm/
- **License:** MIT
- **Package type:** noarch Python package

## Rationale

Upstream's Linux PyInstaller bundle embeds a CPython runtime built on Ubuntu 24.04. Its `libpython3.12.so.1.0` requires
glibc 2.38, so the package fails before startup on older supported hosts such as the glibc 2.28 GitHub Copilot runner.

Package the standard Python distribution instead. This delegates native compatibility to conda-forge's Python and
dependency packages, whose virtual-package requirements are visible to the solver. The APM package itself contains no
ELF files and therefore needs no glibc constraint.

## Source

Use the immutable source archive for the selected release tag and calculate its SHA-256 during recipe generation:

```typescript
const url = `https://github.com/${owner}/${repo}/archive/refs/tags/${tag}.tar.gz`;
return { url, sha256: await r.digestFromUrl(url), target_directory: "source" };
```

## Build

Install upstream's package without resolving PyPI dependencies, because all runtime dependencies are declared through
conda:

```yaml
build:
  noarch: python
  script: python -m pip install ./source --no-deps --no-build-isolation
```

No `--prefix` is passed. `python` here comes from the host requirements and already points at `$PREFIX`, so pip installs
to the right place; spelling the prefix out would need `$PREFIX` on unix and `%PREFIX%` on Windows, and this recipe is
built on both.

Pip creates the `apm = apm_cli.cli:main` console entry point. Rattler relocates it into the noarch `python-scripts`
layout and installs it appropriately for each target platform.

## Requirements

Requirements are derived from the tagged `pyproject.toml` by `r.pyprojectRequirements()` (see
`lib/requirements/pyproject.ts`) rather than transcribed into the recipe, so the dependency list tracks upstream instead
of rotting between releases:

- `host` is `python`, `pip` and `[build-system].requires` (`setuptools >=42`, `wheel`).
- `run` is `python` and `[project].dependencies`, with PyPI names lowercased into their conda-forge equivalents.
- Environment markers are evaluated, so `tomli` — which upstream gates behind `python_version < '3.11'` — is correctly
  dropped.

Two things the derivation cannot know are declared explicitly on the recipe:

- `python: ">=3.11"` overrides upstream's `requires-python`. v0.29.0's metadata advertises Python 3.10, but the code
  imports `typing.Self`, which only lands in the stdlib at 3.11.
- `extraRun: ["git"]` adds the Git executable. It is not a Python dependency, so it can never appear in
  `pyproject.toml`, but APM initialises GitPython and performs Git-backed package resolution.

The noarch artifact intentionally contains only APM's Python source, distribution metadata, and console entry point.
Platform-specific dependencies such as PyYAML, watchdog, and websockets are selected by the solver for the environment's
platform and Python version.

## Supported Platforms

```typescript
platforms: ["linux-64", "linux-aarch64", "win-64", "osx-64", "osx-arm64"];
```

One noarch artifact serves all of them, but the recipe is still built and tested on each, so a platform-specific
packaging bug cannot slip through. The list is explicit because `Recipe.getPlatforms()` can only infer platforms from
platform-mapped sources, and this recipe has a single source archive.

## Forge Support

Noarch artifacts are written to `output/noarch`, regardless of the concrete build runner. The forge's publication path
and Prefix variant lookup therefore use the recipe's package platform (`noarch`) rather than its build platform.

Because a noarch package is published once but tested everywhere, it runs through its own CI pipeline in
`.github/workflows/main.yaml`, parallel to the per-arch build matrix:

- `test-noarch` builds and tests the recipe on linux-64, linux-aarch64, win-64, osx-64 and osx-arm64, with
  `--no-upload`.
- `publish-noarch` runs once all of those pass, and builds and publishes the single artifact. It names no target
  platform, because a noarch package is the same artifact whichever platform builds it.

`scripts/build.ts --package-kind <arch|noarch|all>` selects which recipes a pipeline owns, so the two pipelines never
publish the same package.

## Verification

```bash
task generate RECIPE=forge/github.com/microsoft/apm/recipe.ts
task dryrun RECIPE=forge/github.com/microsoft/apm/recipe.ts
```

The package tests run `apm --version` and import the console entry point in separate Python 3.11 and Python 3.14
environments. The v0.29.0 dry-run produced `output/noarch/apm-0.29.0-pyh4616a5c_1.conda`, passed both test environments,
and contained zero ELF files.
