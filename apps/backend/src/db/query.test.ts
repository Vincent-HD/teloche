import { readdir, readFile } from "node:fs/promises";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { D1Database } from "@cloudflare/workers-types";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { makeDatabase } from "./client.ts";
import { countExampleItems } from "./query.ts";

const migrationsDirectory = new URL("../../migrations/", import.meta.url);

const applyMigrations = async (database: DatabaseSync) => {
  const migrations = (await readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const migration of migrations) {
    database.exec(await readFile(new URL(migration, migrationsDirectory), "utf8"));
  }
};

const makeTestD1Database = (sqlite: DatabaseSync): D1Database =>
  ({
    prepare: (query: string) => {
      const statement = sqlite.prepare(query);
      let parameters: Array<SQLInputValue> = [];

      const prepared = {
        bind: (...values: Array<SQLInputValue>) => {
          parameters = values;
          return prepared;
        },
        all: async <Row>() => {
          if (statement.columns().length > 0) {
            return {
              success: true,
              results: statement.all(...parameters) as Array<Row>,
              meta: { changes: 0, last_row_id: null },
            };
          }

          const result = statement.run(...parameters);
          return {
            success: true,
            results: [] as Array<Row>,
            meta: {
              changes: Number(result.changes),
              last_row_id: Number(result.lastInsertRowid),
            },
          };
        },
      };

      return prepared;
    },
  }) as unknown as D1Database;

describe("database skeleton", () => {
  it("applies Drizzle migrations and queries through Kysely's D1 dialect", async () => {
    const sqlite = new DatabaseSync(":memory:");

    try {
      await applyMigrations(sqlite);
      const d1 = makeTestD1Database(sqlite);
      const database = makeDatabase(d1);

      await database
        .insertInto("example_items")
        .values({
          id: "example-1",
          name: "First item",
          created_at: 1,
        })
        .execute();

      const itemCount = await Effect.runPromise(countExampleItems(d1));

      expect(itemCount).toBe(1);
      await database.destroy();
    } finally {
      sqlite.close();
    }
  });
});
