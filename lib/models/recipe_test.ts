import { assertEquals, assertRejects } from "@std/assert";
import { z } from "zod";
import { Recipe, RecipeExecCtx } from "./recipe.ts";
import { RecipeProps } from "./recipe_props.ts";

const execCtx: RecipeExecCtx = {
  recipeTsPath: "/forge/recipe.ts",
  denoConfigPath: "/deno.json",
  denoDir: "/deno",
};

const source = (url: string) => [{ url, sha256: "0".repeat(64) }];

const recipe = (props: Partial<z.input<typeof RecipeProps>> = {}) =>
  new Recipe({
    name: "foo",
    version: () => Promise.resolve({ raw: "v1.0.0", semver: "1.0.0" }),
    sources: () => ({
      "linux-64": { gnu: source("https://x/gnu"), musl: source("https://x/musl") },
      "osx-arm64": source("https://x/osx"),
    }),
    variants: { gnu: {}, musl: { downPrioritize: 1 } },
    build: { number: 2 },
    ...props,
  });

Deno.test("variants are inferred from the sources keyed by variant", async () => {
  const r = recipe();
  assertEquals(await r.getVariants("linux-64"), ["gnu", "musl"]);
  assertEquals(await r.getVariants("osx-arm64"), []);
  assertEquals(await r.getPlatforms(), ["linux-64", "osx-arm64"]);
});

Deno.test("a variant is mapped with its own sources, build string & priority", async () => {
  const r = recipe({
    requirements: ({ variant }) => ({ run: variant === "gnu" ? ["__glibc >=2.17"] : [] }),
  });

  const musl = await r.toObject("linux-64", undefined, "musl");
  assertEquals(musl.source, source("https://x/musl"));
  assertEquals(musl.build?.string, "musl_h${{ hash }}_${{ build_number }}");
  assertEquals(musl.build?.variant?.down_prioritize_variant, 1);
  assertEquals(musl.requirements?.run, []);

  const gnu = await r.toObject("linux-64", undefined, "gnu");
  assertEquals(gnu.source, source("https://x/gnu"));
  assertEquals(gnu.build?.string, "gnu_h${{ hash }}_${{ build_number }}");
  assertEquals(gnu.build?.variant, undefined);
  assertEquals(gnu.requirements?.run, ["__glibc >=2.17"]);

  const osx = await r.toObject("osx-arm64");
  assertEquals(osx.source, source("https://x/osx"));
  assertEquals(osx.build?.string, undefined);
});

Deno.test("build & test funcs are told which variant they run for", async () => {
  const r = recipe({
    build: { number: 0, func: () => Promise.resolve() },
    tests: { func: () => Promise.resolve() },
  });

  for (const variant of ["gnu", "musl"]) {
    const mapped = await r.toObject("linux-64", execCtx, variant);
    const buildScript = (mapped.build?.script as string[])[0];
    const testScript = (mapped.tests as { script: string; requirements: { build: string[] } }[])[0];
    assertEquals(buildScript.endsWith(`--variant ${variant}`), true);
    assertEquals(testScript.script.endsWith(`--variant ${variant}`), true);
    assertEquals(testScript.requirements.build, [`deno=${Deno.version.deno}`]);
  }

  const osx = await r.toObject("osx-arm64", execCtx);
  assertEquals((osx.build?.script as string[])[0].includes("--variant"), false);
});

Deno.test("a variant can name its platforms when the sources are not platform mapped", async () => {
  const r = recipe({
    sources: () => source("https://x/src.tar.gz")[0],
    variants: { gnu: { platforms: ["linux-64"] }, musl: { platforms: ["linux-64"] } },
  });
  assertEquals(await r.getVariants("linux-64"), ["gnu", "musl"]);
  assertEquals(await r.getVariants("win-64"), []);
});

Deno.test("a variant without platforms is built everywhere when the sources are not platform mapped", async () => {
  const r = recipe({
    sources: () => source("https://x/src.tar.gz")[0],
    variants: { a: {}, b: { platforms: ["linux-64"] } },
  });
  assertEquals(await r.getVariants("linux-64"), ["a", "b"]);
  assertEquals(await r.getVariants("win-64"), ["a"]);
});

Deno.test("a platform with variants can not be mapped without one", async () => {
  await assertRejects(() => recipe().toObject("linux-64"), Error, "built as the variants [gnu, musl]");
  await assertRejects(() => recipe().toObject("linux-64", undefined, "glibc"), Error, `not "glibc"`);
  await assertRejects(() => recipe().toObject("osx-arm64", undefined, "gnu"), Error, `not "gnu"`);
});

Deno.test("sources keyed by an undeclared variant are rejected", async () => {
  const r = recipe({ variants: { gnu: {} } });
  await assertRejects(() => r.getVariants("linux-64"), Error, "keyed by [gnu, musl]");
});

Deno.test("a recipe with variants needs a single target platform", async () => {
  await assertRejects(() => recipe().toObject(), Error, "single target platform");
});

Deno.test("a recipe with variants can not set its own build string", async () => {
  const r = recipe({ build: { number: 0, string: "custom" } });
  await assertRejects(() => r.toObject("linux-64", undefined, "gnu"), Error, "build.string");
});
