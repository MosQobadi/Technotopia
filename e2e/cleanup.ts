import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Removes the rows a spec created, matched by the unique prefix it tagged them with.
 * Runs `e2e/fixtures/deleteTestData.ts` as a separate `tsx` process — see that file for why.
 */
export function cleanUpTestData(prefixes: string[]) {
  if (prefixes.length === 0) return;

  const tmpDir = mkdtempSync(join(tmpdir(), "technotopia-e2e-"));
  const prefixesFilePath = join(tmpDir, "cleanup-prefixes.json");
  writeFileSync(prefixesFilePath, JSON.stringify(prefixes));
  try {
    execFileSync("pnpm", ["exec", "tsx", "e2e/fixtures/deleteTestData.ts", prefixesFilePath], {
      shell: true,
    });
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
