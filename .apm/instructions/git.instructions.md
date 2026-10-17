---
description: Rules for using git in this repo effectively.
applyTo: "**"
---

### Using Git Effectively

#### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standard for all commit messages.
Refer to the `git-commit` skill for guidance on how to write commit messages that comply with this standard.

#### Hooks

We use [Lefthook](https://github.com/evilmartians/lefthook) for git hooks (`lefthook.yaml`). Hooks are installed
automatically via `task init`. More information about how to use lefthook effectively can be found in the `lefthook`
skill.

#### Always Use --no-pager

When running git commands, always pass `--no-pager` to prevent the shell from hanging on interactive pager output (e.g.
`less`).

```bash
git --no-pager log
git --no-pager diff
git --no-pager show
```

The flag goes immediately after `git` and before the subcommand.
