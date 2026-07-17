import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import { BackendDatabase } from "./src/db/resource.ts";
import BackendWorker from "./src/worker.ts";

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
