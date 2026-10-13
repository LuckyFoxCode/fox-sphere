import { describe, expect, it } from "vitest";
import { assertTestDatabase } from "./test-db";

const urlFor = (database: string): string =>
  `postgresql://fox_user:fox_password@localhost:5432/${database}?schema=public`;

// No live database here and none is needed: `assertTestDatabase` takes a URL as a
// string and opens nothing. Importing `./test-db` does pull in
// `@fox-sphere/backend-shared`, which builds `config` on import, so the file still
// wants the environment from `.env.test` - but it never talks to Postgres.
describe("assertTestDatabase", () => {
  it("accepts a database whose name ends with _test", () => {
    expect(() => assertTestDatabase(urlFor("foxsphere_test"))).not.toThrow();
  });

  it("refuses the dev database by name, and says which name it saw", () => {
    expect(() => assertTestDatabase(urlFor("foxsphere_db"))).toThrow(
      'Refusing to run against "foxsphere_db": the test database name must end with _test',
    );
  });

  // The `_test` suffix is a rule about the database NAME, not about the host:
  // `prod.example.com` passes on purpose. The guard checks exactly what its message
  // says and does not try to guess where the database physically lives.
  it("looks at the database name only, not at the host", () => {
    expect(() =>
      assertTestDatabase("postgresql://u:p@prod.example.com:5432/foxsphere_test?schema=public"),
    ).not.toThrow();
  });

  // `assertTestDatabase` strips exactly one leading slash from the path, so a nested
  // path reads as-is - and therefore does not pass on a suffix buried inside it.
  it("refuses a nested path that merely contains a _test suffix", () => {
    expect(() =>
      assertTestDatabase("postgresql://u:p@localhost:5432/foxsphere_test/backup?schema=public"),
    ).toThrow('Refusing to run against "foxsphere_test/backup"');
  });
});
