#!/usr/bin/env -S deno run -qA --ext=ts
import { Command } from "@cliffy/command";
import { $ } from "@david/dax";

await new Command()
  .name("sync-gha-pixi-version")
  .action(async () => {
    // NB: We assume this script has been run directly after running `pixi self-update`.

    // Read the current version of Pixi from `pixi --version` (eg: pixi 0.69.0)
    const versionOutput = await $`pixi --version`.text();
    const match = versionOutput.trim().match(/^pixi\s+(\d+\.\d+\.\d+)/);
    if (!match) {
      throw new Error(`Could not parse pixi version from: ${versionOutput}`);
    }
    const version = match[1];
    const versionTag = `v${version}`;

    // Update all GHA workflows in `.github/workflows` to use that version of Pixi
    for await (const entry of $.path(".github/workflows").readDir()) {
      if (!entry.isFile) continue;
      const file = entry.path;
      const ext = file.extname();
      if (ext !== ".yaml" && ext !== ".yml") continue;

      const original = await file.readText();
      const updated = original.replace(
        /pixi-version:\s*v\d+\.\d+\.\d+/g,
        `pixi-version: ${versionTag}`,
      );
      if (updated !== original) {
        await file.writeText(updated);
        console.log(`updated pixi version in ${file} to ${versionTag}`);
      }
    }
  })
  .parse();
