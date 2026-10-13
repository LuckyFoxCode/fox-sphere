import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { resetDb, testDb } from "./test-db";

// The only file in the repository that needs a live database. Everything else is
// strings and pure functions.
//
// `testDb()` is the first thing this file reaches for, and that is not a formality:
// it calls `assertTestDatabase`, so if `.env.test` had not beaten the root `.env` the
// run would fail here with `Refusing to run against "foxsphere_db"` - before a single
// query - rather than quietly writing to the dev database.
describe("resetDb", () => {
  // Not "the database is empty because it happened to be", but "the database is empty
  // because it was emptied": a run that dies halfway leaves rows behind, and the next
  // run has to survive that. That is the promise `resetDb` makes.
  beforeEach(resetDb);

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
});
