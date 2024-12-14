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
      vars[k] = transformEnvVars(vars[k]);
    }
  }

  const envConfigPath = path.join(prefix, "etc/conda/env_vars.d", `${pkgName}.json`);
  await ensureDir(path.dirname(envConfigPath));
  await Deno.writeTextFile(envConfigPath, JSON.stringify(vars, null, "  "));
}

export async function addLink(existingPath: string, linkPath: string) {
  const prefix = Deno.env.get("PREFIX");
  if (!prefix) throw new Error(`PREFIX not set`);

  const pkgName = Deno.env.get("PKG_NAME");
  if (!pkgName) throw new Error(`PKG_NAME not set`);

  const platform = Deno.env.get("target_platform");
  if (!platform) throw new Error(`target_platform not set`);

  if (platform.startsWith("win")) {
    const activateScript = path.join(prefix, "etc/conda/activate.d", `${pkgName}.bat`);
    await ensureDir(path.dirname(activateScript));
    await Deno.writeTextFile(
      activateScript,
      `mklink /H "${transformEnvVars(linkPath)}" "${transformEnvVars(existingPath)}"\r\n`,
      { append: true },
    );

    const deactivateScript = path.join(prefix, "etc/conda/deactivate.d", `${pkgName}.bat`);
    await ensureDir(path.dirname(deactivateScript));
    await Deno.writeTextFile(
      deactivateScript,
      `del "${transformEnvVars(linkPath)}"\r\n`,
      { append: true },
    );
  } else {
    await Deno.symlink(existingPath, linkPath);
  }
}

function transformEnvVars(unixEnv: string): string {
  return unixEnv.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, var1, var2) => {
    const variable = var1 || var2;
    return `%${variable}%`;
  }).replaceAll("/", "\\");
}
