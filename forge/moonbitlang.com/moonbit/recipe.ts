import * as r from "lib/mod.ts";
import type { z } from "zod";
import type { Source } from "lib/models/rattler/source.ts";

const owner = "moonbitlang";
const repo = "moonbit-compiler";

const cliUrl = "https://cli.moonbitlang.com";

// Maps our platforms to the target names used in the cli.moonbitlang.com archive names.
const platforms: Partial<Record<r.Platform, { target: string; ext: string }>> = {
  "linux-64": { target: "linux-x86_64", ext: "tar.gz" },
  "linux-aarch64": { target: "linux-aarch64", ext: "tar.gz" },
  "osx-arm64": { target: "darwin-aarch64", ext: "tar.gz" },
  "win-64": { target: "windows-x86_64", ext: "zip" },
};

const toolchainSource = async (version: string, target: string, ext: string, targetDirectory: string) => {
  const fileName = `moonbit-${target}.${ext}`;
  const url = `${cliUrl}/binaries/${version}/${fileName}`;
  return {
    url,
    sha256: r.digestFromChecksumTXT("SHA-256", fileName, await r.http.get(`${url}.sha256`).text()).digestPair[1],
    target_directory: targetDirectory,
  };
};

export default new r.Recipe({
  name: "moonbit",
  version: async () => {
    // Tags look like v0.10.15+943464bfa, the build metadata being the compiler commit.
    const { raw } = await r.latestGithubTag({ owner, repo })();
    return { raw: raw.replace(/^v/, ""), semver: r.coerceSemVer(raw.split("+")[0]) };
  },
  sources: async (tag) => {
    const version = encodeURIComponent(tag);

    const sources: Partial<Record<r.Platform, z.output<typeof Source>[]>> = {};
    for (const [platform, { target, ext }] of Object.entries(platforms)) {
      const coreUrl = `${cliUrl}/cores/core-${version}.${ext}`;
      sources[platform as r.Platform] = [
        await toolchainSource(version, target, ext, "moonbit"),
        { url: coreUrl, sha256: await r.digestFromUrl(coreUrl), target_directory: "core" },
      ];
    }

    // CI cross-builds linux-aarch64 on linux-64, which can't run the target's moon to bundle core.
    sources["linux-aarch64"]!.push(await toolchainSource(version, "linux-x86_64", "tar.gz", "moonbit-host"));

    return sources;
  },
  about: {
    homepage: "https://www.moonbitlang.com/",
    summary: "MoonBit is an AI-native programming language toolchain for cloud and edge computing.",
    repository: `https://github.com/${owner}/${repo}`,
    documentation: "https://docs.moonbitlang.com/",
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`,
    ).text(),
    license: "LicenseRef-MoonBit-Public-Source-License",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false, overlinking_behavior: "ignore" },
    func: async ({ prefixDir, srcDir, exe, unix, buildPlatform, targetPlatform }) => {
      // moon locates lib/core, include & friends relative to its own executable, so the toolchain
      // stays together in its own directory rather than being spread over $PREFIX/{bin,lib,include}.
      const moonRoot = r.path.join(prefixDir, "moonbit");
      await r.move("./moonbit", moonRoot);
      await r.move("./core", r.path.join(moonRoot, "lib", "core"));

      // The tarballs ship without execute bits.
      const chmodBin = async (root: string) => {
        if (!unix) return;
        for await (const entry of r.expandGlob(r.path.join(root, "bin/**/*"))) {
          if (entry.isFile) await Deno.chmod(entry.path, 0o755);
        }
      };
      await chmodBin(moonRoot);

      const moon = r.path.join(moonRoot, "bin", exe("moon"));
      await r.activation.addLink(moon, r.path.join(moonRoot, "bin", exe("moonx")));

      // Pre-compile the core library, as upstream's install scripts do. The output is target
      // independent IR, so a cross build can produce it with the build machine's toolchain.
      let bundlerRoot = moonRoot;
      if (buildPlatform !== targetPlatform) {
        bundlerRoot = r.path.join(srcDir, "moonbit-host");
        await chmodBin(bundlerRoot);
      }
      const bundler = r.path.join(bundlerRoot, "bin", exe("moon"));
      const coreDir = r.path.join(moonRoot, "lib", "core");
      await r.$`${bundler} -C ${coreDir} bundle --warn-list -a --all`;
      await r.$`${bundler} -C ${coreDir} bundle --warn-list -a --target wasm-gc --quiet`;

      // State of the bundle run itself, holding build prefix paths, which moon doesn't need to use the bundle.
      for (const file of [".moon_db", ".moon-lock"]) {
        await Deno.remove(r.path.join(coreDir, "_build", file));
      }

      await r.activation.addEnvVars({ "MOON_TOOLCHAIN_ROOT": "$CONDA_PREFIX/moonbit" });
      await r.activation.prependToPATH("$MOON_TOOLCHAIN_ROOT/bin");
    },
  },
  tests: {
    func: async ({ pkgVersion, prefixDir, exe }) => {
      const bin = r.path.join(prefixDir, "moonbit", "bin");
      const moon = r.path.join(bin, exe("moon"));
      const moonc = r.path.join(bin, exe("moonc"));

      if (r.coerceSemVer((await r.$`${moonc} -v`.text()).split("+")[0]) !== pkgVersion) {
        throw new Error(`unexpected version returned from moonc`);
      }

      await r.$`${moon} version --all`;

      // Building a project proves the bundled core is found from the installed location.
      const tmpDir = await Deno.makeTempDir();
      try {
        await r.$`${moon} new hello`.cwd(tmpDir);
        const output = await r.$`${moon} run cmd/main`.cwd(r.path.join(tmpDir, "hello")).text();
        if (!output.includes("Hello")) {
          throw new Error(`unexpected output from hello world: ${output}`);
        }
      } finally {
        await Deno.remove(tmpDir, { recursive: true });
      }
    },
  },
});
