import * as Effect from "effect/Effect";
import type { Kysely } from "kysely";
import type { Database } from "./types.ts";

export const countExampleItems = (database: Kysely<Database>) =>
  Effect.tryPromise({
    try: () =>
      database
        .selectFrom("example_items")
        .select((expression) => expression.fn.countAll<number>().as("count"))
        .executeTakeFirstOrThrow(),
    catch: (cause) => cause,
  }).pipe(Effect.map(({ count }) => Number(count)));
