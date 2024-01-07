import { Digest } from "./mod.ts";
import { assertEquals } from "https://deno.land/std@0.211.0/assert/mod.ts#^";

Deno.test("basic equality", () => {
  const d1 = new Digest(["SHA-256", "abc123"]);
  const d2 = new Digest(["SHA-256", "abc123"]);
  assertEquals(d1.equals(d2), true);
});

Deno.test("parse web crypto name", () => {
  const d1 = Digest.parse("SHA-256:abc123");
  const d2 = new Digest(["SHA-256", "abc123"]);
  assertEquals(d1.equals(d2), true);
});

Deno.test("parse oci name", () => {
  const d1 = Digest.parse("sha256:abc123");
  const d2 = new Digest(["SHA-256", "abc123"]);
  assertEquals(d1.equals(d2), true);
});

Deno.test("verify", async () => {
  const d = await Digest.fromString("abc");
  assertEquals(
    d.hashString,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  assertEquals(await d.verifyString("abc"), true);
});
