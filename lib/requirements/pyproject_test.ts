import { assertEquals, assertRejects, assertStringIncludes, assertThrows } from "@std/assert";
import { RequirementsContext } from "../models/requirements_context.ts";
import { evaluateMarker, markerEnv, parseRequirement, pyprojectRequirements, toCondaVersionSpec } from "./pyproject.ts";

const ctx = (targetPlatform: string, noarch?: "generic" | "python") => {
  const [targetOs, targetArch] = targetPlatform.split("-");
  return RequirementsContext.parse({
    targetPlatform,
    targetOs,
    targetArch,
    unix: targetOs !== "win",
    exe: (name: string) => targetOs === "win" ? `${name}.exe` : name,
    pkgVersion: "1.0.0",
    pkgVersionRaw: "v1.0.0",
    noarch,
  });
};

const env = (targetPlatform = "linux-64", pythonVersion = "3.11") => markerEnv(ctx(targetPlatform), pythonVersion);

/**
 * Runs the whole derivation against an inline `pyproject.toml`, which is the only way to
 * exercise marker resolution - it needs the package's python range, not just one version.
 */
const derive = (
  dependencies: string[],
  opts: { python?: string; noarch?: "generic" | "python"; exclude?: string[]; extraRun?: string[] } = {},
) => {
  const pyproject = [
    "[project]",
    'requires-python = ">=3.11"',
    `dependencies = [${dependencies.map((_) => JSON.stringify(_)).join(", ")}]`,
  ].join("\n");

  return pyprojectRequirements({
    url: `data:application/toml,${encodeURIComponent(pyproject)}`,
    python: opts.python,
    exclude: opts.exclude,
    extraRun: opts.extraRun,
  })(ctx("linux-64", opts.noarch));
};

/** The derived `run` list without the leading `python` entry. */
const runDeps = async (...args: Parameters<typeof derive>) => {
  const run = (await derive(...args)).run as string[];
  return run.slice(1);
};

Deno.test("parse a bare requirement", () => {
  const r = parseRequirement("colorama");
  assertEquals(r.name, "colorama");
  assertEquals(r.specifiers, "");
  assertEquals(r.marker, undefined);
});

Deno.test("parse specifiers and markers", () => {
  const r = parseRequirement("tomli>=1.2.0; python_version<'3.11'");
  assertEquals(r.name, "tomli");
  assertEquals(r.specifiers, ">=1.2.0");
  assertEquals(r.marker, "python_version<'3.11'");
});

Deno.test("parse strips extras", () => {
  const r = parseRequirement("uvicorn[standard] >=0.30");
  assertEquals(r.name, "uvicorn");
  assertEquals(r.specifiers, ">=0.30");
});

Deno.test("direct url references are rejected", () => {
  assertThrows(() => parseRequirement("apm @ https://example.com/apm.whl"));
});

Deno.test("comma separated specifiers pass through", () => {
  assertEquals(toCondaVersionSpec(">=12,<17", "websockets"), ">=12,<17");
});

Deno.test("whitespace in specifiers is normalised", () => {
  assertEquals(toCondaVersionSpec(">= 3.1.0 , != 3.1.5", "gitpython"), ">=3.1.0,!=3.1.5");
});

Deno.test("compatible release is expanded", () => {
  assertEquals(toCondaVersionSpec("~=1.4.5", "pkg"), ">=1.4.5,<1.5");
  assertEquals(toCondaVersionSpec("~=2.2", "pkg"), ">=2.2,<3");
});

Deno.test("arbitrary equality has no conda equivalent", () => {
  assertThrows(() => toCondaVersionSpec("===1.2.3", "pkg"));
});

Deno.test("python_version markers compare numerically", () => {
  // 3.9 < 3.11 - lexical string comparison would get this backwards.
  assertEquals(evaluateMarker("python_version < '3.11'", env()), false);
  assertEquals(evaluateMarker("python_version >= '3.9'", env()), true);
  assertEquals(evaluateMarker("python_version >= '3.11'", env()), true);
  assertEquals(evaluateMarker("python_version < '3.11'", env("linux-64", "3.9")), true);
});

Deno.test("python_full_version is padded out", () => {
  assertEquals(env().python_full_version, "3.11.0");
  assertEquals(evaluateMarker("python_full_version >= '3.10.2'", env()), true);
});

Deno.test("wildcard version markers are prefix matches", () => {
  assertEquals(evaluateMarker("python_version == '3.11.*'", env()), true);
  assertEquals(evaluateMarker("python_version == '3.12.*'", env()), false);
  assertEquals(evaluateMarker("python_version != '3.12.*'", env()), true);
});

Deno.test("platform markers follow the target platform", () => {
  assertEquals(evaluateMarker("sys_platform == 'win32'", env("win-64")), true);
  assertEquals(evaluateMarker("sys_platform == 'win32'", env("linux-64")), false);
  assertEquals(evaluateMarker("platform_system == 'Darwin'", env("osx-arm64")), true);
  assertEquals(evaluateMarker("os_name == 'posix'", env("osx-arm64")), true);
  assertEquals(evaluateMarker("platform_machine == 'x86_64'", env("linux-64")), true);
  assertEquals(evaluateMarker("platform_machine == 'aarch64'", env("linux-aarch64")), true);
});

Deno.test("extras are never requested", () => {
  assertEquals(evaluateMarker("extra == 'dev'", env()), false);
});

Deno.test("boolean operators and grouping", () => {
  assertEquals(evaluateMarker("python_version >= '3.11' and sys_platform == 'linux'", env()), true);
  assertEquals(evaluateMarker("python_version < '3.11' or sys_platform == 'linux'", env()), true);
  assertEquals(evaluateMarker("python_version < '3.11' and sys_platform == 'linux'", env()), false);
  assertEquals(
    evaluateMarker("(python_version < '3.9' or python_version >= '3.11') and os_name == 'posix'", env()),
    true,
  );
});

Deno.test("in / not in operators", () => {
  assertEquals(evaluateMarker("sys_platform in 'linux darwin'", env()), true);
  assertEquals(evaluateMarker("sys_platform not in 'linux darwin'", env("win-64")), true);
});

Deno.test("an unsupported marker variable throws rather than guessing", () => {
  assertThrows(
    () => evaluateMarker("platform_release > '5.0'", env()),
    Error,
    "unsupported marker variable",
  );
});

Deno.test("an invariant-false marker is dropped", async () => {
  // The apm case: upstream gates tomli behind a python this package never runs on.
  assertEquals(
    await runDeps(["click>=8", "tomli>=1.2.0; python_version<'3.11'"]),
    ["click >=8"],
  );
});

Deno.test("an invariant-true marker is kept", async () => {
  assertEquals(
    await runDeps(["click>=8; python_version>='3.9'"]),
    ["click >=8"],
  );
});

Deno.test("a marker with no python variable is unaffected by the range", async () => {
  assertEquals(await runDeps(["click>=8; sys_platform=='linux'"]), ["click >=8"]);
  assertEquals(await runDeps(["click>=8; sys_platform=='win32'"]), []);
});

Deno.test("a marker that varies across the python range throws", async () => {
  for (const marker of ["python_version>='3.12'", "python_version<='3.11'", "python_version=='3.11'"]) {
    await assertRejects(
      () => runDeps([`click>=8; ${marker}`]),
      Error,
      "is not constant across python >=3.11",
    );
  }
});

Deno.test("the throw names both versions that disagree", async () => {
  const err = await assertRejects(() => runDeps(["click>=8; python_version>='3.12'"]));
  assertStringIncludes((err as Error).message, "true at 3.12, false at 3.11");
  assertStringIncludes((err as Error).message, "extraRun");
});

Deno.test("a ceiling can make an otherwise varying marker invariant", async () => {
  // Over [3.11, 3.14) `python_version < '3.14'` holds throughout, so it resolves cleanly.
  assertEquals(
    await runDeps(["click>=8; python_version<'3.14'"], { python: ">=3.11,<3.14" }),
    ["click >=8"],
  );
});

Deno.test("python_full_version boundaries are sampled at patch granularity", async () => {
  assertEquals(await runDeps(["click>=8; python_full_version>='3.10.5'"]), ["click >=8"]);
  await assertRejects(() => runDeps(["click>=8; python_full_version>='3.11.5'"]), Error, "not constant");
});

Deno.test("exclude wins over a marker that cannot be resolved", async () => {
  assertEquals(
    await runDeps(["click>=8; python_version>='3.12'"], { exclude: ["click"], extraRun: ["click >=8"] }),
    ["click >=8"],
  );
});

Deno.test("a platform marker resolves per platform for an arch recipe", async () => {
  assertEquals(await runDeps(["colorama; sys_platform=='linux'"]), ["colorama"]);
});

Deno.test("a platform marker throws for a noarch recipe", async () => {
  await assertRejects(
    () => runDeps(["colorama; sys_platform=='win32'"], { noarch: "python" }),
    Error,
    "cannot carry a platform conditional dependency",
  );
});

Deno.test("a python marker is still resolvable for a noarch recipe", async () => {
  assertEquals(
    await runDeps(["tomli>=1.2.0; python_version<'3.11'"], { noarch: "python" }),
    [],
  );
});
