import type { Kyselify } from "drizzle-orm/kysely";
import type {
  catalogItems,
  collectionItems,
  collections,
  sourceChannelDetails,
  sourceItems,
  sources,
  syncRuns,
} from "./schema.ts";

export interface Database {
  catalog_items: Kyselify<typeof catalogItems>;
  collection_items: Kyselify<typeof collectionItems>;
  collections: Kyselify<typeof collections>;
  source_channel_details: Kyselify<typeof sourceChannelDetails>;
  source_items: Kyselify<typeof sourceItems>;
  sources: Kyselify<typeof sources>;
  sync_runs: Kyselify<typeof syncRuns>;
}
