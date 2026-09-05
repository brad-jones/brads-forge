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

Build once on Linux with Python 3.12, pip, setuptools, and wheel. Install upstream's package without resolving PyPI
dependencies because all runtime dependencies are declared through conda:

```yaml
build:
  noarch: python
  script: python -m pip install ./source --no-deps --no-build-isolation --prefix $PREFIX
```

Pip creates the `apm = apm_cli.cli:main` console entry point. Rattler relocates it into the noarch `python-scripts`
layout and installs it appropriately for each target platform.

## Runtime Dependencies

Mirror the direct dependencies from upstream's `pyproject.toml` using conda-forge package names and include the `git`
executable required by APM's GitPython-backed package resolver. The package declares Python 3.11 or newer: although
v0.29.0's upstream metadata says Python 3.10, the code imports `typing.Self`, which is only available in the standard
library from Python 3.11.

The noarch artifact intentionally contains only APM's Python source, distribution metadata, and console entry point.
Platform-specific dependencies such as PyYAML, watchdog, and websockets are selected by the solver for the environment's
platform and Python version.

## Forge Support

Noarch artifacts are written to `output/noarch`, regardless of the concrete build runner. The forge's publication path
and Prefix variant lookup therefore use the recipe's package platform (`noarch`) rather than its build platform
(`linux-64`). The recipe declares only `linux-64` as a builder so the matrix publishes the package once.

## Verification

```bash
task dryrun RECIPE=forge/github.com/microsoft/apm/recipe.ts
```

The package tests run `apm --version` and import the console entry point in separate Python 3.11 and Python 3.14
environments. The v0.29.0 dry-run produced `output/noarch/apm-0.29.0-pyh4616a5c_1.conda`, passed both test environments,
and contained zero ELF files.
