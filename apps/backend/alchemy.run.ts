import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import { BackendDatabase } from "./src/db/resource.ts";

export const BackendWorker = Effect.gen(function* () {
  const database = yield* BackendDatabase;

  return yield* Cloudflare.Worker("BackendWorker", {
    main: "./src/worker.ts",
    env: { DB: database },
  });
});

export type WorkerEnv = Cloudflare.InferEnv<typeof BackendWorker>;

export default Alchemy.Stack(
  "TelocheBackend",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const database = yield* BackendDatabase;
    const worker = yield* BackendWorker;

    return {
      databaseName: database.databaseName,
      url: worker.url,
    };
  }),
);
