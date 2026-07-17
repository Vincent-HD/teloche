import { assert, describe, it } from "@effect/vitest";
import { env, exports } from "cloudflare:workers";
import * as Effect from "effect/Effect";
import type { WorkerEnv } from "../../alchemy.run.ts";
import { makeDatabase } from "./client.ts";
import { countExampleItems } from "./query.ts";
import { beforeEach } from "vitest";

const workerEnvironment = env as WorkerEnv;

describe("backend worker", () => {
  beforeEach(async () => {
    await workerEnvironment.DB.prepare("DELETE FROM example_items").run();
  });

  it.effect("queries a migrated local D1 database", () =>
    Effect.gen(function* () {
      const database = makeDatabase(workerEnvironment.DB);

      yield* Effect.promise(() =>
        database
          .insertInto("example_items")
          .values({
            id: "example-1",
            name: "First item",
            created_at: 1,
          })
          .execute(),
      );

      const itemCount = yield* countExampleItems(database);

      assert.strictEqual(itemCount, 1);
    }),
  );

  it.effect("serves the database health route", () =>
    Effect.gen(function* () {
      const response = yield* Effect.promise(() =>
        exports.default.fetch("http://example.test/health/database"),
      );

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(yield* Effect.promise(() => response.json()), {
        database: "ok",
        itemCount: 0,
      });
    }),
  );
});
