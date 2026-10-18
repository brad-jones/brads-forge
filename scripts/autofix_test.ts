import { assertEquals } from "@std/assert";
import { parseGroupName, parseLog, parseTurnMarkers, recipeDirFromTitle } from "./autofix.ts";

const dirs = new Set(["github.com/go-task/task", "github.com/mvdan/sh/gosh", "github.com/acme/forge"]);

Deno.test("recipeDirFromTitle maps runner paths from every OS back to the recipe", () => {
  assertEquals(
    recipeDirFromTitle("/home/runner/work/brads-forge/brads-forge/forge/github.com/go-task/task/recipe.ts", dirs),
    "github.com/go-task/task",
  );
  assertEquals(
    recipeDirFromTitle("D:\\a\\brads-forge\\brads-forge\\forge\\github.com\\mvdan\\sh\\gosh\\recipe.ts", dirs),
    "github.com/mvdan/sh/gosh",
  );
  assertEquals(
    recipeDirFromTitle("/Users/runner/work/brads-forge/brads-forge/forge/github.com/acme/forge/recipe.ts", dirs),
    "github.com/acme/forge",
  );
});

Deno.test("recipeDirFromTitle ignores titles that are not known recipes", () => {
  assertEquals(recipeDirFromTitle("/w/forge/github.com/gone/away/recipe.ts", dirs), undefined);
  assertEquals(recipeDirFromTitle("Process completed with exit code 1.", dirs), undefined);
});

Deno.test("parseGroupName splits the recipe from the platform", () => {
  assertEquals(parseGroupName("github.com/go-task/task-win-arm64", dirs), {
    dir: "github.com/go-task/task",
    platform: "win-arm64",
  });
  assertEquals(parseGroupName("github.com/mvdan/sh/gosh-linux-64", dirs), {
    dir: "github.com/mvdan/sh/gosh",
    platform: "linux-64",
  });
  assertEquals(parseGroupName("Running build script", dirs), undefined);
  assertEquals(parseGroupName("github.com/go-task/task-nope-64", dirs), undefined);
});

Deno.test("parseLog attributes errors to the recipe build that raised them", () => {
  const log = [
    "\uFEFF2026-10-18T03:30:00.0000000Z ##[group]github.com/go-task/task-linux-64",
    "2026-10-18T03:30:01.0000000Z Created forge/github.com/go-task/task/generated/linux-64/3.0.0-0",
    "2026-10-18T03:30:02.0000000Z ##[group]Running build script",
    "2026-10-18T03:30:03.0000000Z \x1b[31mcurl: (22) 404\x1b[0m",
    "2026-10-18T03:30:04.0000000Z ##[endgroup]",
    "2026-10-18T03:30:05.0000000Z ##[error]recipe failed to cook",
    "2026-10-18T03:30:06.0000000Z ##[endgroup]",
    "2026-10-18T03:30:07.0000000Z ##[group]github.com/mvdan/sh/gosh-linux-64",
    "2026-10-18T03:30:08.0000000Z Skipping, variant already published",
    "2026-10-18T03:30:09.0000000Z ##[endgroup]",
    "2026-10-18T03:30:10.0000000Z ##[error]Process completed with exit code 1.",
  ].join("\r\n");

  const sections = parseLog(log, dirs);
  assertEquals(sections.map((_) => [_.dir, _.platform, _.errors]), [
    ["github.com/go-task/task", "linux-64", ["recipe failed to cook"]],
    ["github.com/mvdan/sh/gosh", "linux-64", []],
  ]);
  assertEquals(sections[0].lines.includes("curl: (22) 404"), true);
});

Deno.test("parseLog ignores the runner's step failure when a group was left open", () => {
  const log = [
    "##[group]github.com/go-task/task-osx-arm64",
    "##[group]Running build script",
    "##[error]recipe failed to cook",
    "##[endgroup]",
    "##[error]Process completed with exit code 1.",
  ].join("\n");
  assertEquals(parseLog(log, dirs).map((_) => _.errors), [["recipe failed to cook"]]);
});

Deno.test("parseTurnMarkers only trusts markers the workflow posted", () => {
  const marker = (turn: number, sha: string) => `<!-- autofix:turn=${turn} responded-to=${sha} -->\nTurn ${turn}`;
  assertEquals(
    parseTurnMarkers([
      { body: marker(1, "none"), user: { login: "github-actions[bot]" } },
      { body: "Looks good", user: { login: "brad-jones" } },
      { body: marker(2, "abc123"), user: { login: "github-actions[bot]" } },
      { body: marker(3, "def456"), user: { login: "claude[bot]" } },
    ]),
    [{ turn: 1, respondedTo: "none" }, { turn: 2, respondedTo: "abc123" }],
  );
});
