import type { D1Database } from "@cloudflare/workers-types";
import * as Effect from "effect/Effect";
import { makeDatabase } from "./client.ts";

export const countExampleItems = (database: D1Database) =>
  Effect.tryPromise({
    try: () =>
      makeDatabase(database)
        .selectFrom("example_items")
        .select((expression) => expression.fn.countAll<number>().as("count"))
        .executeTakeFirstOrThrow(),
    catch: (cause) => cause,
  }).pipe(Effect.map(({ count }) => Number(count)));
