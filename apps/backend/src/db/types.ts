import type { Kyselify } from "drizzle-orm/kysely";
import type { exampleItems } from "./schema.ts";

export interface Database {
  example_items: Kyselify<typeof exampleItems>;
}
