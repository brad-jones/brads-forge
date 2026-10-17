---
description: Rules for when and how to write code comments.
applyTo: "**"
---

### Code Comments

Comments are read months later by people who never saw the chat, ticket or prompt that produced the code. A comment that
only makes sense inside that conversation becomes noise at best and misleading at worst. Too many comments have a
similar cost: readers learn to skip them, including the ones that matter. So write few, and write them for that later
reader.

These rules apply to anything an agent writes that lives in the repo. For now that means code and code-like files in any
language: source, scripts, config, YAML, Helm, OpenTofu, Taskfile, CSS, SQL and so on. Where a file already has a
documentation standard (for example Python docstrings under the `coding-standards` skill), that standard still applies
and the rules below govern what goes in it: inline comments and docstrings alike.

#### When to comment

Comment when the code can't explain itself: a hidden constraint, a workaround, a trade-off, or an external behaviour it
has to accommodate. Link the bug, spec or ADR when that is where the reason lives.

Skip the comment when it restates the code, or when a clearer name would make it unnecessary. Rename instead.

#### Describe the requirement, not the chat

Write what the code does or why it has to, as a fact about the code. Leave out who asked for it, what was said in the
conversation, and what the code used to be. A quick check: would the sentence still make sense if the conversation had
never happened?

| Refers to the chat (don't)         | States the requirement (do)                                       |
| ---------------------------------- | ----------------------------------------------------------------- |
| `# As the user asked, retry 3x`    | `# Upstream is briefly unavailable on deploys; retry to cover it` |
| `// Changed from 5 to 3 as agreed` | _(no comment; the value's history belongs in the commit)_         |
| `# Added to fix the earlier error` | `# Email is optional in the API response; guard against a miss`   |
| `/* New rule, as requested */`     | _(no comment needed)_                                             |

Words like "now", "no longer", "previously", "updated" and "fixed" usually mean the comment describes a change over time
rather than the code as it stands. History belongs in the commit message and PR description.

#### Match the surrounding code

Keep comment density in line with the file. If similar items (CSS variables, config keys, enum members, route entries)
mostly have no comments, don't annotate one of them, even with a reason that sounds sensible. If a group really needs
explaining, use one comment above the group. Leave existing comments and untouched code alone.
