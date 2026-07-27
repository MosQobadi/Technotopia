import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["dotenv/config"],
    // Route tests hit a real, shared Postgres instance with no per-test transaction rollback.
    // Store-wide aggregate reads (e.g. dashboard summary) aren't safe to race against other
    // files' concurrent writes, so files run sequentially rather than in parallel workers.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
