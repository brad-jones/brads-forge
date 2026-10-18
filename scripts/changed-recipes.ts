#!/usr/bin/env -S deno run -qA --ext=ts
import { Command } from "@cliffy/command";
import { $ } from "@david/dax";
import { exists } from "@std/fs";

await new Command()
  .name("changed-recipes")
  .description("Lists the recipes added or edited between a base ref and HEAD, as a JSON array of recipe.ts paths.")
  .option("--base <base:string>", "Git ref to compare HEAD against.", { required: true })
  .option("--forge-dir <forgeDir:string>", "Directory recipes live in.", { default: "forge" })
  .action(async ({ base, forgeDir }) => {
    const diff = await $`git diff --name-only --diff-filter=d ${base}...HEAD -- ${forgeDir}`.lines();

    // A recipe is a `<forgeDir>/<domain>/<name>/recipe.ts` & everything beside it is part of that recipe.
    const recipes = new Set<string>();
    for (const file of diff) {
      const parts = file.split("/");
      if (parts.length < 4) continue;
      const recipe = `${parts.slice(0, 3).join("/")}/recipe.ts`;
      if (await exists(recipe)) recipes.add(recipe);
    }

    const json = JSON.stringify([...recipes].sort());
    console.log(json);

    const out = Deno.env.get("GITHUB_OUTPUT");
    if (out) await Deno.writeTextFile(out, `recipes=${json}\n`, { append: true });
  })
  .parse();
