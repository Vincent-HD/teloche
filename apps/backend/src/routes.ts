import * as Effect from "effect/Effect";
import { HttpRouter, HttpServerResponse } from "effect/unstable/http";
import { CatalogRepository } from "./catalog/repository.ts";

const databaseHealth = Effect.gen(function* () {
  const repository = yield* CatalogRepository;
  const sourceCount = yield* repository.countSources;

  return yield* HttpServerResponse.json({
    database: "ok",
    sourceCount,
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
