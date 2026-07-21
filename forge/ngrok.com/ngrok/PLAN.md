# Recipe Plan: ngrok

> **Skill reference:** [forge-recipe skill](../../../.claude/skills/forge-recipe/forge-recipe.xcaf) **DSL reference:**
> [recipe-dsl-reference.md](../../../.claude/skills/forge-recipe/references/recipe-dsl-reference.md) **Examples:**
> [recipe-examples.md](../../../.claude/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Name        | `ngrok`                                                                                                             |
| Upstream    | `https://ngrok.com`                                                                                                 |
| Description | ngrok is a globally distributed reverse proxy that secures, protects and accelerates your applications and networks |
| License     | `LicenseRef-Proprietary` (closed-source, distributed under ngrok's own EULA/ToS — not an SPDX-listed license)       |
| Homepage    | `https://ngrok.com`                                                                                                 |

**Important:** ngrok does not publish binaries on GitHub Releases and does not provide any public, easily parsable list
of historical versions/downloads. This recipe uses a non-standard, custom version + source strategy described below.

## Version Source

- **Method:** Docker Hub tags for the `ngrok/ngrok` image, read via the public Docker Hub Registry HTTP API
  (`https://registry.hub.docker.com/v2/repositories/ngrok/ngrok/tags`).
- **Why not GitHub:** ngrok has no public releases repo for the CLI binary.
- **Why not scoop manifest:** the official Windows scoop manifest
  (https://github.com/ScoopInstaller/Main/blob/master/bucket/ngrok.json) could be parsed instead, but Docker Hub tags
  are more directly machine-parsable and were confirmed to accurately track the current stable release.
- **Why not `skopeo`:** originally implemented via `skopeo list-tags docker://ngrok/ngrok`, but `skopeo` has **no
  Windows build** on conda-forge (only linux-64/osx-64/osx-arm64), which breaks recipe generation on Windows GitHub
  Actions runners. Switched to a plain HTTP call instead — cross-platform, no extra pixi dependency needed.
- **Tag format:** Docker tags look like `3.39.9-debian`, `3.39.9-alpine`, `3.39.9-debian-amd64`,
  `3.39.9-debian-<shortsha>`, plus non-semver tags like `latest`, `debian`, `alpine`, `2`, `3`, `3-debian`, etc. There
  is **no bare `X.Y.Z` tag** — only suffixed variants.
- **Filter:** Match tags against `^(\d+\.\d+\.\d+)-debian$` and take the numeric capture group as the raw version.
- **Query:** `GET /v2/repositories/ngrok/ngrok/tags?page_size=100&ordering=last_updated&name=debian` — the `name=`
  substring filter narrows results to `-debian`/`debian` tags server-side, and `ordering=last_updated` means the tags
  come back most-recently-pushed first, so the **first** tag matching the regex on the first page is the latest version.
  No pagination needed.
- **Verified:** As of writing, the first matching `X.Y.Z-debian` tag is `3.39.9`, which matches the version reported by
  the actual downloaded binary (`ngrok version` → `ngrok version 3.39.9`). ✅ consistent.

## Source Assets — ⚠️ Non-standard CDN behavior (please read)

- **Download pages:** https://ngrok.com/download/linux?tab=download and https://ngrok.com/download/mac-os?tab=download
  (both are JS-rendered SPA pages; the actual static asset base URL was extracted from the page's bundled JS:
  `https://bin.ngrok.com/c/bNyj1mQVY4c/${filename}`).
- **Asset naming pattern:** `ngrok-v3-{version}-{os}-{arch}.{ext}` — e.g. `ngrok-v3-3.39.9-linux-amd64.tgz`. The
  official docs show `ngrok-v3-stable-linux-amd64.tgz` and instruct replacing `stable` with the specific version.
- **⚠️ CRITICAL FINDING (verified by downloading and comparing SHA-256 hashes):** The version segment in the URL path is
  **completely ignored** by ngrok's CDN. Requests for `ngrok-v3-stable-linux-amd64.tgz`,
  `ngrok-v3-3.0.2-linux-amd64.tgz` (a real, much older version), and even a fully bogus
  `ngrok-v3-9.9.9-bogus-linux-amd64.tgz` **all return HTTP 200 with byte-for-byte identical content**
  (`sha256=0b74db428f655944292cf6c554d35c8941faeccff87d5a6835152c7a08281ff0`, which unpacks to `ngrok version 3.39.9` —
  the current stable release). **There is no way to download a historical/pinned version of the ngrok binary from this
  CDN — it always serves whatever is currently "stable".**
  - **Implication:** This recipe can only ever build "the current latest ngrok". Re-running `task generate` at a later
    date will always fetch whatever is latest at that time, and the sha256 must be computed fresh at generation time
    (not looked up from a checksums file, since none is published, and it wouldn't be pin-able anyway).
  - **Implication:** We rely on the assumption that ngrok updates the Docker Hub tag and the CDN binary together. The
    `tests` step (`ngrok version` compared against `pkgVersion`) acts as a safety net — if they ever drift out of sync,
    the build will fail loudly rather than silently mislabeling the package version.
  - We still build the URL using the real version number (not the literal string `stable`) per the user's request, in
    case ngrok ever fixes this CDN behavior to actually respect the version segment.
- **Archive format:** `.tgz` (tar.gz) for Linux, `.zip` for macOS and Windows. Both are auto-extracted by rattler-build.
- **Checksum strategy:** No published checksums exist for specific versions (see finding above). Compute SHA-256 at
  generation time by downloading each asset and hashing it:
  `(await r.Digest.fromBuffer(await (await r.http.get(url)).bytes())).hashString` (same pattern already used for the
  Windows sources in `forge/atlassian.com/acli/recipe.ts`).
- **Custom `sources` function required** (not `r.githubReleaseAssets`, since this isn't GitHub-hosted) — will manually
  build a `Partial<Record<Platform, Source[]>>` map with one entry per supported platform.

### OS Mapping (asset filename component)

| Pixi OS | Asset string |
| ------- | ------------ |
| `linux` | `linux`      |
| `osx`   | `darwin`     |
| `win`   | `windows`    |

### Arch Mapping (asset filename component)

| Pixi Arch | Asset string |
| --------- | ------------ |
| `64`      | `amd64`      |
| `arm64`   | `arm64`      |
| `aarch64` | `arm64`      |

### Supported Platforms (all verified to return HTTP 200)

- [x] linux-64 → `ngrok-v3-{version}-linux-amd64.tgz`
- [x] linux-aarch64 → `ngrok-v3-{version}-linux-arm64.tgz`
- [x] osx-64 → `ngrok-v3-{version}-darwin-amd64.zip`
- [x] osx-arm64 → `ngrok-v3-{version}-darwin-arm64.zip`
- [x] win-64 → `ngrok-v3-{version}-windows-amd64.zip`
- [x] win-arm64 → `ngrok-v3-{version}-windows-arm64.zip`

(Matches the 6 platforms targeted by `task generate` in the Taskfile.)

## Build Steps

1. Extract archive — binary is at the root of the archive: `./ngrok` (or `./ngrok.exe` on Windows). No nested
   directories or `target_directory` needed since each platform gets its own single-file archive.
2. Move binary to `$PREFIX/bin/ngrok` (or `ngrok.exe`) using `r.moveGlob("./ngrok*", dst)` — use `exe()` helper for the
   destination name.
3. `chmod 755` on Unix (`if (unix) await Deno.chmod(dst, 0o755)`).
4. No env vars, PATH modifications, or symlinks needed.

## Runtime Dependencies

- None. `ngrok` is a single statically-linked binary with no external runtime dependencies.

## Test Strategy

- **Command:** `ngrok version`
- **Expected output format:** `ngrok version 3.39.9` (space-separated, version is the last token)
- **Validation:** `r.coerceSemVer(await r.$\`ngrok
  version\`.text())`compared against`pkgVersion`(same pattern as
  other recipes —`coerceSemVer`should correctly extract`3.39.9`from the full string via`semver.coerce`).
- **Platform-specific tests:** None needed — same command works on all platforms.

## Verification Steps

After writing the recipe to `forge/ngrok.com/ngrok/recipe.ts`:

```bash
# 0. Add skopeo to pixi.toml [dependencies], then run `pixi install` (or equivalent) so it's available.

# 1. Generate rattler build recipes for all platforms (no build, no upload)
task generate RECIPE=forge/ngrok.com/ngrok/recipe.ts

# 2. Check generated output
ls forge/ngrok.com/ngrok/generated/

# 3. Build and test locally (current platform only, no upload)
task dryrun RECIPE=forge/ngrok.com/ngrok/recipe.ts
```

### Expected outcomes

- `task generate` should complete without errors and produce YAML files in `generated/` for all 6 platforms.
- `task dryrun` should build and pass the `ngrok version` test on the current platform (linux-64).
- If either fails, diagnose the error and update the recipe accordingly.

## Open Questions (for user confirmation before writing recipe.ts)

1. **License SPDX id** — proposing `LicenseRef-Proprietary` since ngrok is closed-source and has no SPDX-listed license.
   Confirm this is acceptable, or provide a preferred license string.
2. **Reproducibility caveat** — confirm you're OK with the fact that this recipe can never pin/build a truly historical
   ngrok version; every `task generate` run will always fetch "whatever is latest right now" and label it with whatever
   version Docker Hub currently reports as latest.
3. **`about.description`** — ngrok has no README to fetch (closed source). Proposing a short static paragraph describing
   the tool instead. OK to write ad-hoc description text?
