import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import { configDefaults, defineConfig } from "vitest/config";

const packageRoot = dirname(fileURLToPath(import.meta.url));

// `.env.test` lives in the repo root, not in this package: config.ts looks for `.env`
// from the root, so the test environment belongs beside it rather than beside the code.
const testEnvPath = resolve(packageRoot, "../../.env.test");

// `existsSync`, not an assertion: the pure-logic specs (the `assertTestDatabase` guard)
// must not require a credentials file that a given checkout may not have. Whoever does
// need one gets a meaningful error from config.ts; the others simply run.
const fileEnv = existsSync(testEnvPath) ? parse(readFileSync(testEnvPath, "utf8")) : {};

export default defineConfig({
  test: {
    root: packageRoot,
    // `dist` is excluded explicitly: `build` is `tsc` over an `include` that covers
    // `src/**/*`, and that includes `src/__tests__`. Vitest 4 excludes only
    // `node_modules` and `.git` by default, so after `pnpm build:b` the collector also
    // picks up the compiled copies of these same specs - and two `resetDb` runs against
    // one database split it between them and fail on a unique index.
    exclude: [...configDefaults.exclude, "dist/**"],
    // Files run one at a time because they share one database: two workers truncating
    // `foxsphere_test` concurrently would empty each other's rows mid-test. It is free
    // here - the pure specs cost milliseconds - and the alternative is a suite that only
    // goes flaky once a second database-backed file exists.
    fileParallelism: false,
    // `test.env` lands in process.env in the worker BEFORE the test file is imported -
    // the only window in which `config.ts` reads anything. That is why this config
    // cannot rely on the root `.env`: it loads at the same moment, and without the
    // override `foxsphere_db` would beat `foxsphere_test`.
    env: {
      // A variable already set in the shell wins over `.env.test` - dotenv semantics,
      // and they are what makes the deliberate override above possible: without it
      // there would be no way to point a run at a non-test database and watch the guard
      // refuse it.
      ...Object.fromEntries(
        Object.entries(fileEnv).filter(([key]) => process.env[key] === undefined),
      ),
    },
  },
});
