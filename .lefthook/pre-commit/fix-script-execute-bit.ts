#!/usr/bin/env -S deno run -qA --ext=ts
import { $ } from "@david/dax";

await Promise.all(
  (await $`git ls-files --stage`.lines())
    .filter((line) => line.includes("scripts/") || line.includes(".lefthook/"))
    .filter((line) => line.startsWith("100644"))
    .map((line) => line.match(/\d+\s[a-z0-9]+\s\d\s+(.*)/)?.at(1))
    .filter((match) => typeof match === "string")
    .map((file) => file as string)
    .map((file) =>
      Deno.build.os === "windows"
        // dprint-ignore
        ? $`git update-index --add --chmod=+x ${file}`
        : Deno.chmod(file, 0o755)
    ),
);
