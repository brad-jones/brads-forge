import { load } from "@std/dotenv";
import { Command } from "@cliffy/command";
import { PrefixClient } from "lib/prefix_client/mod.ts";
import { Platform } from "lib/models/platform.ts";

await load({ envPath: `${import.meta.dirname}/../.env`, export: true });

await new Command()
  .name("prefix-delete")
  .description("Deletes packages from prefix.dev")
  .option("--channel <channel:string>", "Channel name", { required: true })
  .option("--platform <platform:string>", "Platform name", { required: true })
  .option("--filename <filename:string>", "Package file name", { required: true })
  .action(async ({ channel, platform, filename }) => {
    await new PrefixClient().deletePackage({
      channel,
      filename,
      platform: Platform.parse(platform),
    });
  })
  .parse(Deno.args);
