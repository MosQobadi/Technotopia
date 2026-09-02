import { defineConfig, devices } from "@playwright/test";

// Deliberately not 3000. `reuseExistingServer` below adopts whatever is already
// answering on this port, and it can't tell one Next app from another — a stray dev
// server from an unrelated project on the default port silently becomes the system
// under test. This matches the port in .claude/launch.json so a preview server and an
// E2E run share one technotopia server instead of fighting over it.
const PORT = 4000;
const baseURL = `http://localhost:${PORT}`;

// E2E_PROD=1 runs the suite against a production build instead of `next dev` — the
// pre-go-live check in DEPLOYMENT.md §10. Two details make it match what the VPS runs:
//
//   * `next start` is NOT the production entry point here. `output: "standalone"` is set
//     in next.config.ts, and Next refuses to serve that build through `next start`
//     ("does not work with output: standalone"). The Dockerfile's `CMD node server.js` is
//     the real one, so this runs the same file.
//   * `next build` leaves the static chunks and `public/` outside `.next/standalone`;
//     the Dockerfile copies them in as two separate COPY steps. Without that copy the
//     server boots and serves HTML with every asset 404ing, which looks like a broken
//     app rather than a broken harness.
const PROD_SERVER_COMMAND = [
  "pnpm build",
  `node -e "const fs=require('fs');fs.cpSync('.next/static','.next/standalone/.next/static',{recursive:true});fs.cpSync('public','.next/standalone/public',{recursive:true})"`,
  "node .next/standalone/server.js",
].join(" && ");

const againstProdBuild = process.env["E2E_PROD"] === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  // A cold Next.js dev server compiles each route on first request, which can be slower
  // than the default assertion timeout — retry once so that doesn't flake the whole run.
  retries: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: againstProdBuild ? PROD_SERVER_COMMAND : `pnpm dev --port ${PORT}`,
    url: baseURL,
    // Never adopt an existing server for a production run: anything already answering on
    // this port is almost certainly the dev server, which is the one thing this mode
    // exists to not test. The run would pass and prove nothing.
    reuseExistingServer: againstProdBuild ? false : !process.env.CI,
    // The production command builds before it serves, and `next build` is minutes, not
    // seconds.
    timeout: againstProdBuild ? 600_000 : 120_000,
    // `.next/standalone/server.js` chdirs into its own directory, so it reads the `.env`
    // that `next build` copied there rather than the one in the repo root — but it takes
    // PORT from the real environment, which is the only value that has to differ.
    env: { PORT: String(PORT) },
  },
  projects: [
    {
      name: "setup",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        storageState: "e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: [/login\.spec\.ts/, /storefront[\\/].*\.spec\.ts/],
    },
    {
      name: "chromium-unauthenticated",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
      // login.spec.ts covers admin login; storefront specs manage their own customer
      // sessions (sign up / log in within the test), so neither should start with the
      // admin storageState from the "setup" project.
      testMatch: [/login\.spec\.ts/, /storefront[\\/].*\.spec\.ts/],
    },
  ],
});
