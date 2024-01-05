import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts#^";
import * as yaml from "https://deno.land/std@0.211.0/yaml/mod.ts#^";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts#^";
import { Platform, radash, Recipe, Source } from "lib/mod.ts";
const { dash, mapKeys, mapValues, snake } = radash;

// TODO: This is all a bit fugly, really needs a refactor!

export class RattlerRecipe {
  private _mapped: z.infer<typeof this._rattlerRecipe>;

  constructor(
    recipe: Recipe,
    version: semver.SemVer,
    platform: Platform,
    sources: Source[],
  ) {
    this._mapped = this._map({
      package: {
        name: recipe.props.name,
        version: semver.format(version),
      },
      source: sources.map((_) => {
        switch (true) {
          case (typeof _.path === "string"):
            return {
              path: _.path,
              use_gitignore: _.useGitIgnore,
              folder: _.folder,
              patches: _.patches,
            } as z.infer<typeof this._localSource>;
          case (typeof _.url === "string"):
            return {
              url: _.url,
              sha256: _.hash[0] === "SHA256" ? _.hash[1] : undefined,
              md5: _.hash[0] === "MD5" ? _.hash[1] : undefined,
              folder: _.folder,
              patches: _.patches,
            } as z.infer<typeof this._urlSource>;
          case (typeof _.gitUrl === "string"):
            return {
              git_url: _.gitUrl,
              git_rev: _.gitRev,
              git_depth: _.gitDepth,
              lfs: _.lfs,
              folder: _.folder,
              patches: _.patches,
            } as z.infer<typeof this._gitSource>;
          default:
            throw new Error("unexpected type");
        }
      }),
      build: (() => {
        const b = recipe.props.build;

        if (typeof b === "undefined") {
          return undefined;
        }

        // These are not even referenced in https://github.com/prefix-dev/rattler-build/blob/main/src/recipe/parser/build.rs
        // But the json schema https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json says they need to be dashed, go figure????
        const mappedBuild = mapKeysDeep(
          b,
          (k) =>
            ["preLink", "postLink", "preUnlink"].includes(k)
              ? dash(k)
              : snake(k),
        );

        if (typeof mappedBuild.script === "function") {
          // dprint-ignore
          mappedBuild['script'] = [
            "deno", "run", "-A", "$RECIPE_DIR/recipe.js",
            "execute", "--build",
            "--version", semver.format(version),
            "--platform", platform,
          ].join(" ");
        }

        return mappedBuild;
      })(),
      test: (() => {
        const t = recipe.props.test;

        if (typeof t === "undefined") {
          return undefined;
        }

        return {
          commands: typeof t.script === "function"
            // dprint-ignore
            ? ["deno", "run", "-A", "../recipe/recipe.js",
                "execute", "--test",
                "--version", semver.format(version),
                "--platform", platform,
              ].join(" ")
            : t.script,
          requires: [
            "deno >= 1.39.1",
            ...(typeof t.requires === "undefined"
              ? []
              : Array.isArray(t.requires)
              ? t.requires
              : [t.requires]),
          ],
          files: t.files,
          imports: t.imports,
          source_files: t.sourceFiles,
          package_contents: t.packageContents,
        };
      })(),
      requirements: recipe.props.requirements
        ? {
          build: [
            "deno >= 1.39.1",
            ...(typeof recipe.props.requirements.build === "undefined"
              ? []
              : Array.isArray(recipe.props.requirements.build)
              ? recipe.props.requirements.build
              : [recipe.props.requirements.build]),
          ],
          host: recipe.props.requirements.host,
          run: recipe.props.requirements.run,
          run_constrained: recipe.props.requirements.runConstrained,
        }
        : undefined,
      extra: recipe.props.extra,
    });
  }

  private _baseSource = z.strictObject({
    patches: z.array(z.string()).optional(),
    folder: z.string().optional(),
  });

  private _localSource = this._baseSource.extend({
    path: z.string(),
    use_gitignore: z.boolean().optional(),
  });

  private _urlSource = this._baseSource.extend({
    url: z.string().url(),
    sha256: z.string().regex(/[a-fA-F0-9]{64}/).optional(),
    md5: z.string().regex(/[a-fA-F0-9]{32}/).optional(),
  });

  private _gitSource = this._baseSource.extend({
    git_url: z.string(),
    git_rev: z.string().optional(),
    git_depth: z.number().int().optional(),
    lfs: z.boolean().optional(),
  });

  private _rattlerRecipe = z.strictObject({
    package: z.strictObject({
      name: z.string(),
      version: z.string(),
    }),
    source: z.array(
      z.union([
        this._localSource,
        this._urlSource,
        this._gitSource,
      ]),
    ),
    build: z.strictObject({
      number: z.number().optional(),
      string: z.string().optional(),
      skip: z.union([z.string(), z.array(z.string())]).optional(),
      script: z.union([z.string(), z.array(z.string())]).optional(),
      script_env: z.strictObject({
        passthrough: z.union([z.string(), z.array(z.string())]).optional(),
        env: z.record(z.string(), z.string()).optional(),
        secrets: z.union([z.string(), z.array(z.string())]).optional(),
      }).optional(),
      noarch: z.enum(["generic", "python"]).optional(),
      entry_points: z.union([z.string(), z.array(z.string())]).optional(),
      run_exports: z.union([
        z.string(),
        z.array(z.string()),
        z.strictObject({
          weak: z.string().optional(),
          strong: z.string().optional(),
          noarch: z.string().optional(),
          weak_constrains: z.string().optional(),
          strong_constrains: z.string().optional(),
        }),
      ]).optional(),
      ignore_run_exports: z.union([z.string(), z.array(z.string())]).optional(),
      ignore_run_exports_from: z.union([z.string(), z.array(z.string())])
        .optional(),
      include_recipe: z.boolean().optional(),
      "pre-link": z.string().optional(),
      "post-link": z.string().optional(),
      "pre-unlink": z.string().optional(),
      no_link: z.union([z.string(), z.array(z.string())]).optional(),
      binary_relocation: z.union([
        z.literal(false),
        z.string(),
        z.array(z.string()),
      ]).optional(),
      has_prefix_files: z.union([z.string(), z.array(z.string())]).optional(),
      binary_has_prefix_files: z.union([z.string(), z.array(z.string())])
        .optional(),
      ignore_prefix_files: z.union([
        z.literal(true),
        z.string(),
        z.array(z.string()),
      ]).optional(),
      detect_binary_files_with_prefix: z.boolean().optional(),
      skip_compile_pyc: z.union([z.string(), z.array(z.string())]).optional(),
      rpaths: z.union([z.string(), z.array(z.string())]).optional(),
      always_include_files: z.union([z.string(), z.array(z.string())])
        .optional(),
      osx_is_app: z.boolean().optional(),
      disable_pip: z.boolean().optional(),
      preserve_egg_dir: z.boolean().optional(),
      force_use_keys: z.union([z.string(), z.array(z.string())]).optional(),
      force_ignore_keys: z.union([z.string(), z.array(z.string())]).optional(),
      merge_build_host: z.boolean().optional(),
      missing_dso_whitelist: z.union([z.string(), z.array(z.string())])
        .optional(),
      runpath_whitelist: z.union([z.string(), z.array(z.string())]).optional(),
      error_overdepending: z.boolean().optional(),
      error_overlinking: z.boolean().optional(),
    }).optional(),
    test: z.strictObject({
      commands: z.union([z.string(), z.array(z.string())]).optional(),
      requires: z.union([z.string(), z.array(z.string())]).optional(),
      files: z.union([z.string(), z.array(z.string())]).optional(),
      source_files: z.union([z.string(), z.array(z.string())]).optional(),
      imports: z.union([z.string(), z.array(z.string())]).optional(),
      package_contents: z.strictObject({
        files: z.union([z.string(), z.array(z.string())]).optional(),
        site_packages: z.union([z.string(), z.array(z.string())]).optional(),
        bins: z.union([z.string(), z.array(z.string())]).optional(),
        libs: z.union([z.string(), z.array(z.string())]).optional(),
        includes: z.union([z.string(), z.array(z.string())]).optional(),
      }).optional(),
    }).optional(),
    requirements: z.strictObject({
      build: z.union([z.string(), z.array(z.string())]).optional(),
      host: z.union([z.string(), z.array(z.string())]).optional(),
      run: z.union([z.string(), z.array(z.string())]).optional(),
      run_constrained: z.union([z.string(), z.array(z.string())]).optional(),
      run_exports: z.strictObject({
        noarch: z.union([z.string(), z.array(z.string())]).optional(),
        strong: z.union([z.string(), z.array(z.string())]).optional(),
        strong_constrains: z.union([z.string(), z.array(z.string())])
          .optional(),
        weak: z.union([z.string(), z.array(z.string())]).optional(),
        weak_constrains: z.union([z.string(), z.array(z.string())]).optional(),
      }).optional(),
      ignore_run_exports: z.strictObject({
        by_name: z.any().optional(),
        from_package: z.any().optional(),
      }).optional(),
    }).optional(),
    extra: z.record(z.string(), z.string()).optional(),
  });

  private _map = (v: z.infer<typeof this._rattlerRecipe>) =>
    this._rattlerRecipe.parse(v);

  // hack to remove all undefined values, yaml can't deal with undefined
  // there must be a nicer way to achieve the same with zod?
  toJson = () => JSON.parse(JSON.stringify(this._mapped));

  toYaml = () => yaml.stringify(this.toJson());
}

// Ported form: https://github.com/glennreyes/map-keys-deep
// Sometime TypeScript gives me a headache lol
// deno-lint-ignore no-explicit-any
const mapKeysDeep = (obj: any, mapFunc: (key: any, value: any) => any): any =>
  Array.isArray(obj)
    ? obj.map((v) => mapKeysDeep(v, mapFunc))
    : mapValues(mapKeys(obj, mapFunc), (v) =>
      typeof v === "object" ? mapKeysDeep(v, mapFunc) : v);
