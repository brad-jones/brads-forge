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
  platforms: ["linux-64"],
  about: {
    homepage: "https://microsoft.github.io/apm/",
    repository: `https://github.com/${owner}/${repo}`,
    summary: "Agent Package Manager (APM) — a CLI for managing AI agent packages",
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`)
      .text(),
    license: "MIT",
  },
  requirements: {
    host: [
      "python 3.12.*",
      "pip",
      "setuptools >=42",
      "wheel",
    ],
    run: [
      "python >=3.11",
      "click >=8",
      "colorama >=0.4.6",
      "pyyaml >=6",
      "requests >=2.31",
      "truststore >=0.10",
      "python-frontmatter >=1",
      "llm >=0.28",
      "llm-github-models >=0.18",
      "tomli >=1.2",
      "toml >=0.10.2",
      "tomlkit >=0.13",
      "rich >=13",
      "rich-click >=1.7",
      "watchdog >=3",
      "gitpython >=3.1",
      "git",
      "ruamel.yaml >=0.18",
      "filelock >=3.12",
      "websockets >=12,<17",
    ],
  },
  build: {
    number: 1,
    noarch: "python",
    script: "python -m pip install ./source --no-deps --no-build-isolation --prefix $PREFIX",
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
