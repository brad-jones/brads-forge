import { load } from "@std/dotenv";
import ky from "ky";
import { Command } from "@cliffy/command";

await load({ envPath: `${import.meta.dirname}/../.env`, export: true });

await new Command()
  .name("prefix-delete")
  .description("Deletes packages from prefix.dev")
  .option("--channel <channel:string>", "Channel name", { required: true })
  .option("--platform <platform:string>", "Platform name", { required: true })
  .option("--filename <filename:string>", "Package file name", { required: true })
  .action(async ({ channel, platform, filename }) => {
    await ky.delete(`https://prefix.dev/api/v1/delete/${channel}/${platform}/${filename}`, {
      headers: { "Authorization": `Bearer ${Deno.env.get("PREFIX_TOKEN")}` },
      timeout: 120 * 1000,
    });
  })
  .parse(Deno.args);
