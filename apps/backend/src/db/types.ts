import type { Kyselify } from "drizzle-orm/kysely";
import type {
  catalogItems,
  collectionItems,
  collections,
  householdMemberships,
  households,
  sourceChannelDetails,
  sourceCredentials,
  sourceItems,
  sources,
  syncRuns,
  users,
} from "./schema.ts";

export interface Database {
  catalog_items: Kyselify<typeof catalogItems>;
  collection_items: Kyselify<typeof collectionItems>;
  collections: Kyselify<typeof collections>;
  household_memberships: Kyselify<typeof householdMemberships>;
  households: Kyselify<typeof households>;
  source_channel_details: Kyselify<typeof sourceChannelDetails>;
  source_credentials: Kyselify<typeof sourceCredentials>;
  source_items: Kyselify<typeof sourceItems>;
  sources: Kyselify<typeof sources>;
  sync_runs: Kyselify<typeof syncRuns>;
  users: Kyselify<typeof users>;
}
