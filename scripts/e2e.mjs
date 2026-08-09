// End-to-end test runner.
//
//   node scripts/e2e.mjs [-- playwright args...]
//
// The suite runs against a *production build* served by `astro preview`, so what
// it exercises is what gets deployed. Neither the blog API nor the GitHub API is
// reachable from CI, so the build is pointed at scripts/mock-api.mjs -- the same
// mock the build verification already uses.
//
// Responsibilities, in order:
//   1. install the e2e workspace's own dependencies (e2e/package.json) if needed
//   2. start the mock API and wait for it to answer
//   3. build the site against the mock (skippable, see --skip-build)
//   4. run playwright, which starts `astro preview` itself (see e2e/playwright.config.ts)
//   5. stop the mock, whatever happened
//
// Environment:
//   E2E_MOCK_PORT   port for scripts/mock-api.mjs           (default 8787)
//   E2E_PORT        port `astro preview` is served on       (default 4321)
//   E2E_SKIP_BUILD  "1" to reuse the dist/ already on disk  (same as --skip-build)
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const E2E_DIR = join(ROOT, "e2e");

const MOCK_PORT = process.env.E2E_MOCK_PORT ?? "8787";
const PREVIEW_PORT = process.env.E2E_PORT ?? "4321";
const MOCK_ORIGIN = `http://localhost:${MOCK_PORT}`;
const BASE_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const skipBuild = process.env.E2E_SKIP_BUILD === "1" || args.includes("--skip-build");
const playwrightArgs = args.filter((arg) => arg !== "--skip-build");

/**
 * The build env. Every value is deterministic so a capture taken today matches
 * the one taken tomorrow.
 *
 * ARTICLE_PER_PAGE is 2 against the mock's 4 articles: it is the only way the
 * built site ends up with more than one list page, which is what makes the
 * pager -- and /pages/2, /tags/Go/2 -- testable at all.
 *
 * The Algolia keys are fake on purpose. They only have to be non-empty for the
 * search panel to build a client; every request it makes is intercepted in the
 * browser (see e2e/fixtures/algolia.ts). ALGOLIA_ADMIN_KEY stays empty so the
 * indexing integration has nothing to push to.
 */
const buildEnv = {
  BLOG_API_MIYAMO_TODAY_URL: `${MOCK_ORIGIN}/graphql`,
  BLOG_API_MIYAMO_TODAY_TOKEN: "e2e-token",
  GITHUB_GRAPHQL_API_URL: `${MOCK_ORIGIN}/github`,
  GITHUB_API_TOKEN: "e2e-token",
  FACEBOOK_APP_ID: "000000000000000",
  ARTICLE_PER_PAGE: "2",
  PUBLIC_ALGOLIA_APP_ID: "E2EAPPID",
  PUBLIC_ALGOLIA_SEARCH_KEY: "e2e-search-key",
  PUBLIC_ALGOLIA_INDEX_NAME: "e2e-index",
  ALGOLIA_ADMIN_KEY: "",
  ALGOLIA_DRY_RUN: "true",
  // recommendations need OpenAI + qdrant; content.config.ts skips them when unset
  OPENAI_API_KEY: "",
};

const log = (message) => console.log(`\x1b[36m[e2e]\x1b[0m ${message}`);

const run = (command, commandArgs, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: "inherit",
      cwd: ROOT,
      ...options,
      env: { ...process.env, ...options.env },
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} ${commandArgs.join(" ")} killed by ${signal}`));
        return;
      }
      resolve(code ?? 0);
    });
  });

const waitForMock = async (timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${MOCK_ORIGIN}/img/e2e-health.png`);
      if (response.ok) {
        // drain the body so the socket is not left half-read
        await response.arrayBuffer();
        return;
      }
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`mock-api did not come up on ${MOCK_ORIGIN} within ${timeoutMs}ms`);
};

const installE2EDependencies = async () => {
  if (existsSync(join(E2E_DIR, "node_modules", "@playwright", "test"))) {
    return;
  }
  // e2e keeps its own package.json (like dev/mock-blogapi) so playwright never
  // enters the site's dependency tree
  log("installing e2e dependencies");
  const code = await run("bun", ["install"], { cwd: E2E_DIR });
  if (code !== 0) {
    throw new Error(`bun install failed in ${E2E_DIR} (exit ${code})`);
  }
};

let mock;

const stopMock = () => {
  if (mock && mock.exitCode === null) {
    mock.kill("SIGTERM");
  }
};

const main = async () => {
  await installE2EDependencies();

  log(`starting mock-api on ${MOCK_ORIGIN}`);
  mock = spawn(process.execPath, [join(ROOT, "scripts", "mock-api.mjs")], {
    cwd: ROOT,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, MOCK_API_PORT: MOCK_PORT },
  });
  mock.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\x1b[31m[e2e]\x1b[0m mock-api exited with ${code}`);
    }
  });
  await waitForMock();

  if (skipBuild) {
    log("skipping build (--skip-build); serving the existing dist/");
  } else {
    log("building the site against the mock API");
    const code = await run("bunx", ["astro", "build"], { env: buildEnv });
    if (code !== 0) {
      throw new Error(`astro build failed (exit ${code})`);
    }
  }

  log(`running playwright against ${BASE_URL}`);
  return run(join(E2E_DIR, "node_modules", ".bin", "playwright"), ["test", ...playwrightArgs], {
    cwd: E2E_DIR,
    env: {
      // `astro preview` re-runs the `astro:config:setup` hooks, so the loader
      // integration validates its url/token there too -- the preview server
      // (started by playwright's webServer) needs the same env the build got
      ...buildEnv,
      E2E_BASE_URL: BASE_URL,
      E2E_PORT: PREVIEW_PORT,
      E2E_ROOT: ROOT,
    },
  });
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopMock();
    process.exit(1);
  });
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`\x1b[31m[e2e]\x1b[0m ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  stopMock();
}
