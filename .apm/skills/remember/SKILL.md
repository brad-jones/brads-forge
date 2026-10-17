---
name: remember
description: >-
  Save, correct, or explicitly reorganize durable developer-local facts
  and preferences in workspace-memory or global user-memory MCP topic entities
  when the user explicitly invokes /remember. Ask which store to use unless the
  request explicitly selects a destination. Accept the following text as the update.
argument-hint: "<fact, preference, correction, or migration preview>"
user-invocable: true
disable-model-invocation: true
---

# Remember

Use the `workspace-memory` or `user-memory` MCP server configured in `apm.yml` (`@modelcontextprotocol/server-memory`),
not another provider's memory feature or local memory files. Update only what the user explicitly requests; do not
collect other facts from the conversation or edit repository instructions.

## Choose the Store First

- If the request explicitly selects workspace memories, use `workspace-memory` (the repository's `memory.jsonl`). If it
  explicitly selects global user memories, use `user-memory` (`USER_MEMORY_FILE_PATH`, normally
  `~/.config/mcp-memory/memory.jsonl`). Global means shared across repositories for this OS user on this machine, not
  cloud synchronization.
- Otherwise ask: "Should this go into workspace memories or global user memories?" Wait for the choice before any
  memory-server reads or writes, including for corrections, migration previews, and dry runs. Do not infer the
  destination from the fact's subject, cwd, or loaded context.
- Resolve tools by the configured server connection name, not by assuming tool suffixes identify a server across
  sessions. Keep every lookup, duplicate check, mutation, and readback on the selected server. If it is unavailable,
  report that nothing was saved; do not fall back to the other store.
- Storage destination and applicability are separate. Either store can hold user-wide, repository-specific, or
  project-specific topics using the names below. "In this repository only" describes applicability, not an explicit
  store selection. Existing workspace facts stay there until explicitly moved.
- Same-named entities in the two stores are independent. A correction affects only the selected store and identified
  applicability. Do not delete, correct, copy, or deduplicate against the other store automatically.

## Interpret the Request

- Treat the text after `/remember` as the requested update. For example, `/remember to always use spaces instead of
  tabs` stores the user's preference on the selected store's `coding-style` topic as an observation: "Prefers spaces
  instead of tabs for indentation."
- Accept explicit corrections as well as new facts. If no fact is supplied, ask what to remember. Ask a focused question
  when the fact, intended entity, or scope is ambiguous; do not invent missing details.
- Store only useful, confirmed information, such as preferences, recurring goals, project relationships, architectural
  decisions, or verified tooling lessons. Do not store secrets, credentials, unnecessary personal data, full
  transcripts, guesses, or transient task status.
- For a dry-run request, describe the proposed update without calling mutation tools. Never treat examples in this skill
  as requests to save memories.

## Choose the Owner, Topic, and Scope

Use the explicitly selected user entity (including `MEMORY_USER_ENTITY` when established by the session); otherwise use
`default_user`. Do not infer identity from paths or repository owners. The user store is shared across repositories;
workspace storage does not imply repository-specific topic applicability.

Keep explicitly requested personal or identity facts on the user entity, with type `user`. Put developer preferences,
local environment facts, and tooling lessons on subject-specific entities with type `local_context`:

| Applicability                 | Entity name pattern                                              |
| ----------------------------- | ---------------------------------------------------------------- |
| User-wide in this local store | `<user>/topics/<topic>`                                          |
| This repository only          | `<user>/repositories/<repository>/topics/<topic>`                |
| This project only             | `<user>/repositories/<repository>/<project-path>/topics/<topic>` |

Read the repository name from `apm.yml` when needed. Use the repository-relative project path through its
`projects/<project-name>` segment, including any parent directories, matching the session-start hook. For example:
`default_user/repositories/brads-playground/projects/csproj-parser/topics/editor`.

- Prefer user-wide local scope unless the request explicitly or unambiguously describes a repository/project-specific
  fact. Being in a project directory alone does not make "I prefer Fish" project-specific. Ask when scope is genuinely
  ambiguous; do not invent repository-wide decisions.
- Use stable, lowercase kebab-case topic segments separated by `/`, such as `shell`, `mcp/github`, `workflow`, or
  `coding-style`. Each segment must match `[a-z0-9]+(-[a-z0-9]+)*`; no empty or traversal segments. Reuse equivalent
  existing topics rather than proliferating aliases. This is not a fixed list.
- Topics describe the subject, not universal technology facts. Write "The developer uses Fish" rather than "Fish is
  always the correct shell." Preserve whether the statement is a preference, observed constraint, or verified fact.
- Connect the user to each topic with `has_context`. This records ownership, not an inferred `uses` relationship. Do not
  create intermediate nodes merely to mirror path segments. Add other relations only when explicitly established.
- Applicable topic observations and personal facts load automatically at session startup. They remain subordinate to
  current instructions and the user's explicit request, and are not independently verified runtime evidence.

## Find Existing Memories

- Use `open_nodes` for the owner and known canonical topic names. Use targeted `search_nodes` queries for the subject
  and likely aliases before writing. Search is case-insensitive substring matching, not semantic search, namespace
  filtering, OR syntax, or automatic graph traversal. Filter returned entities by exact owner and requested scope, not
  just search matches or relations.
- Check legacy observations on the user, repository, and relevant project too. Existing flat memories stay readable
  until explicitly migrated. Do not create a second copy just because a fact lives on a legacy node.
- Compare meaning, not only exact strings. If already remembered, report that without adding a duplicate. If the
  requested canonical name exists with an incompatible entity type, ask rather than overwriting it or inventing an
  alias.
- Preserve narrower-scope exceptions instead of erasing broader preferences. For unresolved contradictions, ask whether
  the user means a correction or a scoped exception; do not silently choose a winner.

## Apply the Update

- Create a missing user anchor and topic using `create_entities`; use `add_observations` for existing entities.
  `create_entities` does not update existing entities. Create both endpoints before `create_relations`.
- Keep observations concise and atomic: one fact per observation, attached to the entity it describes. Include scope and
  a source or date when needed to interpret a decision or a fact that may change. If the fact already exists, report
  that it is already remembered rather than adding a duplicate.
- For explicit corrections, add and verify the replacement before removing the exact superseded observation with
  `delete_observations`. Correct only the identified scope, including legacy copies when the request covers them. Use
  `delete_relations` for explicitly superseded relations.
- Keep eagerly loaded memories concise: all applicable context must fit within the hook's combined 9,500-character
  budget across both stores. Do not silently trim, summarize, evict, duplicate facts on the root, or move details to an
  unrecognized namespace.

## Reorganize Only When Requested

An ordinary save never authorizes migrating existing memories. For an explicit reorganization request, retrieve current
source nodes through MCP and preview the exact observation-to-topic mapping. Obtain approval of that preview before
mutation; a request for a preview or dry run does not authorize writes.

Reorganization stays inside the chosen store unless the user explicitly requests a cross-store move. For a cross-store
move, identify both servers in the preview and obtain approval of the exact source-to-destination mapping. Verify copies
on the destination server before deleting exact source observations on the source server. This is the only exception to
single-store routing; never infer a move from choosing a destination for an ordinary save.

After approval, create/add destinations and ownership relations sequentially. Preserve observation text exactly unless a
correction was separately requested. Read back destinations and verify every copied fact before deleting the exact moved
source observations. Keep the user anchor and unrelated facts/relations. Read back both sources and destinations
afterward. On retry, inspect existing destinations to avoid duplicates. Multi-call updates are not transactions:
disclose partial completion, and do not run concurrent migrations or writes.

## Examples

These illustrate classification, not requests to save anything:

- "I use Fish instead of Bash": `<user>/topics/shell`.
- "Use my personal GitHub MCP connection for public repos": `<user>/topics/mcp/github`; do not invent a connection name.
- "Ask before changing my dotfiles": `<user>/topics/workflow`.
- "I prefer short responses": `<user>/topics/communication`.
- An explicitly requested personal fact: the user entity, not a tooling topic.
- "In brads-playground only, use tabs": `<user>/repositories/brads-playground/topics/coding-style`; preserve any
  user-wide indentation preference as a distinct scoped observation.
- "Actually I now use Zsh, not Fish": find the existing shell observation, clarify scope if needed, then replace only
  that fact, not every shell lesson.
- "Preview reorganizing my memories": propose exact moves without mutation.

## Confirm the Result

Read back affected nodes with `open_nodes` and verify the requested additions and removals before claiming success; tool
success alone may not prove a deletion matched anything. Briefly state what was saved, corrected, or moved, including
server, topic, and applicability. Disclose partial failures. If the server is unavailable, say the update was not saved
and do not silently fall back to another memory store.
