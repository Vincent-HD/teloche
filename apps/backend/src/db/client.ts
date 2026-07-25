import type { D1Database } from "@cloudflare/workers-types";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import type { Database } from "./types.ts";

export const makeDatabase = (database: D1Database) =>
  new Kysely<Database>({
    dialect: new D1Dialect({ database }),
  });

export interface DatabaseConnection {
  readonly query: Kysely<Database>;
  readonly raw: D1Database;
}

export const makeDatabaseConnection = (database: D1Database): DatabaseConnection => ({
  query: makeDatabase(database),
  raw: database,
});
