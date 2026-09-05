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
  requirements: r.pyprojectRequirements({
    url: (tag) => `https://raw.githubusercontent.com/${owner}/${repo}/refs/tags/${tag}/pyproject.toml`,
    // v0.29.0's metadata advertises python 3.10, but the code imports `typing.Self`
    // which only lands in the stdlib at 3.11.
    python: ">=3.11",
    // Not a python dependency, so it can never appear in `pyproject.toml`: APM
    // initialises GitPython & resolves packages through git.
    extraRun: ["git"],
  }),
  build: {
    number: 1,
    noarch: "python",
    // No `--prefix`: `python` here comes from the host requirements and already
    // points at $PREFIX, so pip installs to the right place. Spelling out the
    // prefix would need `$PREFIX` on unix & `%PREFIX%` on windows, and this recipe
    // is built on both.
    script: "python -m pip install ./source --no-deps --no-build-isolation",
  },
  tests: [
    {
      script: [
        "apm --version",
        'python -c "from apm_cli.cli import main; assert callable(main)"',
      ],
      requirements: {
        run: ["python 3.11.*"],
      },
    },
    {
      script: [
        "apm --version",
        'python -c "from apm_cli.cli import main; assert callable(main)"',
      ],
      requirements: {
        run: ["python 3.14.*"],
      },
    },
  ],
});
