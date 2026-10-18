#!/usr/bin/env -S deno run -qA --ext=ts
import { Command } from "@cliffy/command";
import { Octokit } from "@octokit/rest";
import { walk } from "@std/fs";
import { Platform } from "lib/models/platform.ts";

const FORGE_DIR = "forge";
const BUILD_WORKFLOW = "main.yaml";
const FIX_WORKFLOW = "autofix-recipe.yaml";
const CI_WORKFLOW_PATH = ".github/workflows/pr.yaml";
const REVIEW_WORKFLOW_PATH = ".github/workflows/claude-code-review.yaml";
const BRANCH_PREFIX = "autofix/";
const AUTOFIX_LABEL = "autofix";
const HUMAN_LABEL = "for-human-review";
const MAX_TURNS = 5;
const EXCERPT_LINES = 150;

// Turn markers are only trusted from the workflow's own token, so neither Claude (which
// comments as claude[bot]) nor anyone else can skip or replay a turn by posting one.
const MARKER_AUTHOR = "github-actions[bot]";
const MARKER = /<!-- autofix:turn=(\d+) responded-to=(\S+) -->/;

export interface LogSection {
  dir: string;
  platform: string;
  lines: string[];
  errors: string[];
}

export interface Failure {
  job: string;
  jobId: number;
  jobUrl: string;
  platforms: Set<string>;
  messages: Set<string>;
  excerpts: Map<string, string[]>;
}

export interface FailedRecipe {
  recipe: string;
  dir: string;
  failures: Map<number, Failure>;
}

export interface TurnMarker {
  turn: number;
  respondedTo: string;
}

/** Recipe directories relative to `forge/`, eg: `github.com/go-task/task`. */
export async function recipeDirs(forgeDir = FORGE_DIR): Promise<Set<string>> {
  const dirs = new Set<string>();
  for await (const e of walk(forgeDir, { match: [/[\\/]recipe\.ts$/], skip: [/[\\/]generated([\\/]|$)/] })) {
    dirs.add(e.path.replaceAll("\\", "/").replace(`${forgeDir}/`, "").replace(/\/recipe\.ts$/, ""));
  }
  return dirs;
}

/**
 * Maps the absolute runner path `scripts/build.ts` uses as an annotation title, eg:
 * `D:\a\brads-forge\brads-forge\forge\github.com\x\y\recipe.ts`, back to a recipe directory.
 * A recipe may itself live under a directory called `forge`, so each `/forge/` segment is
 * tried in turn until one names a recipe that exists.
 */
export function recipeDirFromTitle(title: string, dirs: Set<string>): string | undefined {
  const normalised = title.replaceAll("\\", "/");
  if (!normalised.endsWith("/recipe.ts")) return undefined;
  for (let i = normalised.indexOf(`/${FORGE_DIR}/`); i !== -1; i = normalised.indexOf(`/${FORGE_DIR}/`, i + 1)) {
    const dir = normalised.slice(i + FORGE_DIR.length + 2).replace(/\/recipe\.ts$/, "");
    if (dirs.has(dir)) return dir;
  }
  return undefined;
}

/** Splits a `scripts/build.ts` group name, `<recipe dir>-<platform>`, into its parts. */
export function parseGroupName(name: string, dirs: Set<string>): { dir: string; platform: string } | undefined {
  const m = name.match(/^(.+)-([a-z]+-[a-z0-9]+)$/);
  if (!m || !dirs.has(m[1]) || !Platform.safeParse(m[2]).success) return undefined;
  return { dir: m[1], platform: m[2] };
}

/**
 * Splits a raw job log into one section per recipe build. Any groups opened while a recipe
 * builds (eg: by rattler-build) are tracked so that only the recipe's own `##[endgroup]`
 * closes its section. The runner's own "Process completed" error is about the step, not
 * whichever recipe happened to be last, so it is dropped.
 */
export function parseLog(log: string, dirs: Set<string>): LogSection[] {
  const sections: LogSection[] = [];
  let current: LogSection | undefined;
  let depth = 0;
  for (const raw of log.split(/\r?\n/)) {
    const line = raw
      .replace(/^\uFEFF?\d{4}-\d{2}-\d{2}T[\d:.]+Z ?/, "")
      // deno-lint-ignore no-control-regex
      .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
    if (line.startsWith("##[group]")) {
      const group = parseGroupName(line.slice("##[group]".length).trim(), dirs);
      if (group) {
        current = { ...group, lines: [], errors: [] };
        sections.push(current);
        depth = 1;
        continue;
      }
      depth++;
    } else if (line.startsWith("##[endgroup]") && current && --depth === 0) {
      current = undefined;
    }
    if (!current) continue;
    // A progress bar logs a line per redraw, keep only its last.
    const progress = (_?: string) => _?.includes("%") && _.replace(/[\d.]+/g, "#");
    if (progress(line) && progress(line) === progress(current.lines.at(-1))) current.lines.pop();
    current.lines.push(line);
    const error = line.match(/^##\[error\](.*)$/)?.[1];
    if (error !== undefined && !/^Process completed with exit code \d+\.$/.test(error)) current.errors.push(error);
  }
  return sections;
}

export function parseTurnMarkers(comments: { body?: string | null; user?: { login: string } | null }[]): TurnMarker[] {
  return comments
    .filter((c) => c.user?.login === MARKER_AUTHOR)
    .map((c) => c.body?.match(MARKER))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ turn: Number(m[1]), respondedTo: m[2] }));
}

export function branchFor(dir: string): string {
  return `${BRANCH_PREFIX}${dir}`;
}

function marker(turn: number, respondedTo: string): string {
  return `<!-- autofix:turn=${turn} responded-to=${respondedTo} -->`;
}

async function setOutputs(outputs: Record<string, string | number>) {
  const lines = Object.entries(outputs).map(([k, v]) => `${k}=${v}`);
  console.log(lines.join("\n"));
  const file = Deno.env.get("GITHUB_OUTPUT");
  if (file) await Deno.writeTextFile(file, `${lines.join("\n")}\n`, { append: true });
}

async function writeSummary(markdown: string) {
  const file = Deno.env.get("GITHUB_STEP_SUMMARY");
  if (file) await Deno.writeTextFile(file, `${markdown}\n`, { append: true });
}

function runUrl(): string | undefined {
  const [server, repo, id] = ["GITHUB_SERVER_URL", "GITHUB_REPOSITORY", "GITHUB_RUN_ID"].map((_) => Deno.env.get(_));
  return server && repo && id ? `${server}/${repo}/actions/runs/${id}` : undefined;
}

class GitHub {
  readonly octokit: Octokit;
  readonly owner: string;
  readonly repo: string;
  readonly token: string;

  constructor(repository: string) {
    this.token = Deno.env.get("GH_TOKEN") ?? Deno.env.get("GITHUB_TOKEN") ?? "";
    this.octokit = new Octokit({ auth: this.token, baseUrl: Deno.env.get("GITHUB_API_URL") });
    [this.owner, this.repo] = repository.split("/");
  }

  get r() {
    return { owner: this.owner, repo: this.repo };
  }

  async buildRun(runId: number | undefined, branch: string) {
    if (runId) return (await this.octokit.rest.actions.getWorkflowRun({ ...this.r, run_id: runId })).data;
    const { data } = await this.octokit.rest.actions.listWorkflowRuns({
      ...this.r,
      workflow_id: BUILD_WORKFLOW,
      branch,
      status: "completed",
      per_page: 1,
    });
    return data.workflow_runs.at(0);
  }

  /** The job's raw log; the API answers with a redirect to short lived blob storage. */
  async jobLog(jobId: number): Promise<string> {
    const base = Deno.env.get("GITHUB_API_URL") ?? "https://api.github.com";
    const res = await fetch(`${base}/repos/${this.owner}/${this.repo}/actions/jobs/${jobId}/logs`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
    if (!res.ok) {
      console.warn(`Could not download logs for job ${jobId}: ${res.status} ${res.statusText}`);
      await res.body?.cancel();
      return "";
    }
    return await res.text();
  }

  /**
   * Every recipe a build run reported a `::error` for. Annotations name the exact recipe but
   * GitHub keeps at most 10 errors per step, so the job logs, which keep every one, are read
   * too. The log also holds the build output that led up to each error.
   */
  async failedRecipes(runId: number, dirs: Set<string>): Promise<Map<string, FailedRecipe>> {
    const recipes = new Map<string, FailedRecipe>();
    const failureFor = (dir: string, job: { id: number; name: string; html_url: string | null }) => {
      const recipe = recipes.get(dir) ??
        { recipe: `${FORGE_DIR}/${dir}/recipe.ts`, dir, failures: new Map<number, Failure>() };
      recipes.set(dir, recipe);
      const failure = recipe.failures.get(job.id) ?? {
        job: job.name,
        jobId: job.id,
        jobUrl: job.html_url ?? "",
        platforms: new Set<string>(),
        messages: new Set<string>(),
        excerpts: new Map<string, string[]>(),
      };
      recipe.failures.set(job.id, failure);
      return failure;
    };

    const jobs = await this.octokit.paginate(this.octokit.rest.actions.listJobsForWorkflowRun, {
      ...this.r,
      run_id: runId,
      filter: "latest",
      per_page: 100,
    });
    for (const job of jobs) {
      const annotations = await this.octokit.paginate(this.octokit.rest.checks.listAnnotations, {
        ...this.r,
        check_run_id: job.id,
        per_page: 100,
      });
      for (const a of annotations) {
        if (a.annotation_level !== "failure" || !a.title) continue;
        const dir = recipeDirFromTitle(a.title, dirs);
        if (dir) failureFor(dir, job).messages.add(a.message ?? "");
      }

      for (const section of parseLog(await this.jobLog(job.id), dirs)) {
        if (section.errors.length === 0) continue;
        const failure = failureFor(section.dir, job);
        failure.platforms.add(section.platform);
        section.errors.forEach((e) => failure.messages.add(e));
        failure.excerpts.set(section.platform, section.lines.slice(-EXCERPT_LINES));
      }
    }
    return recipes;
  }

  async openPrFor(branch: string) {
    const { data } = await this.octokit.rest.pulls.list({
      ...this.r,
      state: "open",
      head: `${this.owner}:${branch}`,
    });
    return data.find((pr) => pr.head.repo?.full_name === `${this.owner}/${this.repo}`);
  }

  async openAutofixBranches(): Promise<Set<string>> {
    const prs = await this.octokit.paginate(this.octokit.rest.pulls.list, { ...this.r, state: "open", per_page: 100 });
    return new Set(prs.map((pr) => pr.head.ref).filter((ref) => ref.startsWith(BRANCH_PREFIX)));
  }

  async ensureLabels() {
    const labels = [
      { name: AUTOFIX_LABEL, color: "1d76db", description: "Opened by the autofix workflow to fix a failing recipe" },
      {
        name: HUMAN_LABEL,
        color: "d93f0b",
        description: "Autofix could not get this approved, a human needs to step in",
      },
    ];
    for (const label of labels) {
      try {
        await this.octokit.rest.issues.getLabel({ ...this.r, name: label.name });
      } catch (e) {
        if ((e as { status?: number }).status !== 404) throw e;
        await this.octokit.rest.issues.createLabel({ ...this.r, ...label });
      }
    }
  }

  async addLabel(pr: number, label: string) {
    await this.octokit.rest.issues.addLabels({ ...this.r, issue_number: pr, labels: [label] });
  }

  async comment(pr: number, body: string) {
    await this.octokit.rest.issues.createComment({ ...this.r, issue_number: pr, body });
  }

  async turnMarkers(pr: number): Promise<TurnMarker[]> {
    const comments = await this.octokit.paginate(this.octokit.rest.issues.listComments, {
      ...this.r,
      issue_number: pr,
      per_page: 100,
    });
    return parseTurnMarkers(comments);
  }

  /** The most recent run of each workflow for a commit, keyed by workflow file path. */
  async latestRuns(sha: string) {
    const { data } = await this.octokit.rest.actions.listWorkflowRunsForRepo({
      ...this.r,
      head_sha: sha,
      per_page: 100,
    });
    const runs = new Map<string, typeof data.workflow_runs[number]>();
    for (const run of data.workflow_runs) {
      const seen = runs.get(run.path);
      if (!seen || run.id > seen.id) runs.set(run.path, run);
    }
    return runs;
  }

  /**
   * Who has approved `sha`. Copilot only ever leaves "Commented" reviews, so a Copilot review
   * of the commit that raised no comments counts as its approval.
   */
  async approvals(pr: number, sha: string): Promise<string[]> {
    const approvers = new Set<string>();
    const reviews = await this.octokit.paginate(this.octokit.rest.pulls.listReviews, {
      ...this.r,
      pull_number: pr,
      per_page: 100,
    });
    for (const review of reviews) {
      if (review.commit_id !== sha) continue;
      const login = review.user?.login ?? "";
      if (review.state === "APPROVED") {
        approvers.add(login);
      } else if (/^copilot/i.test(login) && review.state === "COMMENTED") {
        const { data } = await this.octokit.rest.pulls.listCommentsForReview({
          ...this.r,
          pull_number: pr,
          review_id: review.id,
        });
        if (data.length === 0) approvers.add(login);
      }
    }
    return [...approvers];
  }
}

function renderBrief(recipe: FailedRecipe, run: { html_url: string; head_sha: string; created_at: string }): string {
  const out = [
    `# Failing recipe: \`${recipe.recipe}\``,
    "",
    `Reported by the \`${BUILD_WORKFLOW}\` run ${run.html_url} (commit \`${run.head_sha}\`, started ${run.created_at}).`,
  ];
  for (const f of recipe.failures.values()) {
    out.push("", `## Job: ${f.job}`, "", `- Job id: ${f.jobId}`, `- Logs: ${f.jobUrl}`);
    if (f.platforms.size > 0) out.push(`- Platforms: ${[...f.platforms].join(", ")}`);
    out.push("", "Errors:", "", ...[...f.messages].map((m) => `- ${m}`));
    for (const [platform, lines] of f.excerpts) {
      out.push("", `### Last ${lines.length} log lines for ${platform}`, "", "```text", ...lines, "```");
    }
  }
  return out.join("\n");
}

const repoOption = { default: Deno.env.get("GITHUB_REPOSITORY") ?? "brad-jones/brads-forge" };

if (import.meta.main) {
  await new Command()
    .name("autofix")
    .description("Drives the autofix workflows, which hand failing recipes to Claude to fix.")
    .globalOption("--repo <repo:string>", "GitHub repository, as owner/name.", repoOption)
    .action(function () {
      this.showHelp();
    })
    .command("triage")
    .description(
      `Starts \`${FIX_WORKFLOW}\` for each recipe a \`${BUILD_WORKFLOW}\` run reported a \`::error\` for.`,
    )
    .option("--run-id <runId:integer>", `${BUILD_WORKFLOW} run to triage, defaults to the latest completed one.`)
    .option("--ref <ref:string>", "Branch whose builds are triaged & that fixes are dispatched on.", {
      default: Deno.env.get("GITHUB_REF_NAME") ?? "master",
    })
    .option("--limit <limit:integer>", "Most fixes to start in one go, the rest wait for the next triage.", {
      default: 5,
    })
    .option("--dry-run", "Report what would be started without starting anything.")
    .action(async ({ repo, runId, ref, limit, dryRun }) => {
      const gh = new GitHub(repo);
      const run = await gh.buildRun(runId, ref);
      if (!run) {
        console.log(`No completed ${BUILD_WORKFLOW} run found on ${ref}`);
        return;
      }
      console.log(`Triaging ${run.html_url}`);

      const failed = await gh.failedRecipes(run.id, await recipeDirs());
      const open = await gh.openAutofixBranches();
      const started: string[] = [], inFlight: string[] = [], deferred: string[] = [];
      for (const recipe of [...failed.values()].sort((a, b) => a.dir.localeCompare(b.dir))) {
        if (open.has(branchFor(recipe.dir))) {
          inFlight.push(recipe.recipe);
        } else if (started.length >= limit) {
          deferred.push(recipe.recipe);
        } else {
          if (!dryRun) {
            await gh.octokit.rest.actions.createWorkflowDispatch({
              ...gh.r,
              workflow_id: FIX_WORKFLOW,
              ref,
              inputs: { recipe: recipe.recipe, "run-id": String(run.id) },
            });
          }
          started.push(recipe.recipe);
        }
      }

      const list = (title: string, items: string[]) =>
        items.length ? [`### ${title}`, "", ...items.map((_) => `- \`${_}\``), ""] : [];
      const summary = [
        `## Autofix triage of ${run.html_url}`,
        "",
        ...(failed.size === 0 ? ["No recipes failed. :tada:", ""] : []),
        ...list(dryRun ? "Would start a fix" : "Started a fix", started),
        ...list("Already have an open autofix PR", inFlight),
        ...list(`Deferred, over the limit of ${limit}`, deferred),
      ].join("\n");
      console.log(summary);
      await writeSummary(summary);
    })
    .command("brief")
    .description("Writes the failure details Claude starts a fix from, & outputs the branch to push it to.")
    .option("--run-id <runId:integer>", `${BUILD_WORKFLOW} run that reported the failure.`, { required: true })
    .option("--recipe <recipe:string>", "Path to the failing recipe.ts.", { required: true })
    .option("--out <out:string>", "Where to write the markdown brief.", { required: true })
    .action(async ({ repo, runId, recipe, out }) => {
      const gh = new GitHub(repo);
      const dirs = await recipeDirs();
      const dir = recipe.replaceAll("\\", "/").replace(`${FORGE_DIR}/`, "").replace(/\/recipe\.ts$/, "");
      if (!dirs.has(dir)) throw new Error(`${recipe} is not a recipe`);

      const branch = branchFor(dir);
      const pr = await gh.openPrFor(branch);
      if (pr) throw new Error(`${recipe} already has an open autofix PR: ${pr.html_url}`);

      const run = (await gh.buildRun(runId, ""))!;
      const failed = (await gh.failedRecipes(run.id, dirs)).get(dir);
      if (!failed) throw new Error(`${run.html_url} reported no ::error for ${recipe}`);

      await Deno.writeTextFile(out, renderBrief(failed, run));
      console.log(`Written ${out}`);
      await setOutputs({ branch, "max-turns": MAX_TURNS });
    })
    .command("adopt")
    .description("Labels the PR Claude opened for a fix & records it as the first turn.")
    .option("--branch <branch:string>", "Branch the fix was pushed to.", { required: true })
    .action(async ({ repo, branch }) => {
      const gh = new GitHub(repo);
      const pr = await gh.openPrFor(branch);
      if (!pr) throw new Error(`No open PR found for ${branch}, Claude did not finish the first turn`);
      await gh.ensureLabels();
      await gh.addLabel(pr.number, AUTOFIX_LABEL);
      const run = runUrl();
      const link = run ? ` ([run](${run}))` : "";
      await gh.comment(
        pr.number,
        `${marker(1, "none")}\n:wrench: **Autofix turn 1/${MAX_TURNS}** opened this PR${link}. ` +
          `Each time CI & the reviewers finish with a new commit, another turn picks up their feedback.`,
      );
      console.log(`Adopted ${pr.html_url}`);
    })
    .command("gate")
    .description("Decides whether an autofix PR is due another turn, & claims it when it is.")
    .option("--branch <branch:string>", "Head branch of the PR.", { required: true })
    .action(async ({ repo, branch }) => {
      const gh = new GitHub(repo);
      const skip = async (reason: string) => {
        console.log(`No turn: ${reason}`);
        await setOutputs({ action: "none" });
      };

      if (!branch.startsWith(BRANCH_PREFIX)) return await skip(`${branch} is not an autofix branch`);
      const pr = await gh.openPrFor(branch);
      if (!pr) return await skip(`no open PR for ${branch}`);
      const labels = pr.labels.map((_) => _.name);
      if (!labels.includes(AUTOFIX_LABEL)) return await skip(`#${pr.number} is not labelled ${AUTOFIX_LABEL}`);
      if (labels.includes(HUMAN_LABEL)) return await skip(`#${pr.number} is labelled ${HUMAN_LABEL}`);

      // Feedback arrives in pieces, so wait for all of it before spending a turn. Copilot is
      // not waited on: it has no run to watch & usually beats the dry runs, and if it is late
      // its comments are still there for the next turn.
      const head = pr.head.sha;
      const runs = await gh.latestRuns(head);
      const ci = runs.get(CI_WORKFLOW_PATH);
      const review = runs.get(REVIEW_WORKFLOW_PATH);
      if (ci?.status !== "completed") return await skip(`waiting for ${CI_WORKFLOW_PATH} on ${head}`);
      if (review?.status !== "completed") return await skip(`waiting for ${REVIEW_WORKFLOW_PATH} on ${head}`);

      const approvers = await gh.approvals(pr.number, head);
      if (approvers.length > 0 && ci.conclusion === "success") {
        return await skip(`#${pr.number} is approved by ${approvers.join(", ")} & CI passed`);
      }

      const markers = await gh.turnMarkers(pr.number);
      if (markers.some((_) => _.respondedTo === head)) return await skip(`a turn already responded to ${head}`);
      const turn = Math.max(0, ...markers.map((_) => _.turn)) + 1;
      if (turn > MAX_TURNS + 1) return await skip(`#${pr.number} has used all its turns`);

      const action = turn > MAX_TURNS ? "summary" : "turn";
      const run = runUrl();
      const link = run ? ` ([run](${run}))` : "";
      const note = action === "turn"
        ? `:repeat: **Autofix turn ${turn}/${MAX_TURNS}** is working through the CI results & reviews of ${head}${link}.`
        : `:memo: Not approved after ${MAX_TURNS} turns, so autofix is writing up where it got to for a human${link}.`;
      await gh.comment(pr.number, `${marker(turn, head)}\n${note}`);
      await setOutputs({ action, pr: pr.number, turn, head, "max-turns": MAX_TURNS });
    })
    .command("finish")
    .description("Hands an autofix PR to a human once its turns are spent, or when a turn pushed nothing.")
    .option("--pr <pr:integer>", "The autofix PR.", { required: true })
    .option("--head <head:string>", "Head commit the turn responded to.", { required: true })
    .option("--summary", "The turn was the hand-over summary.")
    .action(async ({ repo, pr, head, summary }) => {
      const gh = new GitHub(repo);
      await gh.ensureLabels();
      if (summary) {
        await gh.addLabel(pr, HUMAN_LABEL);
        return;
      }

      // Only a push starts the next round of CI & reviews, so a turn that pushed nothing
      // would leave the PR waiting forever.
      const { data } = await gh.octokit.rest.pulls.get({ ...gh.r, pull_number: pr });
      if (data.state === "open" && data.head.sha === head) {
        await gh.addLabel(pr, HUMAN_LABEL);
        const run = runUrl();
        await gh.comment(
          pr,
          `:raising_hand: This autofix turn${run ? ` ([run](${run}))` : ""} pushed nothing, ` +
            `so no further turns will run. Handing over for human review.`,
        );
      }
    })
    .parse(Deno.args);
}
