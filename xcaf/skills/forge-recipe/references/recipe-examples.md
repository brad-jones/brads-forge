# Recipe Examples

Annotated examples from real recipes in this forge, demonstrating common patterns.

---

## Example 1: Standard GitHub Binary (cocogitto)

The simplest pattern — a Go/Rust binary released on GitHub with standard naming.

```typescript
import * as r from "lib/mod.ts";

const owner = "cocogitto";
const repo = "cocogitto";

export default new r.Recipe({
  name: "cocogitto",

  // Fetches tags, filters out pre-releases (tags with '-'), returns highest semver
  version: r.latestGithubTag({ owner, repo }),

  // Auto-maps release assets to platforms using OS/arch string matching
  sources: r.githubReleaseAssets({
    owner,
    repo,
    // Map pixi OS names to strings found in asset filenames
    osMap: { "osx": "apple-darwin", "win": "pc-windows-msvc" },
    // Map pixi arch names to strings found in asset filenames
    archMap: { "64": "x86_64", "armv7l": "armv7" },
  }),

  about: {
    homepage: "https://docs.cocogitto.io/",
    summary: "The Conventional Commits toolbox",
    repository: `https://github.com/${owner}/${repo}`,
    // Fetch README for rich package description
    description: await r.http.get(
      "https://raw.githubusercontent.com/cocogitto/cocogitto/refs/heads/main/README.md",
    ).text(),
    license: "MIT",
  },

  build: {
    number: 2, // Increment when rebuilding same upstream version
    dynamic_linking: { binary_relocation: false }, // Standard for pre-built binaries
    func: async ({ prefixDir, exe, unix }) => {
      // Move binary from extracted archive to $PREFIX/bin/
      const dst = r.path.join(prefixDir, "bin", exe("cog"));
      await r.moveGlob("./cocogitto*/**/cog*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },

  tests: {
    func: async ({ pkgVersion }) => {
      // Verify binary runs and reports correct version
      if (r.coerceSemVer(await r.$`cog --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
```

---

## Example 2: Custom Filename Pattern (go-task)

When asset filenames don't follow the default `{repo}_{os}_{arch}` pattern.

```typescript
import * as r from "lib/mod.ts";

const owner = "go-task";
const repo = "task";

export default new r.Recipe({
  name: "task",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "32": "386", "64": "amd64", "aarch64": "arm64" },
    // Explicit filename builder when auto-matching isn't reliable
    fileName: (_, os, arch) => `task_${os}_${arch}.${os === "windows" ? "zip" : "tar.gz"}`,
  }),
  about: {
    homepage: "https://taskfile.dev/",
    summary: "A task runner / simpler Make alternative written in Go.",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      "https://raw.githubusercontent.com/go-task/task/refs/heads/main/README.md",
    ).text(),
    license: "MIT",
  },
  build: {
    number: 2,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("task"));
      await r.moveGlob("./task*/task*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`task --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
```

---

## Example 3: Tag Filtering (bun)

When the repo uses non-standard tag prefixes that need filtering.

```typescript
import * as r from "lib/mod.ts";

const owner = "oven-sh";
const repo = "bun";

export default new r.Recipe({
  name: "bun",
  // Only consider tags matching "bun-v*" pattern
  version: r.latestGithubTag({ owner, repo, tagFilter: /bun-v.*/ }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    fileName: (_, os, arch) => `bun-${os}-${arch}.zip`,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "x64", "arm64": "aarch64" },
  }),
  about: {
    homepage: "https://bun.sh/",
    summary: "Incredibly fast JavaScript runtime, bundler, test runner, and package manager - all in one",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      "https://raw.githubusercontent.com/oven-sh/bun/refs/heads/main/README.md",
    ).text(),
    license: "MIT",
  },
  build: {
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("bun"));
      await r.moveGlob("./bun*/bun*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion, exe }) => {
      if (r.coerceSemVer((await r.$`bun --version`.text()).split("\n")[0]) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
```

---

## Example 4: Activation Scripts & Environment Variables (deno)

When the package needs environment variables set on activation.

```typescript
import * as r from "lib/mod.ts";

const owner = "denoland";
const repo = "deno";

export default new r.Recipe({
  name: "deno",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    checksumFileExt: ".sha256sum",
    checksumExtractor: (txt) => txt.split("\n")[2].split(":")[1].trim().toLowerCase(),
    fileName: (_, os, arch) => `deno-${arch}-${os}.zip`,
    osMap: { "osx": "apple-darwin", "win": "pc-windows-msvc", "linux": "unknown-linux-gnu" },
    archMap: { "64": "x86_64", "arm64": "aarch64" },
  }),
  about: {
    homepage: "https://deno.com/",
    summary: "A modern runtime for JavaScript and TypeScript.",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      "https://raw.githubusercontent.com/denoland/deno/refs/heads/main/README.md",
    ).text(),
    license: "MIT",
  },
  build: {
    number: 4,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const deno = r.path.join(prefixDir, "bin", exe("deno"));
      await r.moveGlob("./deno*/deno*", deno);
      if (unix) await Deno.chmod(deno, 0o755);

      // Set environment variables on activation
      await r.activation.addEnvVars({
        "DENO_INSTALL_ROOT": "$CONDA_PREFIX/bin",
        "DENO_DIR": "$CONDA_PREFIX/var/cache/deno",
      });

      // Create an alias symlink (Unix only)
      if (unix) {
        await r.activation.addLink(deno, r.path.join(prefixDir, "bin", exe("dx")));
      }
    },
  },
  tests: {
    func: async ({ pkgVersion, unix, prefixDir, exe }) => {
      const deno = r.path.join(prefixDir, "bin", exe("deno"));
      if (r.coerceSemVer((await r.$`${deno} --version`.text()).split("\n")[0]) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }

      if (unix) {
        const dx = r.path.join(prefixDir, "bin", exe("dx"));
        if ((await r.$`${dx} --help`.text()).split("\n")[0] !== "Execute a binary from npm or jsr, like npx") {
          throw new Error(`dx alias not working`);
        }
      }
    },
  },
});
```

---

## Example 5: Custom Version & Source (non-GitHub)

When the package doesn't use GitHub releases at all.

```typescript
import * as r from "lib/mod.ts";

export default new r.Recipe({
  name: "acli",

  // Custom version resolution (scraping a Homebrew formula)
  version: async () => {
    const formula = await r.http.get(
      "https://raw.githubusercontent.com/atlassian/homebrew-acli/refs/heads/main/Formula/acli.rb",
    ).text();
    const version = formula.match(/version "([^"]+)"/)?.[1];
    if (!version) throw new Error("failed to extract version");
    return { raw: version, semver: r.coerceSemVer(version) };
  },

  // Manually defined per-platform sources
  sources: async (tag) => {
    return {
      "linux-64": [{
        url: `https://acli.atlassian.com/linux/${tag}/acli_${tag}_linux_amd64.tar.gz`,
        sha256: "<computed-or-fetched>",
        target_directory: "acli",
      }],
      "osx-arm64": [{
        url: `https://acli.atlassian.com/darwin/${tag}/acli_${tag}_darwin_arm64.tar.gz`,
        sha256: "<computed-or-fetched>",
        target_directory: "acli",
      }],
      // ... more platforms
    };
  },

  about: {
    summary: "Atlassian CLI for managing cloud resources",
  },

  build: {
    number: 1,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("acli"));
      await r.moveGlob("./acli*/acli*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },

  tests: {
    func: async ({ pkgVersion }) => {
      const output = await r.$`acli --version`.text();
      if (!output.includes(pkgVersion)) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
```

---

## Example 6: Single Gzipped Binary with Runtime Dependency (overmind)

When upstream releases a plain `.gz` compressed binary (NOT `.tar.gz`), rattler-build does NOT auto-extract it. You must
decompress manually with `r.archive.gunzipFile()`.

```typescript
import * as r from "lib/mod.ts";

const owner = "DarthSim";
const repo = "overmind";

export default new r.Recipe({
  name: "overmind",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "macos" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
    // Tag is embedded in filename: overmind-v2.5.1-linux-amd64.gz
    fileName: (v, os, arch) => `overmind-${v}-${os}-${arch}.gz`,
    // Per-asset .sha256sum files contain ONLY the raw hex hash (no filename)
    checksumFileExt: ".sha256sum",
    checksumExtractor: (txt) => txt.trim(),
  }),
  about: {
    homepage: `https://github.com/${owner}/${repo}`,
    summary: "Process manager for Procfile-based applications and target tmux",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`,
    ).text(),
    license: "MIT",
  },
  // Runtime dependency — overmind requires tmux to function
  requirements: {
    run: ["tmux"],
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("overmind"));
      // IMPORTANT: Use gunzipFile, NOT moveGlob — the .gz is NOT auto-extracted
      await r.archive.gunzipFile("./overmind*/*.gz", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`overmind --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
```

**Key learnings from this pattern:**

- `.gz` (single gzipped file) ≠ `.tar.gz` (gzipped tarball). Only tarballs are auto-extracted.
- Source lands at `$SRC_DIR/<target_directory>/<filename>.gz` — still compressed.
- The glob pattern for `gunzipFile` should match `"./<target_dir>/*.gz"`.
- `checksumExtractor: (txt) => txt.trim()` handles `.sha256sum` files that contain only the raw 64-char hex hash with a
  trailing newline (no filename in the file).
- `requirements.run` adds conda-forge packages as runtime dependencies.

---

## Example 7: Custom Download API (go)

When the upstream provides a structured download API.

```typescript
import * as r from "lib/mod.ts";
import { z } from "zod";
import type { Source } from "lib/models/rattler/source.ts";

// Define a schema for the upstream API response
const GoDownloads = z.array(z.object({
  version: z.string(),
  files: z.array(z.object({
    filename: z.string(),
    os: z.string(),
    arch: z.string(),
    sha256: z.string(),
    kind: z.string(),
  })),
}));

export default new r.Recipe({
  name: "go",
  version: async () => {
    const downloads = GoDownloads.parse(await r.http.get("https://go.dev/dl/?mode=json").json());
    return { raw: downloads[0].version, semver: r.coerceSemVer(downloads[0].version) };
  },
  sources: async (tag) => {
    const sources: Partial<Record<r.Platform, z.output<typeof Source>[]>> = {};
    const downloads = GoDownloads.parse(await r.http.get("https://go.dev/dl/?mode=json").json());
    const archives = downloads.find((_) => _.version === tag)?.files?.filter((_) => _.kind === "archive") ?? [];

    for (const archive of archives) {
      // Map upstream OS/arch to pixi platform format
      // ... platform mapping logic ...
      const platform = r.Platform.safeParse(`${mappedOs}-${mappedArch}`);
      if (platform.success) {
        sources[platform.data] = [{
          url: `https://go.dev/dl/${archive.filename}`,
          sha256: archive.sha256,
          target_directory: "go",
        }];
      }
    }
    return sources;
  },
  // ... build and test
});
```

---

## Common Patterns Cheat Sheet

| Pattern              | Code                                                                            |
| -------------------- | ------------------------------------------------------------------------------- |
| Move single binary   | `await r.moveGlob("./<name>*/<name>*", dst)`                                    |
| Move from nested dir | `await r.moveGlob("./<name>*/**/<name>*", dst)`                                 |
| Set executable       | `if (unix) await Deno.chmod(dst, 0o755)`                                        |
| Version check        | `r.coerceSemVer(await r.$\`cmd --version\`.text())`                             |
| Split version output | `(await r.$\`cmd --version\`.text()).split("\n")[0]`                            |
| Compute SHA-256      | `(await r.Digest.fromBuffer(await (await r.http.get(url)).bytes())).hashString` |
| Env vars on activate | `await r.activation.addEnvVars({ KEY: "value" })`                               |
| Prepend to PATH      | `await r.activation.prependToPATH("$CONDA_PREFIX/bin")`                         |
