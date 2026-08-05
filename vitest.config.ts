import { fileURLToPath } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
    // Route tests hit a real, shared Postgres instance with no per-test transaction rollback.
    // Store-wide aggregate reads (e.g. dashboard summary) aren't safe to race against other
    // files' concurrent writes, so files run sequentially rather than in parallel workers.
    fileParallelism: false,
    // e2e/*.spec.ts are Playwright tests, not Vitest's — Vitest's default glob otherwise
    // picks them up too since both runners treat `.spec.ts` as a test file.
    exclude: [...configDefaults.exclude, "e2e/**"],
    server: {
      deps: {
        // next-intl's middleware imports "next/server" from its own pnpm-isolated
        // copy of `next`; left externalized (Vitest's default), Node's native ESM
        // resolver fails on that extensionless subpath (works fine under Next's
        // own bundler at runtime). Routing it through Vite's transform pipeline
        // instead lets the "next/server" alias below apply.
        inline: [/next-intl/],
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "next/server": fileURLToPath(new URL("./node_modules/next/server.js", import.meta.url)),
    },
  },
});
