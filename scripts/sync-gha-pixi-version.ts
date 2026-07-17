#!/usr/bin/env -S deno run -qA --ext=ts
import { Command } from "@cliffy/command";
import { $ } from "@david/dax";
import { exists } from "@std/fs";

const DIFF_FILE = "diff.md";

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
    let versionChanged = false;
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
        await file.write(updated);
        console.log(`updated pixi version in ${file} to ${versionTag}`);
        versionChanged = true;
      }
    }

    // When run as part of the `update` GitHub Actions workflow, a `diff.md` file
    // is generated from `pixi update --json` to describe the lockfile changes in
    // the resulting PR. If that file exists and the pinned Pixi version actually
    // changed, append a note about the Pixi self-update so it's reflected in the PR body too.
    if (versionChanged && await exists(DIFF_FILE)) {
      const diff = await Deno.readTextFile(DIFF_FILE);
      const note = `\n## Pixi\n\nUpdated Pixi to \`${versionTag}\`.\n`;
      await Deno.writeTextFile(DIFF_FILE, diff + note);
      console.log(`updated ${DIFF_FILE} with Pixi self-update note`);
    }
  })
  .parse();
