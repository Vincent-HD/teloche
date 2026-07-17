import * as Context from "effect/Context";
import type { Kysely } from "kysely";
import type { Database } from "./types.ts";

export class DatabaseClient extends Context.Service<DatabaseClient, Kysely<Database>>()(
  "teloche/DatabaseClient",
) {}
