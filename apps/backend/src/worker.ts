import type { WorkerEnv } from "../alchemy.run.ts";
import * as Context from "effect/Context";
import { HttpRouter } from "effect/unstable/http";
import {
  CatalogRepository,
  makeCatalogRepository,
} from "./catalog/repository.ts";
import { makeDatabaseConnection } from "./db/client.ts";
import { DatabaseClient } from "./db/service.ts";
import { BackendRoutes } from "./routes.ts";

const { handler } = HttpRouter.toWebHandler(BackendRoutes, {
  disableLogger: true,
});

export default {
  fetch: (request, env) => {
    const database = makeDatabaseConnection(env.DB);
    const services = Context.make(DatabaseClient, database).pipe(
      Context.add(CatalogRepository, makeCatalogRepository(database)),
    );

    return handler(request, services);
  },
} satisfies ExportedHandler<WorkerEnv>;
