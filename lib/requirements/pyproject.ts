import { parse as parseToml } from "@std/toml";
import ky from "ky";
import { z } from "zod";
import { Requirements } from "../models/rattler/requirements.ts";
import { RequirementsContext } from "../models/requirements_context.ts";

/**
 * The subset of PEP 621 / PEP 518 metadata we read out of an upstream `pyproject.toml`.
 */
interface PyProject {
  project?: {
    "requires-python"?: string;
    dependencies?: string[];
  };
  "build-system"?: {
    requires?: string[];
  };
}

export interface PyProjectRequirementsOptions {
  /**
   * Where to fetch the upstream `pyproject.toml` from.
   *
   * Prefer the function form pinned to an immutable tag - it receives the raw
   * upstream version (the same value handed to `sources`) so the derived
   * requirements always match the source archive being packaged.
   */
  url: string | ((tag: string) => string);

  /**
   * conda-forge package names to use in place of the PyPI distribution name.
   *
   * Keys are matched case insensitively. Only needed when the two ecosystems
   * disagree, eg: `{ "opencv-python": "opencv" }`.
   */
  nameMap?: Record<string, string>;

  /**
   * PyPI distributions to drop entirely.
   *
   * Useful for dependencies that are vendored by the conda-forge build, or that
   * simply do not exist on conda-forge. Matched case insensitively.
   */
  exclude?: string[];

  /**
   * Extra conda specs appended to `run`.
   *
   * This is where non-Python runtime dependencies go, eg: an executable such as
   * `git` that the package shells out to, which can never appear in `pyproject.toml`.
   */
  extraRun?: string[];

  /**
   * Extra conda specs appended to `host`.
   */
  extraHost?: string[];

  /**
   * Overrides the python spec that would otherwise be derived from
   * `project.requires-python`.
   *
   * Reach for this when upstream's declared floor is wrong in practice - eg: the
   * metadata says `>=3.10` but the code imports something only added to the
   * stdlib in 3.11.
   */
  python?: string;
}

/**
 * Derives conda `requirements` from an upstream Python project's `pyproject.toml`,
 * so that a recipe's dependency list tracks upstream instead of being transcribed
 * by hand (and then quietly rotting on the next release).
 *
 * ```typescript
 * requirements: r.pyprojectRequirements({
 *   url: (tag) => `https://raw.githubusercontent.com/${owner}/${repo}/refs/tags/${tag}/pyproject.toml`,
 *   extraRun: ["git"],
 * }),
 * ```
 *
 * - `host` is `python`, `pip` and `[build-system].requires`.
 * - `run` is `python` and `[project].dependencies`.
 * - Distribution names are lowercased, then run through `nameMap`. Full PEP 503
 *   normalisation is deliberately *not* applied because conda-forge keeps dots and
 *   underscores in names such as `ruamel.yaml` and `typing_extensions`, which PEP 503
 *   would mangle.
 * - Requirement extras (`pkg[foo]>=1`) are stripped - conda has no notion of extras -
 *   so a dependency only reachable through an extra must be added via `extraRun`.
 * - Environment markers are evaluated against the resolved python spec and the
 *   `RequirementsContext`'s target platform.
 *
 * NB: for a `noarch` recipe there is only one artifact for every platform, so a
 * platform-gated marker will be resolved against whichever platform happens to be
 * generating the recipe. Such a dependency needs a conda selector rather than a
 * marker - `exclude` it here and express it in the recipe.
 */
export function pyprojectRequirements(
  opts: PyProjectRequirementsOptions,
): (ctx: z.output<typeof RequirementsContext>) => Promise<z.output<typeof Requirements>> {
  const nameMap = lowerKeys(opts.nameMap ?? {});
  const exclude = new Set((opts.exclude ?? []).map((_) => _.toLowerCase()));

  // `requirements` is resolved once per target platform, so memoise the fetch
  // rather than pulling the same file down N times.
  let cached: Promise<PyProject> | undefined;
  const getPyProject = (tag: string) => {
    if (!cached) {
      const url = typeof opts.url === "function" ? opts.url(tag) : opts.url;
      console.log(`Deriving conda requirements from ${url}`);
      cached = ky.get(url).text().then((_) => parseToml(_) as PyProject);
    }
    return cached;
  };

  return async (ctx) => {
    const pyproject = await getPyProject(ctx.pkgVersionRaw);

    const pythonSpec = (opts.python ?? pyproject.project?.["requires-python"] ?? "").trim();
    if (pythonSpec === "") {
      throw new Error(
        "pyprojectRequirements: no `project.requires-python` found upstream - set the `python` option explicitly",
      );
    }
    const python = `python ${toCondaVersionSpec(pythonSpec, "requires-python")}`;
    const env = markerEnv(ctx, pythonSpec);

    const convert = (requirements: string[]) =>
      requirements
        .map((_) => parseRequirement(_))
        .filter((_) => _.marker === undefined || evaluateMarker(_.marker, env))
        .filter((_) => !exclude.has(_.name.toLowerCase()))
        .map((_) => {
          const name = nameMap[_.name.toLowerCase()] ?? _.name.toLowerCase();
          const spec = toCondaVersionSpec(_.specifiers, _.raw);
          return spec === "" ? name : `${name} ${spec}`;
        });

    return Requirements.parse({
      host: [
        python,
        "pip",
        ...convert(pyproject["build-system"]?.requires ?? []),
        ...(opts.extraHost ?? []),
      ],
      run: [
        python,
        ...convert(pyproject.project?.dependencies ?? []),
        ...(opts.extraRun ?? []),
      ],
    });
  };
}

const lowerKeys = (v: Record<string, string>) =>
  Object.fromEntries(Object.entries(v).map(([k, val]) => [k.toLowerCase(), val]));

interface ParsedRequirement {
  raw: string;
  name: string;
  specifiers: string;
  marker?: string;
}

// PEP 508: `name [extras] [version-specifiers] [; marker]`
const REQUIREMENT_RE = /^([A-Za-z0-9][A-Za-z0-9._-]*)\s*(?:\[[^\]]*\])?\s*([^;]*?)\s*(?:;\s*(.+))?$/;

export function parseRequirement(requirement: string): ParsedRequirement {
  const raw = requirement.trim();

  if (raw.includes("@")) {
    throw new Error(`direct url references have no conda equivalent: "${raw}"`);
  }

  const match = REQUIREMENT_RE.exec(raw);
  if (!match) throw new Error(`unparsable PEP 508 requirement: "${raw}"`);

  return {
    raw,
    name: match[1],
    specifiers: match[2] ?? "",
    marker: match[3],
  };
}

/**
 * Maps a PEP 440 specifier list onto a conda match spec.
 *
 * The two are near enough identical - comma separated clauses that all have to
 * hold - so most operators pass straight through. The exceptions are `~=`, which
 * is expanded into the range it stands for, and `===`, which has no equivalent.
 */
export function toCondaVersionSpec(specifiers: string, context: string): string {
  return specifiers
    .split(",")
    .map((_) => _.trim())
    .filter((_) => _ !== "")
    .flatMap((clause) => {
      const match = /^(===|==|!=|<=|>=|~=|<|>)\s*(.+)$/.exec(clause);
      if (!match) throw new Error(`unsupported version specifier "${clause}" in "${context}"`);
      const [, op, version] = match;
      if (op === "===") {
        throw new Error(`arbitrary equality (===) has no conda equivalent, in "${context}"`);
      }
      if (op === "~=") return expandCompatibleRelease(version, context);
      return [`${op}${version}`];
    })
    .join(",");
}

/** `~=1.4.5` means `>=1.4.5,<1.5`; `~=2.2` means `>=2.2,<3`. */
function expandCompatibleRelease(version: string, context: string): string[] {
  const parts = version.split(".");
  if (parts.length < 2) {
    throw new Error(`"~=${version}" needs at least two release segments, in "${context}"`);
  }
  const upper = parts.slice(0, -1);
  const last = Number(upper[upper.length - 1]);
  if (!Number.isInteger(last)) {
    throw new Error(`"~=${version}" has a non numeric release segment, in "${context}"`);
  }
  upper[upper.length - 1] = String(last + 1);
  return [`>=${version}`, `<${upper.join(".")}`];
}

type MarkerEnv = Record<string, string>;

/** Marker variables whose values compare as versions rather than as strings. */
const VERSION_VARS = new Set(["python_version", "python_full_version"]);

const SYS_PLATFORM: Record<string, string> = { linux: "linux", osx: "darwin", win: "win32" };
const PLATFORM_SYSTEM: Record<string, string> = { linux: "Linux", osx: "Darwin", win: "Windows" };
const PLATFORM_MACHINE: Record<string, string> = { "64": "x86_64", "32": "i686" };

export function markerEnv(ctx: z.output<typeof RequirementsContext>, pythonSpec: string): MarkerEnv {
  const parts = pythonMarkerVersion(pythonSpec).split(".");
  return {
    python_version: parts.slice(0, 2).join("."),
    python_full_version: [...parts, "0", "0"].slice(0, 3).join("."),
    implementation_name: "cpython",
    platform_python_implementation: "CPython",
    sys_platform: SYS_PLATFORM[ctx.targetOs] ?? ctx.targetOs,
    platform_system: PLATFORM_SYSTEM[ctx.targetOs] ?? ctx.targetOs,
    os_name: ctx.targetOs === "win" ? "nt" : "posix",
    platform_machine: PLATFORM_MACHINE[ctx.targetArch] ?? ctx.targetArch,
    // We never request extras, so anything gated behind one is dropped.
    extra: "",
  };
}

/** Pulls the lower bound out of a python spec, for use as `python_version` in markers. */
function pythonMarkerVersion(spec: string): string {
  for (const clause of spec.split(",")) {
    const match = /^\s*(>=|==|~=|>)\s*(\d+(?:\.\d+)*)/.exec(clause);
    if (match) return match[2];
  }
  throw new Error(
    `unable to derive a python version for marker evaluation from "${spec}" - set the \`python\` option explicitly`,
  );
}

interface Token {
  kind: "var" | "str" | "op" | "lparen" | "rparen" | "and" | "or";
  value: string;
}

function tokenizeMarker(marker: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < marker.length) {
    const c = marker[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    if (c === "(" || c === ")") {
      tokens.push({ kind: c === "(" ? "lparen" : "rparen", value: c });
      i++;
      continue;
    }

    if (c === '"' || c === "'") {
      const end = marker.indexOf(c, i + 1);
      if (end === -1) throw new Error(`unterminated string in marker: "${marker}"`);
      tokens.push({ kind: "str", value: marker.slice(i + 1, end) });
      i = end + 1;
      continue;
    }

    const op = /^(===|==|!=|<=|>=|~=|<|>)/.exec(marker.slice(i));
    if (op) {
      tokens.push({ kind: "op", value: op[1] });
      i += op[1].length;
      continue;
    }

    const word = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(marker.slice(i));
    if (word) {
      i += word[0].length;
      switch (word[0]) {
        case "and":
          tokens.push({ kind: "and", value: word[0] });
          break;
        case "or":
          tokens.push({ kind: "or", value: word[0] });
          break;
        case "in":
          tokens.push({ kind: "op", value: "in" });
          break;
        case "not": {
          const not = /^\s+in\b/.exec(marker.slice(i));
          if (!not) throw new Error(`expected "in" after "not" in marker: "${marker}"`);
          i += not[0].length;
          tokens.push({ kind: "op", value: "not in" });
          break;
        }
        default:
          tokens.push({ kind: "var", value: word[0] });
      }
      continue;
    }

    throw new Error(`unexpected character "${c}" in marker: "${marker}"`);
  }

  return tokens;
}

/**
 * Evaluates a PEP 508 environment marker.
 *
 * Only the marker variables we can answer for are supported - anything else
 * throws, so that an unhandled marker surfaces as a failed recipe generation
 * rather than a silently wrong dependency list.
 */
export function evaluateMarker(marker: string, env: MarkerEnv): boolean {
  const tokens = tokenizeMarker(marker);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  const parseOr = (): boolean => {
    let result = parseAnd();
    while (peek()?.kind === "or") {
      next();
      result = parseAnd() || result;
    }
    return result;
  };

  const parseAnd = (): boolean => {
    let result = parseAtom();
    while (peek()?.kind === "and") {
      next();
      result = parseAtom() && result;
    }
    return result;
  };

  const parseAtom = (): boolean => {
    if (peek()?.kind === "lparen") {
      next();
      const result = parseOr();
      if (peek()?.kind !== "rparen") throw new Error(`missing ")" in marker: "${marker}"`);
      next();
      return result;
    }
    return parseComparison();
  };

  const operand = (token: Token | undefined): string => {
    if (!token) throw new Error(`unexpected end of marker: "${marker}"`);
    if (token.kind === "str") return token.value;
    if (token.kind !== "var") throw new Error(`expected an operand in marker: "${marker}"`);
    const value = env[token.value];
    if (value === undefined) {
      throw new Error(`unsupported marker variable "${token.value}" in marker: "${marker}"`);
    }
    return value;
  };

  const parseComparison = (): boolean => {
    const lhs = next();
    const op = next();
    const rhs = next();
    if (!op || op.kind !== "op") throw new Error(`expected a comparison operator in marker: "${marker}"`);

    const l = operand(lhs);
    const r = operand(rhs);

    if (op.value === "in") return r.includes(l);
    if (op.value === "not in") return !r.includes(l);
    if (op.value === "===") return l === r;

    const asVersion = (lhs?.kind === "var" && VERSION_VARS.has(lhs.value)) ||
      (rhs?.kind === "var" && VERSION_VARS.has(rhs.value));

    return asVersion ? compareVersions(l, op.value, r) : compareStrings(l, op.value, r);
  };

  const result = parseOr();
  if (pos !== tokens.length) throw new Error(`trailing tokens in marker: "${marker}"`);
  return result;
}

function compareStrings(l: string, op: string, r: string): boolean {
  switch (op) {
    case "==":
      return l === r;
    case "!=":
      return l !== r;
    case "<":
      return l < r;
    case "<=":
      return l <= r;
    case ">":
      return l > r;
    case ">=":
      return l >= r;
    default:
      throw new Error(`unsupported marker operator "${op}"`);
  }
}

function compareVersions(l: string, op: string, r: string): boolean {
  // `python_version == "3.11.*"` is a prefix match, not an ordering comparison.
  if (r.endsWith(".*") && (op === "==" || op === "!=")) {
    const prefix = r.slice(0, -1);
    const matches = `${l}.`.startsWith(prefix);
    return op === "==" ? matches : !matches;
  }

  const cmp = compareReleases(l, r);
  switch (op) {
    case "==":
      return cmp === 0;
    case "!=":
      return cmp !== 0;
    case "<":
      return cmp < 0;
    case "<=":
      return cmp <= 0;
    case ">":
      return cmp > 0;
    case ">=":
      return cmp >= 0;
    case "~=":
      throw new Error(`"~=" is not supported in environment markers`);
    default:
      throw new Error(`unsupported marker operator "${op}"`);
  }
}

function compareReleases(l: string, r: string): number {
  const a = l.split(".");
  const b = r.split(".");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? "0";
    const y = b[i] ?? "0";
    const nx = Number(x);
    const ny = Number(y);
    if (Number.isInteger(nx) && Number.isInteger(ny)) {
      if (nx !== ny) return nx < ny ? -1 : 1;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}
