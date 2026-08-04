import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

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
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
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
