import {
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  adapterKey: text("adapter_key").notNull(),
  name: text("name").notNull(),
  endpoint: text("endpoint").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  lastSuccessfulSyncAt: integer("last_successful_sync_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("sources_adapter_key_idx").on(table.adapterKey),
]);

export const syncRuns = sqliteTable("sync_runs", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => sources.id, {
    onDelete: "cascade",
  }),
  scope: text("scope").notNull(),
  status: text("status").notNull(),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  collectionsSeen: integer("collections_seen").notNull().default(0),
  itemsSeen: integer("items_seen").notNull().default(0),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
}, (table) => [
  index("sync_runs_source_started_at_idx").on(table.sourceId, table.startedAt),
]);

export const collections = sqliteTable("collections", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => sources.id, {
    onDelete: "cascade",
  }),
  parentId: text("parent_id"),
  externalId: text("external_id").notNull(),
  contentKind: text("content_kind").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  firstSeenAt: integer("first_seen_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
}, (table) => [
  foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: "collections_parent_id_fk",
  }).onDelete("set null"),
  uniqueIndex("collections_source_kind_external_id_uidx").on(
    table.sourceId,
    table.contentKind,
    table.externalId,
  ),
  index("collections_source_kind_position_idx").on(
    table.sourceId,
    table.contentKind,
    table.position,
  ),
]);

export const catalogItems = sqliteTable("catalog_items", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  artworkUrl: text("artwork_url"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("catalog_items_kind_name_idx").on(table.kind, table.name),
]);

export const sourceItems = sqliteTable("source_items", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => sources.id, {
    onDelete: "cascade",
  }),
  itemId: text("item_id").notNull().references(() => catalogItems.id, {
    onDelete: "restrict",
  }),
  externalId: text("external_id").notNull(),
  contentKind: text("content_kind").notNull(),
  sourceName: text("source_name").notNull(),
  sourceArtworkUrl: text("source_artwork_url"),
  providerPosition: integer("provider_position").notNull(),
  providerAddedAt: integer("provider_added_at"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  firstSeenAt: integer("first_seen_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
}, (table) => [
  uniqueIndex("source_items_source_kind_external_id_uidx").on(
    table.sourceId,
    table.contentKind,
    table.externalId,
  ),
  index("source_items_source_kind_position_idx").on(
    table.sourceId,
    table.contentKind,
    table.providerPosition,
  ),
  index("source_items_item_id_idx").on(table.itemId),
]);

export const sourceChannelDetails = sqliteTable("source_channel_details", {
  sourceItemId: text("source_item_id").primaryKey().references(() => sourceItems.id, {
    onDelete: "cascade",
  }),
  guideChannelId: text("guide_channel_id"),
  isAdult: integer("is_adult", { mode: "boolean" }).notNull().default(false),
  catchupEnabled: integer("catchup_enabled", { mode: "boolean" }).notNull().default(false),
  catchupWindowSeconds: integer("catchup_window_seconds"),
});

export const collectionItems = sqliteTable("collection_items", {
  collectionId: text("collection_id").notNull().references(() => collections.id, {
    onDelete: "cascade",
  }),
  sourceItemId: text("source_item_id").notNull().references(() => sourceItems.id, {
    onDelete: "cascade",
  }),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.collectionId, table.sourceItemId] }),
  index("collection_items_source_item_id_idx").on(table.sourceItemId),
]);
