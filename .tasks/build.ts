import { $ } from "@david/dax";
import { commonPlatforms } from "lib/mod.ts";

const forgeDir = import.meta.resolve("../forge").replace("file://", "");

for (const platform of [...commonPlatforms, "win-32"]) {
  await $`rattler-build build --recipe-dir ${forgeDir} --test=native --target-platform ${platform}`;
}
