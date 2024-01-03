// deno-lint-ignore-file
import typia from "npm:typia";
import { Test } from "./test.ts";
import { About } from "./about.ts";
import { Build } from "./build.ts";
import { Source } from "./source.ts";
import { Requirements } from "./requirements.ts";
import { Platform, PlatformArch, PlatformOs } from "./platform.ts";
export interface RecipeProps {
    /**
     * The name of the package.
     */
    name: string;
    /**
     * A human readable description of the package information
     */
    about?: About;
    /**
     * A list of platforms that this recipe supports.
     */
    platforms: Platform[];
    /**
     * A function that returns a sorted (newest to oldest) list of the last 5
     * version numbers from an upstream source. Such as Github Releases or git tags.
     *
     * Any versions that have not yet been published will be in the next GHA run.
     *
     * NB: Why limit this to 5 versions? We do not want to build & package years
     * worth of old versions that could exhaust our GHA build minutes.
     */
    versions: () => Promise<string[]> | string[];
    /**
     * The source items to be downloaded and used for the build.
     */
    sources: (version: string, os: PlatformOs, arch: PlatformArch) => Source[];
    /**
     * Describes how the package should be build.
     */
    build?: Build;
    /**
     * Tests to run after packaging.
     */
    test?: Test;
    /**
     * The package dependencies.
     */
    requirements?: Requirements;
    /**
     * An set of arbitrary values that are included in the package manifest
     */
    extra?: Record<string, string>;
}
/**
 * Based On: https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json
 * Also see: https://prefix-dev.github.io/rattler-build/recipe_file/#spec-reference
 * Minus the context, conditionals & the "ComplexRecipe".
 */
export class Recipe {
    constructor(public props: RecipeProps) {
        ((input: any): RecipeProps => {
            const __is = (input: any): input is RecipeProps => {
                const $io0 = (input: any): boolean => "string" === typeof input.name && (undefined === input.about || "object" === typeof input.about && null !== input.about && false === Array.isArray(input.about) && $io1(input.about)) && (Array.isArray(input.platforms) && input.platforms.every((elem: any) => "linux-x64" === elem || "linux-arm64" === elem || "darwin-x64" === elem || "darwin-arm64" === elem || "windows-x64" === elem || "windows-arm64" === elem)) && true && true && (undefined === input.build || "object" === typeof input.build && null !== input.build && false === Array.isArray(input.build) && $io3(input.build)) && (undefined === input.test || "object" === typeof input.test && null !== input.test && false === Array.isArray(input.test) && $iu0(input.test)) && (undefined === input.requirements || "object" === typeof input.requirements && null !== input.requirements && false === Array.isArray(input.requirements) && $io12(input.requirements)) && (undefined === input.extra || "object" === typeof input.extra && null !== input.extra && false === Array.isArray(input.extra) && $io5(input.extra));
                const $io1 = (input: any): boolean => (undefined === input.homepage || "string" === typeof input.homepage && /^[a-zA-Z0-9]+:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(input.homepage)) && (undefined === input.repository || "string" === typeof input.repository && /^[a-zA-Z0-9]+:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(input.repository)) && (undefined === input.documentation || "string" === typeof input.documentation && /^[a-zA-Z0-9]+:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(input.documentation)) && (undefined === input.license || "string" === typeof input.license) && (null !== input.licenseFile && (undefined === input.licenseFile || "string" === typeof input.licenseFile && /^[^\\]+$/.test(input.licenseFile) || Array.isArray(input.licenseFile) && input.licenseFile.every((elem: any) => "string" === typeof elem && /^[^\\]+$/.test(elem)))) && (undefined === input.licenseUrl || "string" === typeof input.licenseUrl && /^[a-zA-Z0-9]+:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(input.licenseUrl)) && (undefined === input.summary || "string" === typeof input.summary) && (null !== input.description && (undefined === input.description || "string" === typeof input.description || "object" === typeof input.description && null !== input.description && $io2(input.description))) && (undefined === input.prelinkMessage || "string" === typeof input.prelinkMessage);
                const $io2 = (input: any): boolean => "string" === typeof input.file && /^[^\\]+$/.test(input.file);
                const $io3 = (input: any): boolean => (undefined === input.number || "number" === typeof input.number && (Math.floor(input.number) === input.number && -2147483648 <= input.number && input.number <= 2147483647)) && (undefined === input.string || "string" === typeof input.string) && (null !== input.skip && (undefined === input.skip || "string" === typeof input.skip || Array.isArray(input.skip) && input.skip.every((elem: any) => "string" === typeof elem))) && (null !== input.script && (undefined === input.script || "function" === typeof input.script || "string" === typeof input.script || Array.isArray(input.script) && input.script.every((elem: any) => "string" === typeof elem))) && (undefined === input.scriptEnv || "object" === typeof input.scriptEnv && null !== input.scriptEnv && false === Array.isArray(input.scriptEnv) && $io4(input.scriptEnv)) && (undefined === input.noarch || "generic" === input.noarch || "python" === input.noarch) && (null !== input.entryPoints && (undefined === input.entryPoints || "string" === typeof input.entryPoints || Array.isArray(input.entryPoints) && input.entryPoints.every((elem: any) => "string" === typeof elem))) && (null !== input.runExports && (undefined === input.runExports || "string" === typeof input.runExports || (Array.isArray(input.runExports) && input.runExports.every((elem: any) => "string" === typeof elem) || "object" === typeof input.runExports && null !== input.runExports && false === Array.isArray(input.runExports) && $io6(input.runExports)))) && (null !== input.ignoreRunExports && (undefined === input.ignoreRunExports || "string" === typeof input.ignoreRunExports || Array.isArray(input.ignoreRunExports) && input.ignoreRunExports.every((elem: any) => "string" === typeof elem))) && (null !== input.ignoreRunExportsFrom && (undefined === input.ignoreRunExportsFrom || "string" === typeof input.ignoreRunExportsFrom || Array.isArray(input.ignoreRunExportsFrom) && input.ignoreRunExportsFrom.every((elem: any) => "string" === typeof elem))) && (undefined === input.includeRecipe || "boolean" === typeof input.includeRecipe) && (undefined === input.preLink || "string" === typeof input.preLink) && (undefined === input.postLink || "string" === typeof input.postLink) && (undefined === input.preUnlink || "string" === typeof input.preUnlink) && (null !== input.noLink && (undefined === input.noLink || "string" === typeof input.noLink && /^[^\\]+$/.test(input.noLink) || Array.isArray(input.noLink) && input.noLink.every((elem: any) => "string" === typeof elem && /^[^\\]+$/.test(elem)))) && (null !== input.binaryRelocation && (undefined === input.binaryRelocation || false === input.binaryRelocation || "string" === typeof input.binaryRelocation && /^[^\\]+$/.test(input.binaryRelocation) || Array.isArray(input.binaryRelocation) && input.binaryRelocation.every((elem: any) => "string" === typeof elem && /^[^\\]+$/.test(elem)))) && (null !== input.hasPrefixFiles && (undefined === input.hasPrefixFiles || "string" === typeof input.hasPrefixFiles && /^[^\\]+$/.test(input.hasPrefixFiles) || Array.isArray(input.hasPrefixFiles) && input.hasPrefixFiles.every((elem: any) => "string" === typeof elem && /^[^\\]+$/.test(elem)))) && (null !== input.binaryHasPrefixFiles && (undefined === input.binaryHasPrefixFiles || "string" === typeof input.binaryHasPrefixFiles && /^[^\\]+$/.test(input.binaryHasPrefixFiles) || Array.isArray(input.binaryHasPrefixFiles) && input.binaryHasPrefixFiles.every((elem: any) => "string" === typeof elem && /^[^\\]+$/.test(elem)))) && (null !== input.ignorePrefixFiles && (undefined === input.ignorePrefixFiles || true === input.ignorePrefixFiles || "string" === typeof input.ignorePrefixFiles && /^[^\\]+$/.test(input.ignorePrefixFiles) || Array.isArray(input.ignorePrefixFiles) && input.ignorePrefixFiles.every((elem: any) => "string" === typeof elem && /^[^\\]+$/.test(elem)))) && (undefined === input.detectBinaryFilesWithPrefix || "boolean" === typeof input.detectBinaryFilesWithPrefix) && (null !== input.skipCompilePyc && (undefined === input.skipCompilePyc || "string" === typeof input.skipCompilePyc && /^[^\\]+$/.test(input.skipCompilePyc) || Array.isArray(input.skipCompilePyc) && input.skipCompilePyc.every((elem: any) => "string" === typeof elem && /^[^\\]+$/.test(elem)))) && (null !== input.rpaths && (undefined === input.rpaths || "string" === typeof input.rpaths || Array.isArray(input.rpaths) && input.rpaths.every((elem: any) => "string" === typeof elem))) && (null !== input.alwaysIncludeFiles && (undefined === input.alwaysIncludeFiles || "string" === typeof input.alwaysIncludeFiles || Array.isArray(input.alwaysIncludeFiles) && input.alwaysIncludeFiles.every((elem: any) => "string" === typeof elem))) && (undefined === input.osxIsApp || "boolean" === typeof input.osxIsApp) && (undefined === input.disablePip || "boolean" === typeof input.disablePip) && (undefined === input.preserveEggDir || "boolean" === typeof input.preserveEggDir) && (null !== input.forceUseKeys && (undefined === input.forceUseKeys || "string" === typeof input.forceUseKeys || Array.isArray(input.forceUseKeys) && input.forceUseKeys.every((elem: any) => "string" === typeof elem))) && (null !== input.forceIgnoreKeys && (undefined === input.forceIgnoreKeys || "string" === typeof input.forceIgnoreKeys || Array.isArray(input.forceIgnoreKeys) && input.forceIgnoreKeys.every((elem: any) => "string" === typeof elem))) && (undefined === input.mergeBuildHost || "boolean" === typeof input.mergeBuildHost) && (null !== input.missingDsoWhitelist && (undefined === input.missingDsoWhitelist || "string" === typeof input.missingDsoWhitelist || Array.isArray(input.missingDsoWhitelist) && input.missingDsoWhitelist.every((elem: any) => "string" === typeof elem))) && (null !== input.runpathWhitelist && (undefined === input.runpathWhitelist || "string" === typeof input.runpathWhitelist || Array.isArray(input.runpathWhitelist) && input.runpathWhitelist.every((elem: any) => "string" === typeof elem))) && (undefined === input.errorOverdepending || "boolean" === typeof input.errorOverdepending) && (undefined === input.errorOverlinking || "boolean" === typeof input.errorOverlinking);
                const $io4 = (input: any): boolean => null !== input.passthrough && (undefined === input.passthrough || "string" === typeof input.passthrough || Array.isArray(input.passthrough) && input.passthrough.every((elem: any) => "string" === typeof elem)) && (undefined === input.env || "object" === typeof input.env && null !== input.env && false === Array.isArray(input.env) && $io5(input.env)) && (null !== input.secrets && (undefined === input.secrets || "string" === typeof input.secrets || Array.isArray(input.secrets) && input.secrets.every((elem: any) => "string" === typeof elem)));
                const $io5 = (input: any): boolean => Object.keys(input).every((key: any) => {
                    const value = input[key];
                    if (undefined === value)
                        return true;
                    if (true)
                        return "string" === typeof value;
                    return true;
                });
                const $io6 = (input: any): boolean => (undefined === input.weak || "string" === typeof input.weak) && (undefined === input.strong || "string" === typeof input.strong) && (undefined === input.noarch || "string" === typeof input.noarch) && (undefined === input.weakConstrains || "string" === typeof input.weakConstrains) && (undefined === input.strongConstrains || "string" === typeof input.strongConstrains);
                const $io7 = (input: any): boolean => null !== input.imports && undefined === input.imports && (null !== input.downstream && undefined === input.downstream) && (null !== input.script && (undefined === input.script || "function" === typeof input.script || "string" === typeof input.script || Array.isArray(input.script) && input.script.every((elem: any) => "string" === typeof elem))) && (undefined === input.extraRequirements || "object" === typeof input.extraRequirements && null !== input.extraRequirements && false === Array.isArray(input.extraRequirements) && $io8(input.extraRequirements)) && (undefined === input.files || "object" === typeof input.files && null !== input.files && false === Array.isArray(input.files) && $io9(input.files));
                const $io8 = (input: any): boolean => null !== input.build && (undefined === input.build || "string" === typeof input.build || Array.isArray(input.build) && input.build.every((elem: any) => "string" === typeof elem)) && (null !== input.run && (undefined === input.run || "string" === typeof input.run || Array.isArray(input.run) && input.run.every((elem: any) => "string" === typeof elem)));
                const $io9 = (input: any): boolean => null !== input.source && (undefined === input.source || "string" === typeof input.source || Array.isArray(input.source) && input.source.every((elem: any) => "string" === typeof elem)) && (null !== input.recipe && (undefined === input.recipe || "string" === typeof input.recipe || Array.isArray(input.recipe) && input.recipe.every((elem: any) => "string" === typeof elem)));
                const $io10 = (input: any): boolean => null !== input.downstream && undefined === input.downstream && (null !== input.script && undefined === input.script) && (null !== input.extraRequirements && undefined === input.extraRequirements) && (null !== input.files && undefined === input.files) && (null !== input.imports && undefined !== input.imports && ("string" === typeof input.imports || Array.isArray(input.imports) && input.imports.every((elem: any) => "string" === typeof elem)));
                const $io11 = (input: any): boolean => null !== input.imports && undefined === input.imports && (null !== input.script && undefined === input.script) && (null !== input.extraRequirements && undefined === input.extraRequirements) && (null !== input.files && undefined === input.files) && "string" === typeof input.downstream;
                const $io12 = (input: any): boolean => null !== input.build && (undefined === input.build || "string" === typeof input.build || Array.isArray(input.build) && input.build.every((elem: any) => "string" === typeof elem)) && (null !== input.host && (undefined === input.host || "string" === typeof input.host || Array.isArray(input.host) && input.host.every((elem: any) => "string" === typeof elem))) && (null !== input.run && (undefined === input.run || "string" === typeof input.run || Array.isArray(input.run) && input.run.every((elem: any) => "string" === typeof elem))) && (null !== input.runConstrained && (undefined === input.runConstrained || "string" === typeof input.runConstrained || Array.isArray(input.runConstrained) && input.runConstrained.every((elem: any) => "string" === typeof elem)));
                const $iu0 = (input: any): any => (() => {
                    if ("string" === typeof input.downstream)
                        return $io11(input);
                    else if (null !== input.imports && undefined !== input.imports && ("string" === typeof input.imports || Array.isArray(input.imports) && input.imports.every((elem: any) => "string" === typeof elem)))
                        return $io10(input);
                    else
                        return $io7(input);
                })();
                return "object" === typeof input && null !== input && $io0(input);
            };
            if (false === __is(input))
                ((input: any, _path: string, _exceptionable: boolean = true): input is RecipeProps => {
                    const $guard = (typia.assert as any).guard;
                    const $join = (typia.assert as any).join;
                    const $ao0 = (input: any, _path: string, _exceptionable: boolean = true): boolean => ("string" === typeof input.name || $guard(_exceptionable, {
                        path: _path + ".name",
                        expected: "string",
                        value: input.name
                    })) && (undefined === input.about || ("object" === typeof input.about && null !== input.about && false === Array.isArray(input.about) || $guard(_exceptionable, {
                        path: _path + ".about",
                        expected: "(About | undefined)",
                        value: input.about
                    })) && $ao1(input.about, _path + ".about", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".about",
                        expected: "(About | undefined)",
                        value: input.about
                    })) && ((Array.isArray(input.platforms) || $guard(_exceptionable, {
                        path: _path + ".platforms",
                        expected: "Array<\"linux-x64\" | \"linux-arm64\" | \"darwin-x64\" | \"darwin-arm64\" | \"windows-x64\" | \"windows-arm64\">",
                        value: input.platforms
                    })) && input.platforms.every((elem: any, _index1: number) => "linux-x64" === elem || "linux-arm64" === elem || "darwin-x64" === elem || "darwin-arm64" === elem || "windows-x64" === elem || "windows-arm64" === elem || $guard(_exceptionable, {
                        path: _path + ".platforms[" + _index1 + "]",
                        expected: "(\"darwin-arm64\" | \"darwin-x64\" | \"linux-arm64\" | \"linux-x64\" | \"windows-arm64\" | \"windows-x64\")",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".platforms",
                        expected: "Array<\"linux-x64\" | \"linux-arm64\" | \"darwin-x64\" | \"darwin-arm64\" | \"windows-x64\" | \"windows-arm64\">",
                        value: input.platforms
                    })) && (true || $guard(_exceptionable, {
                        path: _path + ".versions",
                        expected: "unknown",
                        value: input.versions
                    })) && (true || $guard(_exceptionable, {
                        path: _path + ".sources",
                        expected: "unknown",
                        value: input.sources
                    })) && (undefined === input.build || ("object" === typeof input.build && null !== input.build && false === Array.isArray(input.build) || $guard(_exceptionable, {
                        path: _path + ".build",
                        expected: "(Build | undefined)",
                        value: input.build
                    })) && $ao3(input.build, _path + ".build", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".build",
                        expected: "(Build | undefined)",
                        value: input.build
                    })) && (undefined === input.test || ("object" === typeof input.test && null !== input.test && false === Array.isArray(input.test) || $guard(_exceptionable, {
                        path: _path + ".test",
                        expected: "(__type.o3 | __type.o6 | __type.o7 | undefined)",
                        value: input.test
                    })) && $au0(input.test, _path + ".test", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".test",
                        expected: "(__type.o3 | __type.o6 | __type.o7 | undefined)",
                        value: input.test
                    })) && (undefined === input.requirements || ("object" === typeof input.requirements && null !== input.requirements && false === Array.isArray(input.requirements) || $guard(_exceptionable, {
                        path: _path + ".requirements",
                        expected: "(Requirements | undefined)",
                        value: input.requirements
                    })) && $ao12(input.requirements, _path + ".requirements", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".requirements",
                        expected: "(Requirements | undefined)",
                        value: input.requirements
                    })) && (undefined === input.extra || ("object" === typeof input.extra && null !== input.extra && false === Array.isArray(input.extra) || $guard(_exceptionable, {
                        path: _path + ".extra",
                        expected: "(Record<string, string> | undefined)",
                        value: input.extra
                    })) && $ao5(input.extra, _path + ".extra", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".extra",
                        expected: "(Record<string, string> | undefined)",
                        value: input.extra
                    }));
                    const $ao1 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (undefined === input.homepage || "string" === typeof input.homepage && (/^[a-zA-Z0-9]+:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(input.homepage) || $guard(_exceptionable, {
                        path: _path + ".homepage",
                        expected: "string & Format<\"url\">",
                        value: input.homepage
                    })) || $guard(_exceptionable, {
                        path: _path + ".homepage",
                        expected: "((string & Format<\"url\">) | undefined)",
                        value: input.homepage
                    })) && (undefined === input.repository || "string" === typeof input.repository && (/^[a-zA-Z0-9]+:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(input.repository) || $guard(_exceptionable, {
                        path: _path + ".repository",
                        expected: "string & Format<\"url\">",
                        value: input.repository
                    })) || $guard(_exceptionable, {
                        path: _path + ".repository",
                        expected: "((string & Format<\"url\">) | undefined)",
                        value: input.repository
                    })) && (undefined === input.documentation || "string" === typeof input.documentation && (/^[a-zA-Z0-9]+:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(input.documentation) || $guard(_exceptionable, {
                        path: _path + ".documentation",
                        expected: "string & Format<\"url\">",
                        value: input.documentation
                    })) || $guard(_exceptionable, {
                        path: _path + ".documentation",
                        expected: "((string & Format<\"url\">) | undefined)",
                        value: input.documentation
                    })) && (undefined === input.license || "string" === typeof input.license || $guard(_exceptionable, {
                        path: _path + ".license",
                        expected: "(string | undefined)",
                        value: input.license
                    })) && ((null !== input.licenseFile || $guard(_exceptionable, {
                        path: _path + ".licenseFile",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.licenseFile
                    })) && (undefined === input.licenseFile || "string" === typeof input.licenseFile && (/^[^\\]+$/.test(input.licenseFile) || $guard(_exceptionable, {
                        path: _path + ".licenseFile",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: input.licenseFile
                    })) || (Array.isArray(input.licenseFile) || $guard(_exceptionable, {
                        path: _path + ".licenseFile",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.licenseFile
                    })) && input.licenseFile.every((elem: any, _index2: number) => "string" === typeof elem && (/^[^\\]+$/.test(elem) || $guard(_exceptionable, {
                        path: _path + ".licenseFile[" + _index2 + "]",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".licenseFile[" + _index2 + "]",
                        expected: "(string & Pattern<\"^[^\\\\\\\\]+$\">)",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".licenseFile",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.licenseFile
                    }))) && (undefined === input.licenseUrl || "string" === typeof input.licenseUrl && (/^[a-zA-Z0-9]+:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(input.licenseUrl) || $guard(_exceptionable, {
                        path: _path + ".licenseUrl",
                        expected: "string & Format<\"url\">",
                        value: input.licenseUrl
                    })) || $guard(_exceptionable, {
                        path: _path + ".licenseUrl",
                        expected: "((string & Format<\"url\">) | undefined)",
                        value: input.licenseUrl
                    })) && (undefined === input.summary || "string" === typeof input.summary || $guard(_exceptionable, {
                        path: _path + ".summary",
                        expected: "(string | undefined)",
                        value: input.summary
                    })) && ((null !== input.description || $guard(_exceptionable, {
                        path: _path + ".description",
                        expected: "(__type | string | undefined)",
                        value: input.description
                    })) && (undefined === input.description || "string" === typeof input.description || ("object" === typeof input.description && null !== input.description || $guard(_exceptionable, {
                        path: _path + ".description",
                        expected: "(__type | string | undefined)",
                        value: input.description
                    })) && $ao2(input.description, _path + ".description", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".description",
                        expected: "(__type | string | undefined)",
                        value: input.description
                    }))) && (undefined === input.prelinkMessage || "string" === typeof input.prelinkMessage || $guard(_exceptionable, {
                        path: _path + ".prelinkMessage",
                        expected: "(string | undefined)",
                        value: input.prelinkMessage
                    }));
                    const $ao2 = (input: any, _path: string, _exceptionable: boolean = true): boolean => "string" === typeof input.file && (/^[^\\]+$/.test(input.file) || $guard(_exceptionable, {
                        path: _path + ".file",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: input.file
                    })) || $guard(_exceptionable, {
                        path: _path + ".file",
                        expected: "(string & Pattern<\"^[^\\\\\\\\]+$\">)",
                        value: input.file
                    });
                    const $ao3 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (undefined === input.number || "number" === typeof input.number && (Math.floor(input.number) === input.number && -2147483648 <= input.number && input.number <= 2147483647 || $guard(_exceptionable, {
                        path: _path + ".number",
                        expected: "number & Type<\"int32\">",
                        value: input.number
                    })) || $guard(_exceptionable, {
                        path: _path + ".number",
                        expected: "((number & Type<\"int32\">) | undefined)",
                        value: input.number
                    })) && (undefined === input.string || "string" === typeof input.string || $guard(_exceptionable, {
                        path: _path + ".string",
                        expected: "(string | undefined)",
                        value: input.string
                    })) && ((null !== input.skip || $guard(_exceptionable, {
                        path: _path + ".skip",
                        expected: "(Array<string> | string | undefined)",
                        value: input.skip
                    })) && (undefined === input.skip || "string" === typeof input.skip || (Array.isArray(input.skip) || $guard(_exceptionable, {
                        path: _path + ".skip",
                        expected: "(Array<string> | string | undefined)",
                        value: input.skip
                    })) && input.skip.every((elem: any, _index3: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".skip[" + _index3 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".skip",
                        expected: "(Array<string> | string | undefined)",
                        value: input.skip
                    }))) && ((null !== input.script || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "(Array<string> | string | undefined)",
                        value: input.script
                    })) && (undefined === input.script || "function" === typeof input.script || "string" === typeof input.script || (Array.isArray(input.script) || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "(Array<string> | string | undefined)",
                        value: input.script
                    })) && input.script.every((elem: any, _index4: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".script[" + _index4 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "(Array<string> | string | undefined)",
                        value: input.script
                    }))) && (undefined === input.scriptEnv || ("object" === typeof input.scriptEnv && null !== input.scriptEnv && false === Array.isArray(input.scriptEnv) || $guard(_exceptionable, {
                        path: _path + ".scriptEnv",
                        expected: "(__type.o1 | undefined)",
                        value: input.scriptEnv
                    })) && $ao4(input.scriptEnv, _path + ".scriptEnv", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".scriptEnv",
                        expected: "(__type.o1 | undefined)",
                        value: input.scriptEnv
                    })) && (undefined === input.noarch || "generic" === input.noarch || "python" === input.noarch || $guard(_exceptionable, {
                        path: _path + ".noarch",
                        expected: "(\"generic\" | \"python\" | undefined)",
                        value: input.noarch
                    })) && ((null !== input.entryPoints || $guard(_exceptionable, {
                        path: _path + ".entryPoints",
                        expected: "(Array<string> | string | undefined)",
                        value: input.entryPoints
                    })) && (undefined === input.entryPoints || "string" === typeof input.entryPoints || (Array.isArray(input.entryPoints) || $guard(_exceptionable, {
                        path: _path + ".entryPoints",
                        expected: "(Array<string> | string | undefined)",
                        value: input.entryPoints
                    })) && input.entryPoints.every((elem: any, _index5: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".entryPoints[" + _index5 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".entryPoints",
                        expected: "(Array<string> | string | undefined)",
                        value: input.entryPoints
                    }))) && ((null !== input.runExports || $guard(_exceptionable, {
                        path: _path + ".runExports",
                        expected: "(Array<string> | __type.o2 | string | undefined)",
                        value: input.runExports
                    })) && (undefined === input.runExports || "string" === typeof input.runExports || (Array.isArray(input.runExports) && input.runExports.every((elem: any, _index6: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".runExports[" + _index6 + "]",
                        expected: "string",
                        value: elem
                    })) || "object" === typeof input.runExports && null !== input.runExports && false === Array.isArray(input.runExports) && $ao6(input.runExports, _path + ".runExports", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".runExports",
                        expected: "(Array<string> | __type.o2 | string | undefined)",
                        value: input.runExports
                    })) || $guard(_exceptionable, {
                        path: _path + ".runExports",
                        expected: "(Array<string> | __type.o2 | string | undefined)",
                        value: input.runExports
                    }))) && ((null !== input.ignoreRunExports || $guard(_exceptionable, {
                        path: _path + ".ignoreRunExports",
                        expected: "(Array<string> | string | undefined)",
                        value: input.ignoreRunExports
                    })) && (undefined === input.ignoreRunExports || "string" === typeof input.ignoreRunExports || (Array.isArray(input.ignoreRunExports) || $guard(_exceptionable, {
                        path: _path + ".ignoreRunExports",
                        expected: "(Array<string> | string | undefined)",
                        value: input.ignoreRunExports
                    })) && input.ignoreRunExports.every((elem: any, _index7: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".ignoreRunExports[" + _index7 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".ignoreRunExports",
                        expected: "(Array<string> | string | undefined)",
                        value: input.ignoreRunExports
                    }))) && ((null !== input.ignoreRunExportsFrom || $guard(_exceptionable, {
                        path: _path + ".ignoreRunExportsFrom",
                        expected: "(Array<string> | string | undefined)",
                        value: input.ignoreRunExportsFrom
                    })) && (undefined === input.ignoreRunExportsFrom || "string" === typeof input.ignoreRunExportsFrom || (Array.isArray(input.ignoreRunExportsFrom) || $guard(_exceptionable, {
                        path: _path + ".ignoreRunExportsFrom",
                        expected: "(Array<string> | string | undefined)",
                        value: input.ignoreRunExportsFrom
                    })) && input.ignoreRunExportsFrom.every((elem: any, _index8: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".ignoreRunExportsFrom[" + _index8 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".ignoreRunExportsFrom",
                        expected: "(Array<string> | string | undefined)",
                        value: input.ignoreRunExportsFrom
                    }))) && (undefined === input.includeRecipe || "boolean" === typeof input.includeRecipe || $guard(_exceptionable, {
                        path: _path + ".includeRecipe",
                        expected: "((boolean & Default<true>) | undefined)",
                        value: input.includeRecipe
                    })) && (undefined === input.preLink || "string" === typeof input.preLink || $guard(_exceptionable, {
                        path: _path + ".preLink",
                        expected: "(string | undefined)",
                        value: input.preLink
                    })) && (undefined === input.postLink || "string" === typeof input.postLink || $guard(_exceptionable, {
                        path: _path + ".postLink",
                        expected: "(string | undefined)",
                        value: input.postLink
                    })) && (undefined === input.preUnlink || "string" === typeof input.preUnlink || $guard(_exceptionable, {
                        path: _path + ".preUnlink",
                        expected: "(string | undefined)",
                        value: input.preUnlink
                    })) && ((null !== input.noLink || $guard(_exceptionable, {
                        path: _path + ".noLink",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.noLink
                    })) && (undefined === input.noLink || "string" === typeof input.noLink && (/^[^\\]+$/.test(input.noLink) || $guard(_exceptionable, {
                        path: _path + ".noLink",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: input.noLink
                    })) || (Array.isArray(input.noLink) || $guard(_exceptionable, {
                        path: _path + ".noLink",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.noLink
                    })) && input.noLink.every((elem: any, _index9: number) => "string" === typeof elem && (/^[^\\]+$/.test(elem) || $guard(_exceptionable, {
                        path: _path + ".noLink[" + _index9 + "]",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".noLink[" + _index9 + "]",
                        expected: "(string & Pattern<\"^[^\\\\\\\\]+$\">)",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".noLink",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.noLink
                    }))) && ((null !== input.binaryRelocation || $guard(_exceptionable, {
                        path: _path + ".binaryRelocation",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | false | undefined)",
                        value: input.binaryRelocation
                    })) && (undefined === input.binaryRelocation || false === input.binaryRelocation || "string" === typeof input.binaryRelocation && (/^[^\\]+$/.test(input.binaryRelocation) || $guard(_exceptionable, {
                        path: _path + ".binaryRelocation",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: input.binaryRelocation
                    })) || (Array.isArray(input.binaryRelocation) || $guard(_exceptionable, {
                        path: _path + ".binaryRelocation",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | false | undefined)",
                        value: input.binaryRelocation
                    })) && input.binaryRelocation.every((elem: any, _index10: number) => "string" === typeof elem && (/^[^\\]+$/.test(elem) || $guard(_exceptionable, {
                        path: _path + ".binaryRelocation[" + _index10 + "]",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".binaryRelocation[" + _index10 + "]",
                        expected: "(string & Pattern<\"^[^\\\\\\\\]+$\">)",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".binaryRelocation",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | false | undefined)",
                        value: input.binaryRelocation
                    }))) && ((null !== input.hasPrefixFiles || $guard(_exceptionable, {
                        path: _path + ".hasPrefixFiles",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.hasPrefixFiles
                    })) && (undefined === input.hasPrefixFiles || "string" === typeof input.hasPrefixFiles && (/^[^\\]+$/.test(input.hasPrefixFiles) || $guard(_exceptionable, {
                        path: _path + ".hasPrefixFiles",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: input.hasPrefixFiles
                    })) || (Array.isArray(input.hasPrefixFiles) || $guard(_exceptionable, {
                        path: _path + ".hasPrefixFiles",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.hasPrefixFiles
                    })) && input.hasPrefixFiles.every((elem: any, _index11: number) => "string" === typeof elem && (/^[^\\]+$/.test(elem) || $guard(_exceptionable, {
                        path: _path + ".hasPrefixFiles[" + _index11 + "]",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".hasPrefixFiles[" + _index11 + "]",
                        expected: "(string & Pattern<\"^[^\\\\\\\\]+$\">)",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".hasPrefixFiles",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.hasPrefixFiles
                    }))) && ((null !== input.binaryHasPrefixFiles || $guard(_exceptionable, {
                        path: _path + ".binaryHasPrefixFiles",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.binaryHasPrefixFiles
                    })) && (undefined === input.binaryHasPrefixFiles || "string" === typeof input.binaryHasPrefixFiles && (/^[^\\]+$/.test(input.binaryHasPrefixFiles) || $guard(_exceptionable, {
                        path: _path + ".binaryHasPrefixFiles",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: input.binaryHasPrefixFiles
                    })) || (Array.isArray(input.binaryHasPrefixFiles) || $guard(_exceptionable, {
                        path: _path + ".binaryHasPrefixFiles",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.binaryHasPrefixFiles
                    })) && input.binaryHasPrefixFiles.every((elem: any, _index12: number) => "string" === typeof elem && (/^[^\\]+$/.test(elem) || $guard(_exceptionable, {
                        path: _path + ".binaryHasPrefixFiles[" + _index12 + "]",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".binaryHasPrefixFiles[" + _index12 + "]",
                        expected: "(string & Pattern<\"^[^\\\\\\\\]+$\">)",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".binaryHasPrefixFiles",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.binaryHasPrefixFiles
                    }))) && ((null !== input.ignorePrefixFiles || $guard(_exceptionable, {
                        path: _path + ".ignorePrefixFiles",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | true | undefined)",
                        value: input.ignorePrefixFiles
                    })) && (undefined === input.ignorePrefixFiles || true === input.ignorePrefixFiles || "string" === typeof input.ignorePrefixFiles && (/^[^\\]+$/.test(input.ignorePrefixFiles) || $guard(_exceptionable, {
                        path: _path + ".ignorePrefixFiles",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: input.ignorePrefixFiles
                    })) || (Array.isArray(input.ignorePrefixFiles) || $guard(_exceptionable, {
                        path: _path + ".ignorePrefixFiles",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | true | undefined)",
                        value: input.ignorePrefixFiles
                    })) && input.ignorePrefixFiles.every((elem: any, _index13: number) => "string" === typeof elem && (/^[^\\]+$/.test(elem) || $guard(_exceptionable, {
                        path: _path + ".ignorePrefixFiles[" + _index13 + "]",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".ignorePrefixFiles[" + _index13 + "]",
                        expected: "(string & Pattern<\"^[^\\\\\\\\]+$\">)",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".ignorePrefixFiles",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | true | undefined)",
                        value: input.ignorePrefixFiles
                    }))) && (undefined === input.detectBinaryFilesWithPrefix || "boolean" === typeof input.detectBinaryFilesWithPrefix || $guard(_exceptionable, {
                        path: _path + ".detectBinaryFilesWithPrefix",
                        expected: "(boolean | undefined)",
                        value: input.detectBinaryFilesWithPrefix
                    })) && ((null !== input.skipCompilePyc || $guard(_exceptionable, {
                        path: _path + ".skipCompilePyc",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.skipCompilePyc
                    })) && (undefined === input.skipCompilePyc || "string" === typeof input.skipCompilePyc && (/^[^\\]+$/.test(input.skipCompilePyc) || $guard(_exceptionable, {
                        path: _path + ".skipCompilePyc",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: input.skipCompilePyc
                    })) || (Array.isArray(input.skipCompilePyc) || $guard(_exceptionable, {
                        path: _path + ".skipCompilePyc",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.skipCompilePyc
                    })) && input.skipCompilePyc.every((elem: any, _index14: number) => "string" === typeof elem && (/^[^\\]+$/.test(elem) || $guard(_exceptionable, {
                        path: _path + ".skipCompilePyc[" + _index14 + "]",
                        expected: "string & Pattern<\"^[^\\\\\\\\]+$\">",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".skipCompilePyc[" + _index14 + "]",
                        expected: "(string & Pattern<\"^[^\\\\\\\\]+$\">)",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".skipCompilePyc",
                        expected: "((string & Pattern<\"^[^\\\\\\\\]+$\">) | Array<PathNoBackslash> | undefined)",
                        value: input.skipCompilePyc
                    }))) && ((null !== input.rpaths || $guard(_exceptionable, {
                        path: _path + ".rpaths",
                        expected: "((string & Default<\"lib/\">) | Array<string> | undefined)",
                        value: input.rpaths
                    })) && (undefined === input.rpaths || "string" === typeof input.rpaths || (Array.isArray(input.rpaths) || $guard(_exceptionable, {
                        path: _path + ".rpaths",
                        expected: "((string & Default<\"lib/\">) | Array<string> | undefined)",
                        value: input.rpaths
                    })) && input.rpaths.every((elem: any, _index15: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".rpaths[" + _index15 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".rpaths",
                        expected: "((string & Default<\"lib/\">) | Array<string> | undefined)",
                        value: input.rpaths
                    }))) && ((null !== input.alwaysIncludeFiles || $guard(_exceptionable, {
                        path: _path + ".alwaysIncludeFiles",
                        expected: "(Array<string> | string | undefined)",
                        value: input.alwaysIncludeFiles
                    })) && (undefined === input.alwaysIncludeFiles || "string" === typeof input.alwaysIncludeFiles || (Array.isArray(input.alwaysIncludeFiles) || $guard(_exceptionable, {
                        path: _path + ".alwaysIncludeFiles",
                        expected: "(Array<string> | string | undefined)",
                        value: input.alwaysIncludeFiles
                    })) && input.alwaysIncludeFiles.every((elem: any, _index16: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".alwaysIncludeFiles[" + _index16 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".alwaysIncludeFiles",
                        expected: "(Array<string> | string | undefined)",
                        value: input.alwaysIncludeFiles
                    }))) && (undefined === input.osxIsApp || "boolean" === typeof input.osxIsApp || $guard(_exceptionable, {
                        path: _path + ".osxIsApp",
                        expected: "((boolean & Default<false>) | undefined)",
                        value: input.osxIsApp
                    })) && (undefined === input.disablePip || "boolean" === typeof input.disablePip || $guard(_exceptionable, {
                        path: _path + ".disablePip",
                        expected: "((boolean & Default<false>) | undefined)",
                        value: input.disablePip
                    })) && (undefined === input.preserveEggDir || "boolean" === typeof input.preserveEggDir || $guard(_exceptionable, {
                        path: _path + ".preserveEggDir",
                        expected: "((boolean & Default<false>) | undefined)",
                        value: input.preserveEggDir
                    })) && ((null !== input.forceUseKeys || $guard(_exceptionable, {
                        path: _path + ".forceUseKeys",
                        expected: "(Array<string> | string | undefined)",
                        value: input.forceUseKeys
                    })) && (undefined === input.forceUseKeys || "string" === typeof input.forceUseKeys || (Array.isArray(input.forceUseKeys) || $guard(_exceptionable, {
                        path: _path + ".forceUseKeys",
                        expected: "(Array<string> | string | undefined)",
                        value: input.forceUseKeys
                    })) && input.forceUseKeys.every((elem: any, _index17: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".forceUseKeys[" + _index17 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".forceUseKeys",
                        expected: "(Array<string> | string | undefined)",
                        value: input.forceUseKeys
                    }))) && ((null !== input.forceIgnoreKeys || $guard(_exceptionable, {
                        path: _path + ".forceIgnoreKeys",
                        expected: "(Array<string> | string | undefined)",
                        value: input.forceIgnoreKeys
                    })) && (undefined === input.forceIgnoreKeys || "string" === typeof input.forceIgnoreKeys || (Array.isArray(input.forceIgnoreKeys) || $guard(_exceptionable, {
                        path: _path + ".forceIgnoreKeys",
                        expected: "(Array<string> | string | undefined)",
                        value: input.forceIgnoreKeys
                    })) && input.forceIgnoreKeys.every((elem: any, _index18: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".forceIgnoreKeys[" + _index18 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".forceIgnoreKeys",
                        expected: "(Array<string> | string | undefined)",
                        value: input.forceIgnoreKeys
                    }))) && (undefined === input.mergeBuildHost || "boolean" === typeof input.mergeBuildHost || $guard(_exceptionable, {
                        path: _path + ".mergeBuildHost",
                        expected: "((boolean & Default<false>) | undefined)",
                        value: input.mergeBuildHost
                    })) && ((null !== input.missingDsoWhitelist || $guard(_exceptionable, {
                        path: _path + ".missingDsoWhitelist",
                        expected: "(Array<string> | string | undefined)",
                        value: input.missingDsoWhitelist
                    })) && (undefined === input.missingDsoWhitelist || "string" === typeof input.missingDsoWhitelist || (Array.isArray(input.missingDsoWhitelist) || $guard(_exceptionable, {
                        path: _path + ".missingDsoWhitelist",
                        expected: "(Array<string> | string | undefined)",
                        value: input.missingDsoWhitelist
                    })) && input.missingDsoWhitelist.every((elem: any, _index19: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".missingDsoWhitelist[" + _index19 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".missingDsoWhitelist",
                        expected: "(Array<string> | string | undefined)",
                        value: input.missingDsoWhitelist
                    }))) && ((null !== input.runpathWhitelist || $guard(_exceptionable, {
                        path: _path + ".runpathWhitelist",
                        expected: "(Array<string> | string | undefined)",
                        value: input.runpathWhitelist
                    })) && (undefined === input.runpathWhitelist || "string" === typeof input.runpathWhitelist || (Array.isArray(input.runpathWhitelist) || $guard(_exceptionable, {
                        path: _path + ".runpathWhitelist",
                        expected: "(Array<string> | string | undefined)",
                        value: input.runpathWhitelist
                    })) && input.runpathWhitelist.every((elem: any, _index20: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".runpathWhitelist[" + _index20 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".runpathWhitelist",
                        expected: "(Array<string> | string | undefined)",
                        value: input.runpathWhitelist
                    }))) && (undefined === input.errorOverdepending || "boolean" === typeof input.errorOverdepending || $guard(_exceptionable, {
                        path: _path + ".errorOverdepending",
                        expected: "((boolean & Default<false>) | undefined)",
                        value: input.errorOverdepending
                    })) && (undefined === input.errorOverlinking || "boolean" === typeof input.errorOverlinking || $guard(_exceptionable, {
                        path: _path + ".errorOverlinking",
                        expected: "((boolean & Default<false>) | undefined)",
                        value: input.errorOverlinking
                    }));
                    const $ao4 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (null !== input.passthrough || $guard(_exceptionable, {
                        path: _path + ".passthrough",
                        expected: "(Array<string> | string | undefined)",
                        value: input.passthrough
                    })) && (undefined === input.passthrough || "string" === typeof input.passthrough || (Array.isArray(input.passthrough) || $guard(_exceptionable, {
                        path: _path + ".passthrough",
                        expected: "(Array<string> | string | undefined)",
                        value: input.passthrough
                    })) && input.passthrough.every((elem: any, _index21: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".passthrough[" + _index21 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".passthrough",
                        expected: "(Array<string> | string | undefined)",
                        value: input.passthrough
                    })) && (undefined === input.env || ("object" === typeof input.env && null !== input.env && false === Array.isArray(input.env) || $guard(_exceptionable, {
                        path: _path + ".env",
                        expected: "(Record<string, string> | undefined)",
                        value: input.env
                    })) && $ao5(input.env, _path + ".env", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".env",
                        expected: "(Record<string, string> | undefined)",
                        value: input.env
                    })) && ((null !== input.secrets || $guard(_exceptionable, {
                        path: _path + ".secrets",
                        expected: "(Array<string> | string | undefined)",
                        value: input.secrets
                    })) && (undefined === input.secrets || "string" === typeof input.secrets || (Array.isArray(input.secrets) || $guard(_exceptionable, {
                        path: _path + ".secrets",
                        expected: "(Array<string> | string | undefined)",
                        value: input.secrets
                    })) && input.secrets.every((elem: any, _index22: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".secrets[" + _index22 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".secrets",
                        expected: "(Array<string> | string | undefined)",
                        value: input.secrets
                    })));
                    const $ao5 = (input: any, _path: string, _exceptionable: boolean = true): boolean => false === _exceptionable || Object.keys(input).every((key: any) => {
                        const value = input[key];
                        if (undefined === value)
                            return true;
                        if (true)
                            return "string" === typeof value || $guard(_exceptionable, {
                                path: _path + $join(key),
                                expected: "string",
                                value: value
                            });
                        return true;
                    });
                    const $ao6 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (undefined === input.weak || "string" === typeof input.weak || $guard(_exceptionable, {
                        path: _path + ".weak",
                        expected: "(string | undefined)",
                        value: input.weak
                    })) && (undefined === input.strong || "string" === typeof input.strong || $guard(_exceptionable, {
                        path: _path + ".strong",
                        expected: "(string | undefined)",
                        value: input.strong
                    })) && (undefined === input.noarch || "string" === typeof input.noarch || $guard(_exceptionable, {
                        path: _path + ".noarch",
                        expected: "(string | undefined)",
                        value: input.noarch
                    })) && (undefined === input.weakConstrains || "string" === typeof input.weakConstrains || $guard(_exceptionable, {
                        path: _path + ".weakConstrains",
                        expected: "(string | undefined)",
                        value: input.weakConstrains
                    })) && (undefined === input.strongConstrains || "string" === typeof input.strongConstrains || $guard(_exceptionable, {
                        path: _path + ".strongConstrains",
                        expected: "(string | undefined)",
                        value: input.strongConstrains
                    }));
                    const $ao7 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (null !== input.imports || $guard(_exceptionable, {
                        path: _path + ".imports",
                        expected: "undefined",
                        value: input.imports
                    })) && (undefined === input.imports || $guard(_exceptionable, {
                        path: _path + ".imports",
                        expected: "undefined",
                        value: input.imports
                    })) && ((null !== input.downstream || $guard(_exceptionable, {
                        path: _path + ".downstream",
                        expected: "undefined",
                        value: input.downstream
                    })) && (undefined === input.downstream || $guard(_exceptionable, {
                        path: _path + ".downstream",
                        expected: "undefined",
                        value: input.downstream
                    }))) && ((null !== input.script || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "(Array<string> | string | undefined)",
                        value: input.script
                    })) && (undefined === input.script || "function" === typeof input.script || "string" === typeof input.script || (Array.isArray(input.script) || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "(Array<string> | string | undefined)",
                        value: input.script
                    })) && input.script.every((elem: any, _index23: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".script[" + _index23 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "(Array<string> | string | undefined)",
                        value: input.script
                    }))) && (undefined === input.extraRequirements || ("object" === typeof input.extraRequirements && null !== input.extraRequirements && false === Array.isArray(input.extraRequirements) || $guard(_exceptionable, {
                        path: _path + ".extraRequirements",
                        expected: "(__type.o4 | undefined)",
                        value: input.extraRequirements
                    })) && $ao8(input.extraRequirements, _path + ".extraRequirements", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".extraRequirements",
                        expected: "(__type.o4 | undefined)",
                        value: input.extraRequirements
                    })) && (undefined === input.files || ("object" === typeof input.files && null !== input.files && false === Array.isArray(input.files) || $guard(_exceptionable, {
                        path: _path + ".files",
                        expected: "(__type.o5 | undefined)",
                        value: input.files
                    })) && $ao9(input.files, _path + ".files", true && _exceptionable) || $guard(_exceptionable, {
                        path: _path + ".files",
                        expected: "(__type.o5 | undefined)",
                        value: input.files
                    }));
                    const $ao8 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (null !== input.build || $guard(_exceptionable, {
                        path: _path + ".build",
                        expected: "(Array<string> | string | undefined)",
                        value: input.build
                    })) && (undefined === input.build || "string" === typeof input.build || (Array.isArray(input.build) || $guard(_exceptionable, {
                        path: _path + ".build",
                        expected: "(Array<string> | string | undefined)",
                        value: input.build
                    })) && input.build.every((elem: any, _index24: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".build[" + _index24 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".build",
                        expected: "(Array<string> | string | undefined)",
                        value: input.build
                    })) && ((null !== input.run || $guard(_exceptionable, {
                        path: _path + ".run",
                        expected: "(Array<string> | string | undefined)",
                        value: input.run
                    })) && (undefined === input.run || "string" === typeof input.run || (Array.isArray(input.run) || $guard(_exceptionable, {
                        path: _path + ".run",
                        expected: "(Array<string> | string | undefined)",
                        value: input.run
                    })) && input.run.every((elem: any, _index25: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".run[" + _index25 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".run",
                        expected: "(Array<string> | string | undefined)",
                        value: input.run
                    })));
                    const $ao9 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (null !== input.source || $guard(_exceptionable, {
                        path: _path + ".source",
                        expected: "(Array<string> | string | undefined)",
                        value: input.source
                    })) && (undefined === input.source || "string" === typeof input.source || (Array.isArray(input.source) || $guard(_exceptionable, {
                        path: _path + ".source",
                        expected: "(Array<string> | string | undefined)",
                        value: input.source
                    })) && input.source.every((elem: any, _index26: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".source[" + _index26 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".source",
                        expected: "(Array<string> | string | undefined)",
                        value: input.source
                    })) && ((null !== input.recipe || $guard(_exceptionable, {
                        path: _path + ".recipe",
                        expected: "(Array<string> | string | undefined)",
                        value: input.recipe
                    })) && (undefined === input.recipe || "string" === typeof input.recipe || (Array.isArray(input.recipe) || $guard(_exceptionable, {
                        path: _path + ".recipe",
                        expected: "(Array<string> | string | undefined)",
                        value: input.recipe
                    })) && input.recipe.every((elem: any, _index27: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".recipe[" + _index27 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".recipe",
                        expected: "(Array<string> | string | undefined)",
                        value: input.recipe
                    })));
                    const $ao10 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (null !== input.downstream || $guard(_exceptionable, {
                        path: _path + ".downstream",
                        expected: "undefined",
                        value: input.downstream
                    })) && (undefined === input.downstream || $guard(_exceptionable, {
                        path: _path + ".downstream",
                        expected: "undefined",
                        value: input.downstream
                    })) && ((null !== input.script || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "undefined",
                        value: input.script
                    })) && (undefined === input.script || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "undefined",
                        value: input.script
                    }))) && ((null !== input.extraRequirements || $guard(_exceptionable, {
                        path: _path + ".extraRequirements",
                        expected: "undefined",
                        value: input.extraRequirements
                    })) && (undefined === input.extraRequirements || $guard(_exceptionable, {
                        path: _path + ".extraRequirements",
                        expected: "undefined",
                        value: input.extraRequirements
                    }))) && ((null !== input.files || $guard(_exceptionable, {
                        path: _path + ".files",
                        expected: "undefined",
                        value: input.files
                    })) && (undefined === input.files || $guard(_exceptionable, {
                        path: _path + ".files",
                        expected: "undefined",
                        value: input.files
                    }))) && ((null !== input.imports || $guard(_exceptionable, {
                        path: _path + ".imports",
                        expected: "(Array<string> | string)",
                        value: input.imports
                    })) && (undefined !== input.imports || $guard(_exceptionable, {
                        path: _path + ".imports",
                        expected: "(Array<string> | string)",
                        value: input.imports
                    })) && ("string" === typeof input.imports || (Array.isArray(input.imports) || $guard(_exceptionable, {
                        path: _path + ".imports",
                        expected: "(Array<string> | string)",
                        value: input.imports
                    })) && input.imports.every((elem: any, _index28: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".imports[" + _index28 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".imports",
                        expected: "(Array<string> | string)",
                        value: input.imports
                    })));
                    const $ao11 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (null !== input.imports || $guard(_exceptionable, {
                        path: _path + ".imports",
                        expected: "undefined",
                        value: input.imports
                    })) && (undefined === input.imports || $guard(_exceptionable, {
                        path: _path + ".imports",
                        expected: "undefined",
                        value: input.imports
                    })) && ((null !== input.script || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "undefined",
                        value: input.script
                    })) && (undefined === input.script || $guard(_exceptionable, {
                        path: _path + ".script",
                        expected: "undefined",
                        value: input.script
                    }))) && ((null !== input.extraRequirements || $guard(_exceptionable, {
                        path: _path + ".extraRequirements",
                        expected: "undefined",
                        value: input.extraRequirements
                    })) && (undefined === input.extraRequirements || $guard(_exceptionable, {
                        path: _path + ".extraRequirements",
                        expected: "undefined",
                        value: input.extraRequirements
                    }))) && ((null !== input.files || $guard(_exceptionable, {
                        path: _path + ".files",
                        expected: "undefined",
                        value: input.files
                    })) && (undefined === input.files || $guard(_exceptionable, {
                        path: _path + ".files",
                        expected: "undefined",
                        value: input.files
                    }))) && ("string" === typeof input.downstream || $guard(_exceptionable, {
                        path: _path + ".downstream",
                        expected: "string",
                        value: input.downstream
                    }));
                    const $ao12 = (input: any, _path: string, _exceptionable: boolean = true): boolean => (null !== input.build || $guard(_exceptionable, {
                        path: _path + ".build",
                        expected: "(Array<string> | string | undefined)",
                        value: input.build
                    })) && (undefined === input.build || "string" === typeof input.build || (Array.isArray(input.build) || $guard(_exceptionable, {
                        path: _path + ".build",
                        expected: "(Array<string> | string | undefined)",
                        value: input.build
                    })) && input.build.every((elem: any, _index29: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".build[" + _index29 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".build",
                        expected: "(Array<string> | string | undefined)",
                        value: input.build
                    })) && ((null !== input.host || $guard(_exceptionable, {
                        path: _path + ".host",
                        expected: "(Array<string> | string | undefined)",
                        value: input.host
                    })) && (undefined === input.host || "string" === typeof input.host || (Array.isArray(input.host) || $guard(_exceptionable, {
                        path: _path + ".host",
                        expected: "(Array<string> | string | undefined)",
                        value: input.host
                    })) && input.host.every((elem: any, _index30: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".host[" + _index30 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".host",
                        expected: "(Array<string> | string | undefined)",
                        value: input.host
                    }))) && ((null !== input.run || $guard(_exceptionable, {
                        path: _path + ".run",
                        expected: "(Array<string> | string | undefined)",
                        value: input.run
                    })) && (undefined === input.run || "string" === typeof input.run || (Array.isArray(input.run) || $guard(_exceptionable, {
                        path: _path + ".run",
                        expected: "(Array<string> | string | undefined)",
                        value: input.run
                    })) && input.run.every((elem: any, _index31: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".run[" + _index31 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".run",
                        expected: "(Array<string> | string | undefined)",
                        value: input.run
                    }))) && ((null !== input.runConstrained || $guard(_exceptionable, {
                        path: _path + ".runConstrained",
                        expected: "(Array<string> | string | undefined)",
                        value: input.runConstrained
                    })) && (undefined === input.runConstrained || "string" === typeof input.runConstrained || (Array.isArray(input.runConstrained) || $guard(_exceptionable, {
                        path: _path + ".runConstrained",
                        expected: "(Array<string> | string | undefined)",
                        value: input.runConstrained
                    })) && input.runConstrained.every((elem: any, _index32: number) => "string" === typeof elem || $guard(_exceptionable, {
                        path: _path + ".runConstrained[" + _index32 + "]",
                        expected: "string",
                        value: elem
                    })) || $guard(_exceptionable, {
                        path: _path + ".runConstrained",
                        expected: "(Array<string> | string | undefined)",
                        value: input.runConstrained
                    })));
                    const $au0 = (input: any, _path: string, _exceptionable: boolean = true): any => (() => {
                        if ("string" === typeof input.downstream)
                            return $ao11(input, _path, true && _exceptionable);
                        else if (null !== input.imports && undefined !== input.imports && ("string" === typeof input.imports || Array.isArray(input.imports) && input.imports.every((elem: any, _index33: number) => "string" === typeof elem)))
                            return $ao10(input, _path, true && _exceptionable);
                        else
                            return $ao7(input, _path, true && _exceptionable);
                    })();
                    return ("object" === typeof input && null !== input || $guard(true, {
                        path: _path + "",
                        expected: "RecipeProps",
                        value: input
                    })) && $ao0(input, _path + "", true) || $guard(true, {
                        path: _path + "",
                        expected: "RecipeProps",
                        value: input
                    });
                })(input, "$input", true);
            return input;
        })(props);
        console.log(props.build?.rpaths);
    }
}
