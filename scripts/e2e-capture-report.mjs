// Publishes the e2e capture sweep to the pull request the current commit belongs to.
//
//   node scripts/e2e-capture-report.mjs
//
// Run from .github/workflows/e2e.yaml after the suite, pass or fail. It does
// three things:
//   1. uploads e2e/captures/**.png as assets of one long-lived prerelease
//   2. rewrites a single sticky comment on the pull request that embeds them
//   3. deletes the assets of pull requests that are no longer open
//
// Why a release and not a branch: a comment can only show an image from a public
// http(s) URL -- GitHub's sanitizer drops `data:` sources, and an actions
// artifact is a single zip that needs a login -- so the files have to live
// somewhere fetchable. A branch would do it, but `git fetch` takes refs/heads/*
// by default, so every clone and pull of this repository would carry every
// screenshot ever taken. Release assets are outside the object database
// entirely, so they cost a reader nothing.
//
// Environment (all provided by Actions unless noted):
//   GITHUB_TOKEN         needs contents: write and pull-requests: write
//   GITHUB_REPOSITORY    owner/repo
//   GITHUB_SHA           the commit the captures were taken from
//   GITHUB_RUN_ID        makes each run's asset names unique -- see below
//   GITHUB_RUN_NUMBER    shown in the comment
//   E2E_RESULT           outcome of the test step: "success" | "failure"
//   E2E_CAPTURE_RELEASE  tag holding the assets (default "e2e-captures")
//
// `--dry-run` uploads nothing and prints the comment it would have posted, which
// is how the layout is checked against a local `bun run e2e` without a token.
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CAPTURE_DIR = process.env.E2E_CAPTURE_DIR ?? join(ROOT, "e2e", "captures");

/** Identifies the comment this script owns, so a run updates it instead of adding one. */
const MARKER = "<!-- e2e-captures -->";

const TAG = process.env.E2E_CAPTURE_RELEASE ?? "e2e-captures";
const RELEASE_NAME = "E2E captures";
const RELEASE_BODY = [
  "Screenshots taken by the E2E workflow and embedded in pull request comments.",
  "",
  "Not a version of anything -- the assets are replaced on every run and removed",
  "once their pull request closes.",
].join("\n");

const dryRun = process.argv.slice(2).includes("--dry-run");

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY ?? "miyamo2/blog.miyamo.today";
const sha = process.env.GITHUB_SHA ?? "0".repeat(40);
const runId = process.env.GITHUB_RUN_ID ?? "local";
const runNumber = process.env.GITHUB_RUN_NUMBER ?? runId;
/** Re-running a workflow keeps the run id and bumps this, so both are in the name. */
const runKey = `${runId}.${process.env.GITHUB_RUN_ATTEMPT ?? "1"}`;
const result = process.env.E2E_RESULT ?? "success";

const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
const uploadUrl = process.env.GITHUB_UPLOAD_URL ?? "https://uploads.github.com";

/** Widest project first: the desktop shots are the ones worth opening first. */
const PROJECT_ORDER = ["desktop-chromium", "mobile-chromium"];

const log = (message) => console.log(`\x1b[36m[e2e-report]\x1b[0m ${message}`);

const api = async (path, options = {}) => {
  const { body, method = "GET", headers = {}, base = apiUrl, raw } = options;
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(raw ? {} : body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  if (!response.ok) {
    throw new Error(`${method} ${url} -> ${response.status} ${await response.text()}`);
  }
  return response.status === 204 ? undefined : response.json();
};

/**
 * Retries the transient half of the API surface.
 *
 * Asset uploads are the only calls here that move megabytes, and they are the
 * only ones observed to drop; everything else is small enough that one attempt
 * is honest.
 */
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

/**
 * The one release every run writes to, created on first use.
 *
 * `make_latest: false` keeps it off the repository's front page, and the
 * prerelease flag keeps it out of the "latest release" API for anyone reading
 * this repository for its actual releases.
 */
const ensureRelease = async () => {
  try {
    return await api(`/repos/${repository}/releases/tags/${TAG}`);
  } catch (error) {
    if (!error.message.includes("-> 404")) throw error;
  }
  log(`creating the ${TAG} release`);
  try {
    return await api(`/repos/${repository}/releases`, {
      method: "POST",
      body: {
        tag_name: TAG,
        name: RELEASE_NAME,
        body: RELEASE_BODY,
        prerelease: true,
        make_latest: "false",
      },
    });
  } catch (error) {
    // two pull requests can race for the first run; the loser reads what won
    if (!error.message.includes("-> 422")) throw error;
    return api(`/repos/${repository}/releases/tags/${TAG}`);
  }
};

const listAssets = async (releaseId) => {
  const assets = [];
  for (let page = 1; ; page++) {
    const batch = await api(
      `/repos/${repository}/releases/${releaseId}/assets?per_page=100&page=${page}`
    );
    assets.push(...batch);
    if (batch.length < 100) return assets;
  }
};

/** `pr-12-4711-desktop-chromium-article-list-light.png` -> 12 */
const assetPullNumber = (name) => {
  const match = /^pr-(\d+)-/.exec(name);
  return match ? Number(match[1]) : undefined;
};

const deleteAsset = (asset) =>
  api(`/repos/${repository}/releases/assets/${asset.id}`, { method: "DELETE" });

/**
 * Drops what the release no longer has to serve: this pull request's previous
 * run, and everything belonging to a pull request that has since closed.
 *
 * A closed pull request's comment loses its images, which is the intended
 * trade -- these are a review aid for an open change, not a record.
 */
const pruneAssets = async (assets, currentNumber) => {
  const states = new Map([[currentNumber, "open"]]);
  const stale = [];

  for (const asset of assets) {
    const number = assetPullNumber(asset.name);
    if (number === undefined) continue;
    if (number === currentNumber) {
      stale.push(asset);
      continue;
    }
    if (!states.has(number)) {
      const pull = await api(`/repos/${repository}/pulls/${number}`).catch(() => undefined);
      states.set(number, pull?.state ?? "closed");
    }
    if (states.get(number) !== "open") stale.push(asset);
  }

  if (stale.length === 0) return;
  log(`deleting ${stale.length} stale asset(s)`);
  for (const asset of stale) {
    await deleteAsset(asset).catch((error) => log(`could not delete ${asset.name}: ${error.message}`));
  }
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
  return projects.sort((a, b) => rank(a.project) - rank(b.project) || a.project.localeCompare(b.project));
};

/**
 * Asset names are flat, so the project has to be part of the name -- and so does
 * the run: GitHub proxies comment images through camo, which caches by URL, and
 * a re-run that reused a name would keep showing the previous screenshot.
 */
const assetName = (pullNumber, project, file) => `pr-${pullNumber}-${runKey}-${project}-${file}`;

const uploadCapture = async (releaseId, pullNumber, project, file) => {
  const name = assetName(pullNumber, project, file);
  if (dryRun) return `${serverUrl}/${repository}/releases/download/${TAG}/${name}`;
  const body = await readFile(join(CAPTURE_DIR, project, file));
  const asset = await withRetry(`upload ${name}`, async () => {
    try {
      return await api(
        `/repos/${repository}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`,
        { method: "POST", base: uploadUrl, headers: { "content-type": "image/png" }, raw: body }
      );
    } catch (error) {
      // a retry after a response that was lost on the way back: the upload landed
      if (!error.message.includes("-> 422")) throw error;
      const existing = (await listAssets(releaseId)).find((candidate) => candidate.name === name);
      if (!existing) throw error;
      return existing;
    }
  });
  return asset.browser_download_url;
};

/**
 * Splits `article-list-light` into the screen and the theme it was taken in.
 * The captures with no suffix (the modals, the article sidebar) are light-mode
 * shots too -- no spec toggles the theme before taking them.
 */
const splitName = (file) => {
  const name = file.replace(/\.png$/, "");
  const match = /-(light|dark)$/.exec(name);
  return match ? { screen: name.slice(0, -match[0].length), theme: match[1] } : { screen: name, theme: "light" };
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
  const shortSha = sha?.slice(0, 7) ?? "unknown";
  const runLink = `${serverUrl}/${repository}/actions/runs/${runId}`;
  const lines = [
    MARKER,
    "### 📸 E2E captures",
    "",
    `${status} · commit [\`${shortSha}\`](${serverUrl}/${repository}/commit/${sha}) · [run #${runNumber}](${runLink})`,
    "",
  ];

  if (sections.length === 0) {
    lines.push(
      `No captures were produced by this run — see [the logs](${runLink}) for what stopped it.`
    );
  } else {
    for (const section of sections) {
      lines.push(
        `<details>`,
        `<summary><b>${section.project}</b> · ${section.rows.length} screens</summary>`,
        "",
        table(section.rows),
        "",
        `</details>`,
        ""
      );
    }
    lines.push(
      `<sub>Hosted as assets of the [\`${TAG}\`](${serverUrl}/${repository}/releases/tag/${TAG}) prerelease, which later runs clean up once this pull request closes. The full set, plus traces and videos for anything that failed, is on [the run](${runLink}).</sub>`
    );
  }

  return lines.join("\n");
};

const upsertComment = async (pullNumber, body) => {
  for (let page = 1; ; page++) {
    const comments = await api(
      `/repos/${repository}/issues/${pullNumber}/comments?per_page=100&page=${page}`
    );
    const mine = comments.find((comment) => comment.body?.startsWith(MARKER));
    if (mine) {
      await api(`/repos/${repository}/issues/comments/${mine.id}`, { method: "PATCH", body: { body } });
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
  const release = dryRun ? { id: 0 } : await ensureRelease();
  if (!dryRun) await pruneAssets(await listAssets(release.id), pull.number);

  const sections = [];
  for (const { project, files } of captures) {
    const rows = new Map();
    for (const file of files) {
      const url = await uploadCapture(release.id, pull.number, project, file);
      const { screen, theme } = splitName(file);
      rows.set(screen, { ...rows.get(screen), [theme]: url });
    }
    log(dryRun ? `${files.length} capture(s) for ${project}` : `uploaded ${files.length} capture(s) for ${project}`);
    sections.push({ project, rows: [...rows] });
  }

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
