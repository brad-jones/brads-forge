import * as r from "lib/mod.ts";

const brewFormula = r.http.get(
  "https://raw.githubusercontent.com/atlassian/homebrew-acli/refs/heads/main/Formula/acli.rb",
).text();

export default new r.Recipe({
  name: "acli",
  version: async () => {
    const extractedVersion = (await brewFormula)
      .match(/version "([^"]+)"/)
      ?.[1];

    if (!extractedVersion) {
      throw new Error("failed to extract version from Homebrew formula");
    }

    return {
      raw: extractedVersion,
      semver: r.coerceSemVer(extractedVersion)?.split("-")[0],
    };
  },
  sources: async (tag) => {
    const formula = await brewFormula;

    const extractSha256 = (platform: string): string => {
      const match = formula.match(
        new RegExp(
          `acli_[^_]+_${platform}\\.tar\\.gz[^\\n]*\\n\\s*sha256 "([^"]+)"`,
        ),
      );
      if (!match) throw new Error(`failed to extract sha256 for ${platform}`);
      return match[1];
    };

    return {
      "linux-64": [{
        url:
          `https://acli.atlassian.com/linux/${tag}/acli_${tag}_linux_amd64.tar.gz`,
        sha256: extractSha256("linux_amd64"),
        target_directory: "acli",
      }],
      "linux-aarch64": [{
        url:
          `https://acli.atlassian.com/linux/${tag}/acli_${tag}_linux_arm64.tar.gz`,
        sha256: extractSha256("linux_arm64"),
        target_directory: "acli",
      }],
      "osx-64": [{
        url:
          `https://acli.atlassian.com/darwin/${tag}/acli_${tag}_darwin_amd64.tar.gz`,
        sha256: extractSha256("darwin_amd64"),
        target_directory: "acli",
      }],
      "osx-arm64": [{
        url:
          `https://acli.atlassian.com/darwin/${tag}/acli_${tag}_darwin_arm64.tar.gz`,
        sha256: extractSha256("darwin_arm64"),
        target_directory: "acli",
      }],

      // NB: I couldn't find out what the correct url pattern was for a versioned windows binary,
      // so I'm just linking to the latest version and hoping that when Atlassian updates the brew formula,
      // they also update the latest windows binary.
      "win-64": [{
        url:
          `https://acli.atlassian.com/windows/latest/acli_windows_amd64/acli.exe`,
        sha256: (await r.Digest.fromBuffer(
          await (await r.http.get(
            `https://acli.atlassian.com/windows/latest/acli_windows_amd64/acli.exe`,
          )).bytes(),
        )).hashString,
        target_directory: "acli",
      }],
      "win-arm64": [{
        url:
          `https://acli.atlassian.com/windows/latest/acli_windows_arm64/acli.exe`,
        sha256: (await r.Digest.fromBuffer(
          await (await r.http.get(
            `https://acli.atlassian.com/windows/latest/acli_windows_arm64/acli.exe`,
          )).bytes(),
        )).hashString,
        target_directory: "acli",
      }],
    };
  },
  about: {
    repository:
      `https://developer.atlassian.com/cloud/acli/guides/introduction/`,
    summary:
      "Atlassian CLI is a command line tool that unlocks a new way for you to interact with Atlassian, using text-based commands and scripts to complete tasks.",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("acli"));
      await r.moveGlob("./acli*/acli*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (
        r.coerceSemVer(await r.$`acli --version`.text("combined"))?.split(
          "-",
        )[0] !==
          pkgVersion
      ) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
