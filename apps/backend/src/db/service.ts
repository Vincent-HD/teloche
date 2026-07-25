import * as Context from "effect/Context";
import type { DatabaseConnection } from "./client.ts";

export class DatabaseClient extends Context.Service<DatabaseClient, DatabaseConnection>()(
  "teloche/DatabaseClient",
) {}
