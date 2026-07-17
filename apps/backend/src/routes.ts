import * as Effect from "effect/Effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { countExampleItems } from "./db/query.ts";
import { DatabaseClient } from "./db/service.ts";

const databaseHealth = Effect.gen(function* () {
  const database = yield* DatabaseClient;
  const itemCount = yield* countExampleItems(database);

  return yield* HttpServerResponse.json({
    database: "ok",
    itemCount,
  });
}).pipe(
  Effect.tapError((cause) => Effect.logError("Database health check failed", cause)),
  Effect.catch(() =>
    HttpServerResponse.json(
      { database: "error" },
      { status: 500 },
    ),
  ),
);

export const BackendRoutes = HttpRouter.addAll([
  HttpRouter.route("GET", "/health/database", databaseHealth),
]);
