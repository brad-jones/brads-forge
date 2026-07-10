# brads-forge

> For information on the technical environment of the repo, see: `xcaf/contexts/workspace-context/context.xcaf`\
> To understand the nature & purpose of this repo, read on...

A personal [conda channel](https://prefix.dev/channels/brads-forge) that packages developer tools as conda packages for
use with [pixi](https://pixi.sh).

## Why?

Tools like `deno`, `bun`, `task`, `dprint`, `lefthook`, `jira-cli`, `aws-vault`, and many others ship as standalone
binaries on GitHub. Installing them usually means curl-piping shell scripts, managing version mismatches across
machines, or waiting weeks for [conda-forge](https://conda-forge.org/) to catch up with upstream releases.

Unlike traditional conda feedstocks that compile from source, **brads-forge re-packages the official binary artifacts**
published by upstream maintainers. Source builds often introduce C library incompatibilities, missing features, or
subtle behavioural differences from what the original authors tested and shipped. Re-packaging the upstream binaries
trades theoretical portability for a significantly better developer experience — you get the exact same binary the
project's CI produced and the maintainers validated.

**brads-forge** solves this by:

- **Re-packaging upstream binaries** — no source compilation, no C library mismatch surprises.
- **Shipping new versions within hours** of upstream releases (automated daily builds + on-push).
- **Covering all major platforms** — Linux (x64/arm64), macOS (Intel/Apple Silicon), and Windows (x64/arm64).
- **Working natively with pixi** — add a package to `pixi.toml` and it just works, no extra tooling required.

## Usage

Add the channel to your `pixi.toml`:

```toml
[workspace]
channels = ["https://repo.prefix.dev/brads-forge", "conda-forge"]
```

Then install packages:

```bash
pixi add deno
pixi add task
pixi add lefthook
```

## Available Packages

Go to <https://prefix.dev/channels/brads-forge> for a list of available packages and their versions.

## Package Retention

[prefix.dev](https://prefix.dev) caps free channels at 100GB of storage, so this channel only retains **the last year's
worth of package versions**. A scheduled CI job (`task prefix-clean`) prunes package versions older than 365 days,
always keeping at least the latest version of each package regardless of age. If you need to pin to a version that has
aged out, you'll need to build it yourself from the corresponding recipe under `forge/`.

## How It Works (High Level)

Each package has a **recipe** — a TypeScript module under `forge/` that describes where to download binaries, how to
install them into a conda prefix, and how to verify the result. A daily CI pipeline compiles these recipes with
[rattler-build](https://github.com/prefix-dev/rattler-build) and uploads the resulting `.conda` packages to
`https://repo.prefix.dev/brads-forge`.
