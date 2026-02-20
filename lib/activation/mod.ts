import { ensureDir, path } from "lib/mod.ts";

/**
 * These variables will be made available upon environment activation.
 * Made possible via $PREFIX/etc/conda/env_vars.d
 *
 * NB: You can not or should not append to the PATH environment variable using this method.
 * This is because the logic that processes these env_vars.d json files will override values from previous files.
 * Read more about it here: https://rattler-build.prefix.dev/latest/special_files/#processing-order
 *
 * Instead create activation scripts to modify that PATH.
 * Or use our prependToPATH helper function.
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

  const envConfigPath = path.join(
    prefix,
    "etc/conda/env_vars.d",
    `${pkgName}.json`,
  );
  await ensureDir(path.dirname(envConfigPath));
  await Deno.writeTextFile(envConfigPath, JSON.stringify(vars, null, "  "));
}

/**
 * Prepends one or more path segments to the PATH environment variable upon activation.
 *
 * On Windows, both `.bat` and `.ps1` activation scripts are generated.
 * On Unix, a `.sh` activation script is generated.
 *
 * @param newPathSegments - One or more absolute path strings to prepend to PATH.
 */
export async function prependToPATH(...newPathSegments: string[]) {
  const platform = Deno.env.get("target_platform");
  if (!platform) throw new Error(`target_platform not set`);

  const pkgName = Deno.env.get("PKG_NAME");
  if (!pkgName) throw new Error(`PKG_NAME not set`);

  if (platform.startsWith("win")) {
    const batPaths = newPathSegments.map(transformEnvVars).join(";");
    await addActivateScript(
      "bat",
      `@SET "PATH=${batPaths};%PATH%"`,
    );

    const ps1Paths = newPathSegments.map(transformEnvVarsPS1).join(";");
    await addActivateScript(
      "ps1",
      `$env:PATH = "${ps1Paths};$env:PATH"`,
    );
    return;
  }

  await addActivateScript(
    "sh",
    `export PATH="${newPathSegments.join(":")}:$PATH"`,
  );
}

/**
 * Writes a snippet to the package's conda activation script.
 *
 * The script is located at `$PREFIX/etc/conda/activate.d/$PKG_NAME.<ext>`.
 * Subsequent calls append to the same file.
 *
 * @param ext - File extension that determines the script type (e.g. `"sh"`, `"bat"`, `"ps1"`).
 * @param src - Source code / commands to append to the activation script.
 */
export async function addActivateScript(ext: string, src: string) {
  const prefix = Deno.env.get("PREFIX");
  if (!prefix) throw new Error(`PREFIX not set`);

  const pkgName = Deno.env.get("PKG_NAME");
  if (!pkgName) throw new Error(`PKG_NAME not set`);

  const platform = Deno.env.get("target_platform");
  if (!platform) throw new Error(`target_platform not set`);

  const scriptPath = path.join(
    prefix,
    "etc/conda/activate.d",
    `${pkgName}.${ext}`,
  );
  await ensureDir(path.dirname(scriptPath));
  await Deno.writeTextFile(
    scriptPath,
    platform.startsWith("win") ? `\r\n${src}` : `\n${src}`,
    { append: true },
  );
}

/**
 * Writes a snippet to the package's conda deactivation script.
 *
 * The script is located at `$PREFIX/etc/conda/deactivate.d/$PKG_NAME.<ext>`.
 * Subsequent calls append to the same file.
 *
 * @param ext - File extension that determines the script type (e.g. `"sh"`, `"bat"`, `"ps1"`).
 * @param src - Source code / commands to append to the deactivation script.
 */
export async function addDeactivateScript(ext: string, src: string) {
  const prefix = Deno.env.get("PREFIX");
  if (!prefix) throw new Error(`PREFIX not set`);

  const pkgName = Deno.env.get("PKG_NAME");
  if (!pkgName) throw new Error(`PKG_NAME not set`);

  const platform = Deno.env.get("target_platform");
  if (!platform) throw new Error(`target_platform not set`);

  const scriptPath = path.join(
    prefix,
    "etc/conda/deactivate.d",
    `${pkgName}.${ext}`,
  );
  await ensureDir(path.dirname(scriptPath));
  await Deno.writeTextFile(
    scriptPath,
    platform.startsWith("win") ? `\r\n${src}` : `\n${src}`,
    { append: true },
  );
}

/**
 * Creates a link from `linkPath` pointing to `existingPath`.
 *
 * On Unix a symlink is created directly.
 * On Windows, hard-link creation and removal are handled via `.bat` and `.ps1`
 * activate/deactivate scripts, since symlinks require elevated privileges.
 *
 * @param existingPath - The target path the link should point to.
 * @param linkPath - The path at which the new link will be created.
 */
export async function addLink(existingPath: string, linkPath: string) {
  const platform = Deno.env.get("target_platform");
  if (!platform) throw new Error(`target_platform not set`);

  if (platform.startsWith("win")) {
    await addActivateScript(
      "bat",
      `mklink /H "${transformEnvVars(linkPath)}" "${
        transformEnvVars(existingPath)
      }"`,
    );

    await addDeactivateScript("bat", `del "${transformEnvVars(linkPath)}"`);

    await addActivateScript(
      "ps1",
      `New-Item -ItemType HardLink -Path "${
        transformEnvVarsPS1(linkPath)
      }" -Target "${transformEnvVarsPS1(existingPath)}"`,
    );

    await addDeactivateScript(
      "ps1",
      `Remove-Item "${transformEnvVarsPS1(linkPath)}"`,
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

function transformEnvVarsPS1(unixEnv: string): string {
  return unixEnv.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, var1, var2) => {
    const variable = var1 || var2;
    return `$env:${variable}`;
  }).replaceAll("/", "\\");
}
