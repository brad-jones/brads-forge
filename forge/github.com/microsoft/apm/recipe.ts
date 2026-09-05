import * as r from "lib/mod.ts";

const owner = "microsoft";
const repo = "apm";

export default new r.Recipe({
  name: "apm",
  version: r.latestGithubTag({ owner, repo }),
  sources: async (tag) => {
    const url = `https://github.com/${owner}/${repo}/archive/refs/tags/${tag}.tar.gz`;
    return {
      url,
      sha256: await r.digestFromUrl(url),
      target_directory: "source",
    };
  },
  // A single noarch artifact serves every one of these, but we still build & test
  // the recipe on each so a platform specific packaging bug can't slip through.
  // `getPlatforms()` can only infer platforms from platform mapped sources, and
  // this recipe has just the one source archive, so they're listed explicitly.
  platforms: ["linux-64", "linux-aarch64", "win-64", "osx-64", "osx-arm64"],
  about: {
    homepage: "https://microsoft.github.io/apm/",
    repository: `https://github.com/${owner}/${repo}`,
    summary: "Agent Package Manager (APM) — a CLI for managing AI agent packages",
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`)
      .text(),
    license: "MIT",
  },
  // Derived from the tagged `pyproject.toml` so the dependency list tracks upstream
  // instead of drifting out of date between releases.
  //
  // NB: `git` is deliberately NOT declared, even though APM shells out to it. Upstream
  // treats it as a system prerequisite & so should we: even the PyInstaller build looks it
  // up with `shutil.which("git")` and strips the bundle's own library paths so the child
  // process gets the system git. conda-forge's `gitpython` leaves the executable to the
  // system for the same reason. Pulling conda-forge's git in would shadow the developer's
  // own install for anything running in the environment - and on windows that is a
  // different build to Git for Windows, which may not find its credential helpers. Without
  // it APM fails with a clear message naming git & linking its download page, exactly as
  // upstream's own distribution does.
  requirements: r.pyprojectRequirements({
    url: (tag) => `https://raw.githubusercontent.com/${owner}/${repo}/refs/tags/${tag}/pyproject.toml`,
    // v0.29.0's metadata advertises python 3.10, but the code imports `typing.Self`
    // which only lands in the stdlib at 3.11.
    python: ">=3.11",
  }),
  build: {
    number: 1,
    noarch: "python",
    // `pip install` bakes the *build* environment's absolute interpreter path into the
    // Windows console-script launcher it generates for `apm.exe`, which breaks the moment
    // the build prefix is torn down. Declaring the entry point here instead tells
    // rattler-build to generate its own launcher (relative to the install prefix), so it
    // keeps working in the run/test environment.
    python: {
      entry_points: ["apm = apm_cli.cli:main"],
    },
    func: async ({ prefixDir, srcDir }) => {
      // `--no-deps` because every runtime dependency is declared through conda above,
      // `--no-build-isolation` because setuptools & wheel come from the host requirements
      // rather than being fetched from PyPI.
      await r.$`python -m pip install ${
        r.path.join(srcDir, "source")
      } --no-deps --no-build-isolation --prefix ${prefixDir}`;
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      // Substring rather than `coerceSemVer`, because rich prints the version inside a
      // sentence & may wrap it in ANSI codes, whose numbers coerce would happily parse.
      const version = await r.$`apm --version`.text();
      if (!version.includes(pkgVersion)) {
        throw new Error(`unexpected version returned from binary: ${version}`);
      }
      // The console entry point is the whole reason this package exists, so check that
      // pip wrote it & that it imports, not just that the module is on disk.
      await r.$`python -c ${"from apm_cli.cli import main; assert callable(main)"}`;
    },
    // Pinned to the floor the package declares: `run` already stops the solver installing
    // this on anything older, so 3.11 is the version most likely to break.
    requirements: {
      run: ["python 3.11.*"],
    },
  },
});
