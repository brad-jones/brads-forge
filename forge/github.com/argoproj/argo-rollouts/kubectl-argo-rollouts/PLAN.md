# Recipe Plan: kubectl-argo-rollouts

> **Skill reference:** [forge-recipe skill](../../../../../xcaf/skills/forge-recipe/forge-recipe.xcaf) **DSL reference:**
> [recipe-dsl-reference.md](../../../../../xcaf/skills/forge-recipe/references/recipe-dsl-reference.md) **Examples:**
> [recipe-examples.md](../../../../../xcaf/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------- |
| Name        | `kubectl-argo-rollouts`                                                                       |
| Upstream    | <https://github.com/argoproj/argo-rollouts>                                                   |
| Description | kubectl plugin (and local dashboard) for Argo Rollouts progressive delivery (canary/blue-green) |
| License     | `Apache-2.0`                                                                                  |
| Homepage    | <https://argo-rollouts.readthedocs.io/>                                                       |

The upstream repo's primary artifact is the in-cluster controller (shipped as a container image). The only
standalone binary published on GitHub releases is the `kubectl-argo-rollouts` CLI, so that is what is packaged. The
package name follows the binary rather than the repo, hence the extra `<package-name>` directory level.

## Version Source

- **Method:** GitHub tags
- **Tag format:** `v1.10.0`
- **Filter:** none needed. The default `r.latestGithubTag` drops tags containing `-` (e.g. `v1.10.0-rc1`).
- **Owner/Repo:** `argoproj` / `argo-rollouts`

## Source Assets

- **Release page:** <https://github.com/argoproj/argo-rollouts/releases>
- **Asset naming pattern:** `kubectl-argo-rollouts-{os}-{arch}` (e.g. `kubectl-argo-rollouts-linux-amd64`)
- **Archive format:** none. Each asset is a **bare executable**, not an archive. rattler-build copies it as-is into
  `$SRC_DIR/<asset-name>/<asset-name>`, which is the layout `githubReleaseAssets` produces via `target_directory`.
  The Windows asset has no `.exe` suffix either.
- **Checksum strategy:** single `argo-rollouts-checksums.txt` (`<sha256>  <asset-name>` lines). `githubReleaseAssets`
  already picks it up through its default `/checksum|sha256/i` pattern, and also prefers the GitHub API asset `digest`
  when present. No per-asset `.sha256` files exist (they 404). No config needed.
- Other release assets (`install.yaml`, `dashboard-install.yaml`, `*.intoto.jsonl`, ...) contain no OS/arch string and
  are skipped by the matcher.

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

Upstream publishes exactly five binaries (see `Makefile` `plugin-*` targets and `.github/workflows/release.yaml`):

- [x] linux-64
- [x] linux-aarch64
- [x] osx-64
- [x] osx-arm64
- [x] win-64
- [ ] win-arm64 (not published upstream; will not be generated)

## Build Steps

1. Move the bare binary to `$PREFIX/bin/kubectl-argo-rollouts` (`.exe` appended on Windows via `exe()`):
   `await r.moveGlob("./kubectl-argo-rollouts*/kubectl-argo-rollouts*", dst)`
2. `chmod 755` on unix (release assets are not guaranteed to carry the exec bit).
3. No activation scripts or env vars. kubectl discovers any `kubectl-*` executable on `PATH`, so
   `kubectl argo rollouts ...` works automatically.

## Runtime Dependencies

- None required. The binary is statically built (`CGO_ENABLED=0`).
- `kubectl` is the natural companion but the tool also works standalone, so it is **not** listed as a dependency (see
  Open Questions).

## Test Strategy

- **Command:** `kubectl-argo-rollouts version --short`
- **Expected output format:** `kubectl-argo-rollouts: v1.10.0+<gitcommit>` (from `PrintVersion` in
  `pkg/kubectl-argo-rollouts/cmd/version/version.go`; the version string is `v<ver>+<commit>`)
- **Validation:** `r.coerceSemVer(output) !== pkgVersion` -> throw. `coerceSemVer` may not cope with the `+<commit>`
  build metadata or the `kubectl-argo-rollouts:` prefix. If `task dryrun` shows it doesn't, extract with a regex such as
  `/v(\d+\.\d+\.\d+)/` before comparing.
- **Platform-specific tests:** none.

## Draft recipe (to be written after approval)

```typescript
import * as r from "lib/mod.ts";

const owner = "argoproj";
const repo = "argo-rollouts";

export default new r.Recipe({
  name: "kubectl-argo-rollouts",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://argo-rollouts.readthedocs.io/",
    summary: "Kubectl plugin and dashboard for Argo Rollouts progressive delivery",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`)
      .text(),
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("kubectl-argo-rollouts"));
      await r.moveGlob("./kubectl-argo-rollouts*/kubectl-argo-rollouts*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const out = await r.$`kubectl-argo-rollouts version --short`.text();
      if (r.coerceSemVer(out) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary: ${out}`);
      }
    },
  },
});
```

## Verification Steps

After writing the recipe to `forge/github.com/argoproj/argo-rollouts/kubectl-argo-rollouts/recipe.ts`, run:

```bash
# Generate rattler build recipes for all platforms (no build, no upload)
task generate RECIPE=forge/github.com/argoproj/argo-rollouts/kubectl-argo-rollouts/recipe.ts

# Check generated output
ls forge/github.com/argoproj/argo-rollouts/kubectl-argo-rollouts/generated/

# Build and test locally (current platform only, no upload)
task dryrun RECIPE=forge/github.com/argoproj/argo-rollouts/kubectl-argo-rollouts/recipe.ts
```

### Expected outcomes

- `task generate` completes and writes YAML for the five platforms above (no `win-arm64`).
- `task dryrun` builds and passes the version test on the current platform.
- A 401 from the GitHub API means the token in `.env` has expired. Refresh it there, never echo it.

## Open Questions

1. **Package name:** `kubectl-argo-rollouts` (matches the binary and how users invoke it) vs `argo-rollouts` (matches the
   repo, single-level directory). The plan assumes the former.
2. **Add `kubectl` as a `run` requirement?** Assumed no, since the binary works standalone and `kubectl` is rarely
   missing for users of this tool.
3. **`kubectl-argo-rollouts` alias:** do you want a shorter symlink such as `rollouts`? Assumed no.
