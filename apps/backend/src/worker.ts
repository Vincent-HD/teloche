import type { WorkerEnv } from "../alchemy.run.ts";
import * as Context from "effect/Context";
import { HttpRouter } from "effect/unstable/http";
import { makeDatabase } from "./db/client.ts";
import { DatabaseClient } from "./db/service.ts";
import { BackendRoutes } from "./routes.ts";

const { handler } = HttpRouter.toWebHandler(BackendRoutes, {
  disableLogger: true,
});

export default {
  fetch: (request, env) =>
    handler(
      request,
      Context.make(DatabaseClient, makeDatabase(env.DB)),
    ),
} satisfies ExportedHandler<WorkerEnv>;
