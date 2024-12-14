import { path, ensureDir } from "lib/mod.ts";

/**
 * These variables will be made available upon environment activation.
 * Made possible via $PREFIX/etc/conda/env_vars.d
 *
 * @see https://github.com/conda/conda/issues/6820
 * @see https://github.com/conda/conda-build/issues/5035
 */
export async function addEnvVars(vars: Record<string, string>) {
  const prefix = Deno.env.get("PREFIX");
  if (!prefix) throw new Error(`PREFIX not set`);

  const pkgName = Deno.env.get("PKG_NAME");
  if (!pkgName) throw new Error(`PKG_NAME not set`);

  const platform = Deno.env.get("target_platform");
  if (!platform) throw new Error(`target_platform not set`);

  if (platform.startsWith("win")) {
    for (const k in vars) {
      vars[k] = convertUnixEnvVarsToWindowsFormat(vars[k]);
    }
  }

  const envConfigPath = path.join(prefix, "etc/conda/env_vars.d", `${pkgName}.json`);
  await ensureDir(path.dirname(envConfigPath));
  await Deno.writeTextFile(envConfigPath, JSON.stringify(vars, null, "  "));
}

function convertUnixEnvVarsToWindowsFormat(unixEnv: string): string {
  return unixEnv.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, var1, var2) => {
    const variable = var1 || var2;
    return `%${variable}%`;
  });
}
