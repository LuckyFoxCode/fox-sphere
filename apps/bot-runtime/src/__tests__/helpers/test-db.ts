import { config, prisma } from "@fox-sphere/backend-shared";
import type { PrismaClient } from "@fox-sphere/db";

/**
 * Refuses any URL whose database name does not end in `_test`.
 *
 * The argument is the URL itself rather than `config`, so the check can be run
 * against an arbitrary string without standing up an environment or a connection.
 * Everything that actually writes calls it first: the guard has to fire BEFORE the
 * first `TRUNCATE`, because a guard that fires after it is worthless - the database
 * is already empty by then.
 */
export const assertTestDatabase = (url: string): void => {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(
      `Refusing to run against "${name}": the test database name must end with _test`,
    );
  }
};

/**
 * The Prisma client for tests, gated on the database being a test database.
 *
 * The check is repeated here, not only in `resetDb`, because `prisma` is exported
 * from `@fox-sphere/backend-shared` and a test could take it directly - which would
 * be a way around the one thing this file exists for.
 *
 * `url` exists so the guard itself is testable: without it there would be no way to point
 * this at a non-test database and prove it refuses. It does NOT redirect the connection -
 * the client returned is the shared singleton, bound to `config.databaseUrl` at import - it
 * decides whether the helper is allowed to act at all, and it is checked before the client
 * is touched.
 */
export const testDb = (url: string = config.databaseUrl): PrismaClient => {
  assertTestDatabase(url);
  return prisma;
};

/**
 * Empties the test database, so that test ordering never matters.
 *
 * The table list comes from the catalog rather than from a list in code: a migration
 * added after this file has to be covered without editing it. `CASCADE` reaches the
 * tables something else points at, and `RESTART IDENTITY` rewinds the sequences so
 * `autoincrement` ids are predictable again from one run to the next.
 *
 * `url` is `testDb`'s parameter, for the same reason and with the same caveat: it gates
 * the helper, it does not choose the connection. The guard is the FIRST statement of the
 * body - ahead of the catalog read, let alone the `TRUNCATE` - and `reset-db.spec.ts` is
 * what holds it there, because a guard that runs second is a guard on an empty database.
 *
 * The parameter is also why you must not write `beforeEach(resetDb)`: vitest calls a hook
 * with an argument, that argument lands here, and `new URL(<function>)` throws "Invalid
 * URL". `beforeEach(async () => { await resetDb(); })` is the form that works.
 */
export const resetDb = async (url: string = config.databaseUrl): Promise<void> => {
  assertTestDatabase(url);

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename::text AS tablename FROM pg_tables WHERE schemaname = current_schema()
  `;

  // `_prisma_migrations` is the one table that must NOT be emptied: it is the journal
  // of applied migrations, not data. Emptying it leaves a fully-migrated database
  // claiming to have had none applied, and the next `prisma migrate deploy` against
  // it dies with `relation "User" already exists` (P3018) - which is exactly the run
  // you need in order to catch the test database up with a new migration.
  const data = tables.filter(({ tablename }) => tablename !== "_prisma_migrations");

  if (data.length === 0) {
    throw new Error(
      `Cannot reset "${config.databaseUrl}": the default schema holds no tables - run prisma migrate deploy against it`,
    );
  }

  // The names come from the system catalog, not from a user, but they still travel
  // into the statement as identifiers - hence the quoting and the doubled `"`.
  const list = data.map(({ tablename }) => `"${tablename.replace(/"/g, '""')}"`).join(", ");

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
};
