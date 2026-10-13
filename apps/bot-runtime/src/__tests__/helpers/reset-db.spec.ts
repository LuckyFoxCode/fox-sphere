import { prisma } from "@fox-sphere/backend-shared";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb, testDb } from "./test-db";

const urlFor = (database: string): string =>
  `postgresql://fox_user:fox_password@localhost:5432/${database}?schema=public`;

// The only file in the repository that needs a live database - everything else in it is
// strings. `testDb()` is the first thing the live part reaches for, and that is not a
// formality: it calls `assertTestDatabase`, so if `.env.test` had not beaten the root
// `.env` the run would fail with `Refusing to run against "foxsphere_db"` - before a
// single query - rather than quietly writing to the dev database.
describe("resetDb", () => {
  // Not "the database is empty because it happened to be", but "the database is empty
  // because it was emptied": a run that dies halfway leaves rows behind, and the next
  // run has to survive that. That is the promise `resetDb` makes.
  //
  // Wrapped, not `beforeEach(resetDb)`: vitest calls a hook with an argument, and that
  // argument would land in `resetDb`'s first parameter - `new URL(<function>)` throws
  // "Invalid URL". Written as a bare reference it fails on the first run, loudly.
  beforeEach(async () => {
    await resetDb();
  });

  afterEach(() => {
    // Unconditional: the assertions below install spies, and a failed assertion must not
    // leave them installed for the rest of the file.
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    // `pg.Pool` holds its sockets open and keeps the worker from exiting.
    await testDb().$disconnect();
  });

  it("empties every table, and a second run over the empty result still succeeds", async () => {
    const db = testDb();
    await db.channel.create({
      data: { twitchId: "twitch-1", login: "one", displayName: "One" },
    });
    await expect(db.channel.count()).resolves.toBe(1);

    await resetDb();
    await expect(db.channel.count()).resolves.toBe(0);

    // A second run over empty tables IS the "ordering does not matter" requirement:
    // TRUNCATE has to be a no-op, not a failure.
    await expect(resetDb()).resolves.toBeUndefined();
    await expect(db.channel.count()).resolves.toBe(0);
  });

  // The invariant this whole file exists to hold, and the reason `resetDb` takes a URL.
  // Without that parameter there is no way to point it at a non-test database from here,
  // so moving `assertTestDatabase` one line down would keep every other test green right up
  // to the day it emptied a database nobody meant to empty.
  //
  // The spies are what make the ORDERING the assertion, not just the refusal. Measuring it
  // the other way round - deleting the guard, or dropping it below the catalog read - and
  // watching this go red is how the assertion was checked; the second of those two fails
  // on the `not.toHaveBeenCalled()` below, because the `$queryRaw` has already run by then.
  // A spy is the only thing that can tell: the client is the shared singleton, so a
  // reordered guard still reads `foxsphere_test` and still throws the same message.
  it("refuses a non-test database before it reads the catalog or truncates", async () => {
    const queryRaw = vi.spyOn(prisma, "$queryRaw");
    const executeRaw = vi.spyOn(prisma, "$executeRawUnsafe");

    await expect(resetDb(urlFor("foxsphere_db"))).rejects.toThrow(
      'Refusing to run against "foxsphere_db": the test database name must end with _test',
    );
    expect(queryRaw).not.toHaveBeenCalled();
    expect(executeRaw).not.toHaveBeenCalled();
  });
});
