import { assertEquals } from "@std/assert";
import { PrefixClient } from "./mod.ts";

const published = [
  { filename: "foo-1.0.0-gnu_habc_2.conda", platform: "linux-64", version: "1.0.0", buildNumber: 2 },
  { filename: "foo-1.0.0-hdef_2.conda", platform: "osx-arm64", version: "1.0.0", buildNumber: 2 },
];

async function withPublished<T>(fn: (client: PrefixClient) => Promise<T>): Promise<T> {
  const fetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      Response.json({ data: { package: { variants: { current: 0, pages: 1, page: published } } } }),
    );
  try {
    return await fn(new PrefixClient({ token: "t", gqlBaseUrl: "https://prefix.test/graphql" }));
  } finally {
    globalThis.fetch = fetch;
  }
}

Deno.test("variantExists matches a build variant on the build string", async () => {
  const exists = (buildVariant?: string) =>
    withPublished((_) =>
      _.variantExists({ name: "foo", version: "1.0.0", platform: "linux-64", buildNo: 2, buildVariant })
    );
  assertEquals(await exists("gnu"), true);
  assertEquals(await exists("musl"), false);
  assertEquals(await exists(), true);
});

Deno.test("variantExists still matches a package without a build variant", async () => {
  const exists = await withPublished((_) =>
    _.variantExists({ name: "foo", version: "1.0.0", platform: "osx-arm64", buildNo: 2 })
  );
  assertEquals(exists, true);
});
