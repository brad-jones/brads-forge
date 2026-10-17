import { fromFileUrl, join } from "@std/path";
import { parse, stringify } from "@std/yaml";
import { contextOutput, loadMemoryOutput, memoryEntities, selectMemory } from "./memory-session-start.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

Deno.test("memoryEntities loads the explicit user and scoped project without inferring identity", () => {
  assertEquals(memoryEntities("repo", "/repo", "/repo/projects/parser/src", "default_user"), [
    "default_user",
    "repo",
    "repo/projects/parser",
  ]);
  assertEquals(memoryEntities("repo", "/repo", "/repo/projects/parser", "selected_user"), [
    "selected_user",
    "repo",
    "repo/projects/parser",
  ]);
});

Deno.test("memoryEntities does not load a project from outside the repository", () => {
  assertEquals(memoryEntities("repo", "/repo", "/other/projects/parser", "default_user"), ["default_user", "repo"]);
  assertEquals(memoryEntities("repo", "/repo", "/repo", "default_user"), ["default_user", "repo"]);
});

Deno.test("contextOutput supports Copilot CLI and Claude / VS Code Local output contracts", () => {
  const output = contextOutput("stored observations");
  assertEquals(output.additionalContext, "stored observations");
  assertEquals(output.hookSpecificOutput, { hookEventName: "SessionStart", additionalContext: "stored observations" });
});

Deno.test("contextOutput makes retrieval failure visible to both the user and model", () => {
  assertEquals(contextOutput("not loaded", "not loaded"), {
    additionalContext: "not loaded",
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: "not loaded" },
    systemMessage: "not loaded",
  });
});

Deno.test("selectMemory selects exact topic ownership and scope, deduplicates and orders the graph", () => {
  const names = memoryEntities("repo", "/repo", "/repo/projects/parser/src", "default_user");
  const included = [
    "default_user/topics/shell",
    "default_user/topics/mcp/github",
    "default_user/repositories/repo/topics/workflow",
    "default_user/repositories/repo/projects/parser/topics/editor",
  ];
  const excluded = [
    "other_user/topics/shell",
    "default_user2/topics/shell",
    "DEFAULT_USER/topics/shell",
    "default_user/repositories/other/topics/shell",
    "default_user/repositories/repo2/topics/shell",
    "default_user/repositories/repo/projects/other/topics/editor",
    "default_user/repositories/repo/projects/parser2/topics/editor",
    "default_user/topics/",
    "default_user/topics/shell/../workflow",
    "default_user/topics/shell//fish",
    "default_user/topics/Shell",
    "unrelated",
  ];
  const roots = names.map((name) => ({ name, entityType: "user", observations: [] }));
  const topics = [...included, ...excluded].map((name) => ({
    name,
    entityType: "local_context",
    observations: ["Substring search match default_user/"],
  }));
  topics.push({ name: "default_user/topics/wrong-type", entityType: "tool", observations: [] });
  const relation = { from: "default_user", to: included[0], relationType: "has_context" };
  const graphs = [
    { entities: roots, relations: [relation] },
    {
      entities: [...topics, ...roots],
      relations: [relation, { ...relation, to: excluded[0] }],
    },
  ];
  const selected = selectMemory(graphs, names, "default_user");
  assertEquals(selected.entities.map((entity) => entity.name), [...names, ...included.sort()]);
  assertEquals(selected.relations, [relation]);
  assertEquals(selectMemory([...graphs].reverse(), names, "default_user"), selected);
  const rootNames = memoryEntities("repo", "/repo", "/repo", "default_user");
  assertEquals(
    selectMemory(graphs, rootNames, "default_user").entities.map((entity) => entity.name),
    [...rootNames, ...included.filter((name) => !name.includes("/projects/"))],
  );
  assertEquals(selectMemory(graphs, ["selected_user", "repo"], "selected_user").entities.map((entity) => entity.name), [
    "repo",
  ]);
  const nestedNames = memoryEntities("repo", "/repo", "/repo/components/projects/parser/src", "default_user");
  const nestedTopic = {
    name: "default_user/repositories/repo/components/projects/parser/topics/editor",
    entityType: "local_context",
    observations: [],
  };
  assertEquals(selectMemory([{ entities: [nestedTopic], relations: [] }], nestedNames, "default_user").entities, [
    nestedTopic,
  ]);
});

Deno.test("loadMemory rejects failed topic retrieval rather than claiming complete startup context", async () => {
  const root = await Deno.makeTempDir();
  try {
    const serverPath = `${root}/server.ts`;
    await Deno.writeTextFile(
      serverPath,
      `import { Server } from "@modelcontextprotocol/sdk/server/index.js";
    import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
    import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({ name: "synthetic-memory", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(CallToolRequestSchema, async (request) => request.params.name === "open_nodes"
  ? { content: [{ type: "text", text: JSON.stringify({ entities: [{ name: "default_user", entityType: "user", observations: [] }], relations: [] }) }] }
  : { isError: true, content: [{ type: "text", text: "Synthetic topic lookup failure" }] });
await server.connect(new StdioServerTransport());
`,
    );
    await Deno.writeTextFile(
      `${root}/apm.yml`,
      stringify({
        name: "repo",
        dependencies: {
          mcp: [{
            name: "workspace-memory",
            transport: "stdio",
            command: Deno.execPath(),
            args: ["run", "--config", fromFileUrl(new URL("../deno.json", import.meta.url)), "-A", serverPath],
          }],
        },
      }),
    );
    const output = await loadMemoryOutput(root, root, "default_user");
    if (!output.systemMessage?.includes("Memory server search_nodes failed")) {
      throw new Error(`Expected explicit topic lookup failure, received ${output.systemMessage}`);
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("loadMemoryOutput cancels an unresponsive server within its total deadline", async () => {
  const root = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(
      join(root, "server.ts"),
      `
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({ name: "synthetic-stalled-memory", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(CallToolRequestSchema, () => new Promise(() => {}));
await server.connect(new StdioServerTransport());
`,
    );
    await Deno.writeTextFile(
      join(root, "apm.yml"),
      stringify({
        name: "repo",
        dependencies: {
          mcp: ["workspace-memory", "user-memory"].map((name) => ({
            name,
            transport: "stdio",
            command: Deno.execPath(),
            args: [
              "run",
              "--config",
              fromFileUrl(new URL("../deno.json", import.meta.url)),
              "-A",
              join(root, "server.ts"),
            ],
          })),
        },
      }),
    );
    const start = performance.now();
    const output = await loadMemoryOutput(root, root, "default_user", 300);
    if (performance.now() - start > 3_000) throw new Error("Deadline or transport cleanup took too long");
    if (!output.systemMessage?.includes("workspace-memory") || !output.systemMessage.includes("user-memory")) {
      throw new Error("Timeouts must identify both failed stores");
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("memory hook is a no-op in remote sessions and never starts the memory servers", async () => {
  const root = await Deno.makeTempDir();
  try {
    // An unresolvable server command makes any attempt to load memory surface as a warning.
    await Deno.writeTextFile(
      join(root, "apm.yml"),
      stringify({
        name: "repo",
        dependencies: {
          mcp: [{ name: "workspace-memory", transport: "stdio", command: "dx-does-not-exist" }],
        },
      }),
    );
    const child = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--config",
        fromFileUrl(new URL("../deno.json", import.meta.url)),
        "-A",
        fromFileUrl(new URL("./memory-session-start.ts", import.meta.url)),
      ],
      cwd: root,
      env: { CLAUDE_CODE_REMOTE: "true", PIXI_PROJECT_ROOT: root },
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(JSON.stringify({ cwd: root })));
    await writer.close();
    const output = await child.output();
    if (!output.success) throw new Error(new TextDecoder().decode(output.stderr));
    assertEquals(JSON.parse(new TextDecoder().decode(output.stdout)), {});
    assertEquals(new TextDecoder().decode(output.stderr), "");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("remember metadata retains explicit invocation and parses its destination regression cases", async () => {
  const text = await Deno.readTextFile(new URL("../.apm/skills/remember/SKILL.md", import.meta.url));
  const metadata = parse(text.split("---")[1]) as Record<string, unknown>;
  assertEquals(metadata.name, "remember");
  assertEquals(metadata["user-invocable"], true);
  assertEquals(metadata["disable-model-invocation"], true);
  if (typeof metadata.description !== "string" || !metadata.description.includes("workspace-memory")) {
    throw new Error("Missing dual-store skill description");
  }
  const evals = JSON.parse(
    await Deno.readTextFile(new URL("../.apm/skills/remember/evals/evals.json", import.meta.url)),
  );
  assertEquals(evals.skill_name, "remember");
  assertEquals(evals.evals.length, 12);
});
