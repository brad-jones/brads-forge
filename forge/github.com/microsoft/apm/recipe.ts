import * as r from "lib/mod.ts";

const owner = "microsoft";
const repo = "apm";
const maxPortableGlibc = [2, 17, 0] as const;

function compareVersion(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

async function assertPortableGlibc(bundleDir: string): Promise<void> {
  let highestVersion = [0, 0, 0];
  let highestVersionFile = "";
  const decoder = new TextDecoder();

  for await (const entry of r.walk(bundleDir)) {
    if (!entry.isFile) continue;

    const result = await new Deno.Command("readelf", {
      args: ["--version-info", entry.path],
      stdout: "piped",
      stderr: "null",
    }).output();
    if (!result.success) continue;

    const versions = decoder.decode(result.stdout).matchAll(/GLIBC_(\d+)\.(\d+)(?:\.(\d+))?/g);
    for (const match of versions) {
      const version = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
      if (compareVersion(version, highestVersion) > 0) {
        highestVersion = version;
        highestVersionFile = entry.path;
      }
    }
  }

  if (compareVersion(highestVersion, maxPortableGlibc) > 0) {
    throw new Error(
      `${highestVersionFile} requires GLIBC_${highestVersion.join(".")}; expected at most GLIBC_${
        maxPortableGlibc.join(".")
      }`,
    );
  }
}

const releaseAssets = r.githubReleaseAssets({
  owner,
  repo,
  osMap: { "osx": "darwin", "win": "windows" },
  archMap: { "64": "x86_64", "aarch64": "arm64" },
});

export default new r.Recipe({
  name: "apm",
  version: r.latestGithubTag({ owner, repo }),
  sources: async (tag) => {
    const sources = await releaseAssets(tag);
    sources["linux-64"] = [{
      git: `https://github.com/${owner}/${repo}.git`,
      rev: tag,
      depth: 1,
      lfs: false,
    }];
    return sources;
  },
  about: {
    homepage: "https://microsoft.github.io/apm/",
    repository: `https://github.com/${owner}/${repo}`,
    summary: "Agent Package Manager (APM) — a CLI for managing AI agent packages",
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`)
      .text(),
    license: "MIT",
  },
  requirements: (ctx) => {
    if (ctx.targetPlatform === "linux-64") {
      return {
        build: ["binutils", "git", "python 3.12.*", "uv"],
        run: ["__glibc >=2.17,<3.0.a0"],
      };
    }
    return {
      run: ctx.targetOs === "linux" ? ["__glibc >=2.38,<3.0.a0"] : [],
    };
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, targetPlatform, unix }) => {
      let extractedDir: string | undefined;
      if (targetPlatform === "linux-64") {
        await r.$`uv sync --frozen --extra build --python python`;
        await r.$`./scripts/build-binary.sh`;
        extractedDir = await r.expandGlobFirst("./dist/apm-linux-*", { breakOnDirOrFile: "dir" });
        if (extractedDir) await assertPortableGlibc(extractedDir);
      } else {
        extractedDir = await r.expandGlobFirst("./apm-*", { breakOnDirOrFile: "dir" });
      }
      if (!extractedDir) throw new Error(`extractedDir undefined`);

      const libexecDir = r.path.join(prefixDir, "libexec", "apm");
      await r.move(extractedDir, libexecDir);

      const bin = r.path.join(libexecDir, exe("apm"));
      if (unix) await Deno.chmod(bin, 0o755);

      if (unix) {
        const binDir = r.path.join(prefixDir, "bin");
        await r.activation.addLink(bin, r.path.join(binDir, exe("apm")));
      } else {
        await r.activation.prependToPATH(libexecDir);
      }
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const output = await r.$`apm --version`.text();
      const version = output.match(/version ([\d.]+)/)?.[1];
      if (!version || r.coerceSemVer(version) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
