import { z } from "zod";

const BaseScript = z.object({
  /**
   * The interpreter to use for the script.
   * Defaults to bash on unix and cmd.exe on Windows.
   */
  interpreter: z.string().optional(),

  /**
   * The script environment.
   *
   * You can use Jinja to pass through environments variables
   * with the env object (e.g. ${{ env.get("MYVAR") }}).
   */
  env: z.record(z.string()).optional(),

  /**
   * Secrets that are set as environment variables
   * but never shown in the logs or the environment.
   */
  secrets: z.array(z.string()).optional(),
});

export const FileScript = BaseScript.extend({
  /**
   * The file to use as the script.
   *
   * Automatically adds the bat or sh to the filename on Windows
   * or Unix respectively (if no file extension is given).
   */
  file: z.string(),
});

export const ContentScript = BaseScript.extend({
  /**
   * A string or list of strings that is the scripts contents.
   */
  content: z.union([z.string(), z.array(z.string())]),
});

export const Script = z.union([FileScript, ContentScript]);
