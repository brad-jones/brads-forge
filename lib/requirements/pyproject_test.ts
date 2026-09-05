import { assertEquals, assertThrows } from "@std/assert";
import { RequirementsContext } from "../models/requirements_context.ts";
import { evaluateMarker, markerEnv, parseRequirement, toCondaVersionSpec } from "./pyproject.ts";

const ctx = (targetPlatform: string) => {
  const [targetOs, targetArch] = targetPlatform.split("-");
  return RequirementsContext.parse({
    targetPlatform,
    targetOs,
    targetArch,
    unix: targetOs !== "win",
    exe: (name: string) => targetOs === "win" ? `${name}.exe` : name,
    pkgVersion: "1.0.0",
    pkgVersionRaw: "v1.0.0",
  });
};

const env = (targetPlatform = "linux-64", python = ">=3.11") => markerEnv(ctx(targetPlatform), python);

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
  assertEquals(evaluateMarker("python_version < '3.11'", env("linux-64", ">=3.9")), true);
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
