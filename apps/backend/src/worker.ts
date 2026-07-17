import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import { countExampleItems } from "./db/query.ts";
import { BackendDatabase } from "./db/resource.ts";

const databaseErrorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : "Unknown database error";

export default class BackendWorker extends Cloudflare.Worker<BackendWorker>()(
  "BackendWorker",
  {
    main: import.meta.url,
    dev: {
      port: 1337,
    },
  },
  Effect.gen(function* () {
    const connection = yield* Cloudflare.D1.QueryDatabase(BackendDatabase);

    return {
      fetch: Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const url = new URL(request.url);

        if (request.method !== "GET" || url.pathname !== "/health/database") {
          return HttpServerResponse.text("Not Found", { status: 404 });
        }

        return yield* Effect.gen(function* () {
          const database = yield* connection.raw;
          const itemCount = yield* countExampleItems(database);

          return yield* HttpServerResponse.json({
            database: "ok",
            itemCount,
          });
        }).pipe(
          Effect.catch((cause) =>
            HttpServerResponse.json(
              {
                database: "error",
                message: databaseErrorMessage(cause),
              },
              { status: 500 },
            ),
          ),
        );
      }),
    };
  }).pipe(Effect.provide(Cloudflare.D1.QueryDatabaseBinding)),
) {}
