// Publishes the e2e capture sweep to the pull request the current commit belongs to.
//
//   node scripts/e2e-capture-report.mjs [--dry-run]
//
// Run from .github/workflows/e2e.yaml after the suite, pass or fail. It commits
// e2e/captures/ as an orphan commit, pushes it to a ref of its own, and rewrites
// a single sticky comment on the pull request that embeds the screenshots from
// raw.githubusercontent.com.
//
// Why a ref outside refs/heads/*
// ------------------------------
// A comment can only show an image from a public http(s) URL: GitHub's sanitizer
// drops `data:` sources, and an actions artifact is a zip that needs a login. So
// the files have to be fetchable, which leaves three places to put them, and this
// is the only one that costs nothing:
//
//   a branch          `git fetch` takes refs/heads/* by default, so every clone
//                     and pull of this repository would carry every screenshot
//   Git LFS           keeps clones small, but storage and bandwidth are metered
//                     and deleting the files does not give the quota back
//   release assets    free and unmetered, but a repository with no releases grows
//                     a Releases section that exists only to hold screenshots
//
// `refs/e2e-captures/*` is in none of those ways visible: not in the branch list,
// not in the Releases tab, and not in the default fetch refspec
// (`+refs/heads/*:refs/remotes/origin/*`), so nobody's clone or pull pays for it.
// Verified: GITHUB_TOKEN with contents: write may push such a ref, and raw serves
// a blob by commit sha without the commit being reachable from any branch.
//
// One ref per run, never rewritten, so a comment written months ago still resolves
// -- the ref is what keeps the objects from being collected. To reclaim the space
// of a pull request that no longer matters:
//
//   git ls-remote origin 'refs/e2e-captures/*'
//   git push origin :refs/e2e-captures/pr-42/12345678.1
//
// Environment (all provided by Actions unless noted):
//   GITHUB_TOKEN         needs contents: write and pull-requests: write
//   GITHUB_REPOSITORY    owner/repo
//   GITHUB_SHA           the commit the captures were taken from
//   GITHUB_RUN_ID        names the ref, with GITHUB_RUN_ATTEMPT
//   GITHUB_RUN_NUMBER    shown in the comment
//   E2E_RESULT           outcome of the test step: "success" | "failure"
//
// `--dry-run` pushes nothing and prints the comment it would have posted, which is
// how the layout is checked against a local `bun run e2e` without a token.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CAPTURE_DIR = process.env.E2E_CAPTURE_DIR ?? join(ROOT, "e2e", "captures");

/** Identifies the comment this script owns, so a run updates it instead of adding one. */
const MARKER = "<!-- e2e-captures -->";

const dryRun = process.argv.slice(2).includes("--dry-run");

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY ?? "miyamo2/blog.miyamo.today";
const sha = process.env.GITHUB_SHA ?? "0".repeat(40);
const runId = process.env.GITHUB_RUN_ID ?? "local";
const runNumber = process.env.GITHUB_RUN_NUMBER ?? runId;
/** Re-running a workflow keeps the run id and bumps the attempt; the ref needs both. */
const runKey = `${runId}.${process.env.GITHUB_RUN_ATTEMPT ?? "1"}`;
const result = process.env.E2E_RESULT ?? "success";

const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
const rawUrl = process.env.GITHUB_RAW_URL ?? "https://raw.githubusercontent.com";

/** Widest project first: the desktop shots are the ones worth opening first. */
const PROJECT_ORDER = ["desktop-chromium", "mobile-chromium"];

const log = (message) => console.log(`\x1b[36m[e2e-report]\x1b[0m ${message}`);

const api = async (path, options = {}) => {
  const { body, method = "GET" } = options;
  const response = await fetch(path.startsWith("http") ? path : `${apiUrl}${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`${method} ${path} -> ${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? undefined : response.json();
};

/**
 * Runs git, returning its stdout. The remote url carries the token, so nothing
 * here echoes a command; Actions masks GITHUB_TOKEN in logs either way.
 */
const git = (args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`git ${args[0]} failed (${code}): ${stderr.trim()}`))
    );
  });

/** Retries the one step that moves megabytes and can lose a connection. */
const withRetry = async (label, attempt, attempts = 3) => {
  for (let n = 1; ; n++) {
    try {
      return await attempt();
    } catch (error) {
      if (n >= attempts) throw error;
      log(`${label} failed (attempt ${n}/${attempts}), retrying: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * n));
    }
  }
};

/** The pull request this push belongs to, or undefined when the branch has none. */
const resolvePullRequest = async () => {
  const pulls = await api(`/repos/${repository}/commits/${sha}/pulls`);
  return pulls.find((pull) => pull.state === "open") ?? pulls[0];
};

const collectCaptures = async () => {
  if (!existsSync(CAPTURE_DIR)) return [];
  const entries = await readdir(CAPTURE_DIR, { withFileTypes: true });
  const projects = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const files = (await readdir(join(CAPTURE_DIR, entry.name)))
      .filter((file) => file.endsWith(".png"))
      .sort();
    if (files.length > 0) projects.push({ project: entry.name, files });
  }
  const rank = (name) => {
    const index = PROJECT_ORDER.indexOf(name);
    return index === -1 ? PROJECT_ORDER.length : index;
  };
  return projects.sort(
    (a, b) => rank(a.project) - rank(b.project) || a.project.localeCompare(b.project)
  );
};

/**
 * Commits the captures in a scratch repository -- the checkout the workflow is
 * standing in is never touched -- and pushes that single parentless commit to
 * this run's own ref. Returns the commit the raw urls will point at.
 */
const publishCaptures = async (pullNumber, captures) => {
  const work = await mkdtemp(join(tmpdir(), "e2e-captures-"));
  for (const { project, files } of captures) {
    await mkdir(join(work, project), { recursive: true });
    for (const file of files) {
      await copyFile(join(CAPTURE_DIR, project, file), join(work, project, file));
    }
  }

  await git(["init", "-q"], work);
  await git(["config", "user.name", "github-actions[bot]"], work);
  await git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], work);
  // the runner has no signing key, and a signature would mean nothing here anyway
  await git(["config", "commit.gpgsign", "false"], work);
  await git(["add", "-A"], work);
  await git(["commit", "-q", "-m", `e2e captures for #${pullNumber} (run ${runKey})`], work);
  await git(["remote", "add", "origin", `https://x-access-token:${token}@github.com/${repository}.git`], work);

  const ref = `refs/e2e-captures/pr-${pullNumber}/${runKey}`;
  await withRetry("push captures", () => git(["push", "origin", `HEAD:${ref}`], work));
  log(`pushed ${ref}`);
  return (await git(["rev-parse", "HEAD"], work)).trim();
};

/**
 * Splits `article-list-light` into the screen and the theme it was taken in.
 * The captures with no suffix (the modals, the article sidebar) are light-mode
 * shots too -- no spec toggles the theme before taking them.
 */
const splitName = (file) => {
  const name = file.replace(/\.png$/, "");
  const match = /-(light|dark)$/.exec(name);
  return match
    ? { screen: name.slice(0, -match[0].length), theme: match[1] }
    : { screen: name, theme: "light" };
};

const table = (rows) => {
  const lines = ["| screen | light | dark |", "| --- | --- | --- |"];
  for (const [screen, shots] of rows) {
    const cell = (url) => (url ? `<img src="${url}" width="360">` : "—");
    lines.push(`| \`${screen}\` | ${cell(shots.light)} | ${cell(shots.dark)} |`);
  }
  return lines.join("\n");
};

const buildBody = (sections) => {
  const status = result === "success" ? "✅ passed" : "❌ failed";
  const runLink = `${serverUrl}/${repository}/actions/runs/${runId}`;
  const lines = [
    MARKER,
    "### 📸 E2E captures",
    "",
    `${status} · commit [\`${sha.slice(0, 7)}\`](${serverUrl}/${repository}/commit/${sha}) · [run #${runNumber}](${runLink})`,
    "",
  ];

  if (sections.length === 0) {
    lines.push(
      `No captures were produced by this run — see [the logs](${runLink}) for what stopped it.`
    );
    return lines.join("\n");
  }

  for (const section of sections) {
    lines.push(
      "<details>",
      `<summary><b>${section.project}</b> · ${section.rows.length} screens</summary>`,
      "",
      table(section.rows),
      "",
      "</details>",
      ""
    );
  }
  lines.push(
    `<sub>Kept on \`refs/e2e-captures/pr-*\`, which is outside the default fetch refspec — no clone or pull carries these. Traces and videos for anything that failed are on [the run](${runLink}).</sub>`
  );
  return lines.join("\n");
};

const upsertComment = async (pullNumber, body) => {
  for (let page = 1; ; page++) {
    const comments = await api(
      `/repos/${repository}/issues/${pullNumber}/comments?per_page=100&page=${page}`
    );
    const mine = comments.find((comment) => comment.body?.startsWith(MARKER));
    if (mine) {
      await api(`/repos/${repository}/issues/comments/${mine.id}`, {
        method: "PATCH",
        body: { body },
      });
      log(`updated comment ${mine.id}`);
      return;
    }
    if (comments.length < 100) break;
  }
  await api(`/repos/${repository}/issues/${pullNumber}/comments`, { method: "POST", body: { body } });
  log(`commented on #${pullNumber}`);
};

const main = async () => {
  if (!dryRun) {
    if (!token) throw new Error("GITHUB_TOKEN is required");
    if (!process.env.GITHUB_REPOSITORY || !process.env.GITHUB_SHA) {
      throw new Error("GITHUB_REPOSITORY and GITHUB_SHA are required");
    }
  }

  const pull = dryRun ? { number: 0, state: "open" } : await resolvePullRequest();
  if (!pull) {
    log(`${sha.slice(0, 7)} belongs to no pull request; nothing to comment on`);
    return;
  }
  if (pull.state !== "open") {
    log(`#${pull.number} is ${pull.state}; leaving it alone`);
    return;
  }

  const captures = await collectCaptures();
  const commit =
    captures.length === 0
      ? undefined
      : dryRun
        ? "0".repeat(40)
        : await publishCaptures(pull.number, captures);

  const sections = captures.map(({ project, files }) => {
    const rows = new Map();
    for (const file of files) {
      const { screen, theme } = splitName(file);
      const url = `${rawUrl}/${repository}/${commit}/${project}/${file}`;
      rows.set(screen, { ...rows.get(screen), [theme]: url });
    }
    return { project, rows: [...rows] };
  });

  const body = buildBody(sections);
  if (dryRun) {
    console.log(`\n${body}\n`);
    return;
  }
  await upsertComment(pull.number, body);
};

try {
  await main();
} catch (error) {
  console.error(`\x1b[31m[e2e-report]\x1b[0m ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
