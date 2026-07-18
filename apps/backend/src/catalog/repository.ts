import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { DatabaseConnection } from "../db/client.ts";
import { DatabaseClient } from "../db/service.ts";
import {
  catalogItemRecordId,
  collectionRecordId,
  sourceItemRecordId,
  type CatalogSnapshot,
  type ContentKind,
} from "./model.ts";

export class CatalogRepositoryError extends Data.TaggedError("CatalogRepositoryError")<{
  readonly operation: string;
  readonly message: string;
}> {}

export interface SourceInput {
  readonly id: string;
  readonly householdId: string;
  readonly adapterKey: string;
  readonly name: string;
  readonly endpoint: string;
  readonly enabled?: boolean;
}

export interface ReconcileInput {
  readonly sourceId: string;
  readonly observedAt: number;
  readonly snapshot: CatalogSnapshot;
}

export interface CompleteSyncInput {
  readonly runId: string;
  readonly sourceId: string;
  readonly finishedAt: number;
  readonly collectionsSeen: number;
  readonly itemsSeen: number;
}

export interface FailSyncInput {
  readonly runId: string;
  readonly finishedAt: number;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export interface CatalogCollectionRecord {
  readonly id: string;
  readonly parentId?: string;
  readonly name: string;
  readonly contentKind: ContentKind;
  readonly position: number;
}

export interface CatalogChannelRecord {
  readonly id: string;
  readonly sourceId: string;
  readonly externalId: string;
  readonly name: string;
  readonly artworkUrl?: string;
  readonly position: number;
  readonly guideChannelId?: string;
  readonly isAdult: boolean;
  readonly catchupEnabled: boolean;
  readonly catchupWindowSeconds?: number;
}

export interface CatalogRepositoryService {
  readonly upsertSource: (source: SourceInput, now: number) => Effect.Effect<void, CatalogRepositoryError>;
  readonly beginSync: (
    runId: string,
    sourceId: string,
    startedAt: number,
  ) => Effect.Effect<void, CatalogRepositoryError>;
  readonly reconcile: (input: ReconcileInput) => Effect.Effect<void, CatalogRepositoryError>;
  readonly completeSync: (input: CompleteSyncInput) => Effect.Effect<void, CatalogRepositoryError>;
  readonly failSync: (input: FailSyncInput) => Effect.Effect<void, CatalogRepositoryError>;
  readonly listCollections: (
    sourceId: string,
    contentKind: ContentKind,
  ) => Effect.Effect<ReadonlyArray<CatalogCollectionRecord>, CatalogRepositoryError>;
  readonly listChannels: (input: {
    readonly sourceId: string;
    readonly collectionId?: string;
    readonly limit: number;
    readonly offset: number;
  }) => Effect.Effect<ReadonlyArray<CatalogChannelRecord>, CatalogRepositoryError>;
  readonly findChannel: (
    sourceId: string,
    channelId: string,
  ) => Effect.Effect<CatalogChannelRecord | undefined, CatalogRepositoryError>;
  readonly countSources: Effect.Effect<number, CatalogRepositoryError>;
}

export class CatalogRepository extends Context.Service<
  CatalogRepository,
  CatalogRepositoryService
>()("teloche/CatalogRepository") {}

const databaseEffect = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: () => new CatalogRepositoryError({
      operation,
      message: `Database operation failed: ${operation}`,
    }),
  });

const chunks = <A>(
  values: ReadonlyArray<A>,
  size: number,
): Array<ReadonlyArray<A>> => {
  const result: Array<ReadonlyArray<A>> = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
};

const kindKey = (kind: ContentKind, externalId: string) => `${kind}\0${externalId}`;

interface CompilableQuery {
  readonly compile: () => {
    readonly sql: string;
    readonly parameters: ReadonlyArray<unknown>;
  };
}

export const makeCatalogRepository = (connection: DatabaseConnection): CatalogRepositoryService => {
  const database = connection.query;
  const executeBatch = (operation: string, queries: ReadonlyArray<CompilableQuery>) =>
    queries.length === 0
      ? Effect.void
      : databaseEffect(operation, () =>
        connection.raw.batch(
          queries.map((query) => {
            const compiled = query.compile();
            return connection.raw.prepare(compiled.sql).bind(...compiled.parameters);
          }),
        ).then(() => undefined));

  const upsertSource: CatalogRepositoryService["upsertSource"] = (source, now) =>
    databaseEffect("upsert source", () =>
      database
        .insertInto("sources")
        .values({
          id: source.id,
          household_id: source.householdId,
          adapter_key: source.adapterKey,
          name: source.name,
          endpoint: source.endpoint,
          enabled: source.enabled ?? true,
          created_at: now,
          updated_at: now,
        })
        .onConflict((conflict) =>
          conflict.column("id").doUpdateSet({
            household_id: source.householdId,
            adapter_key: source.adapterKey,
            name: source.name,
            endpoint: source.endpoint,
            enabled: source.enabled ?? true,
            updated_at: now,
          })
        )
        .execute()
        .then(() => undefined));

  const beginSync: CatalogRepositoryService["beginSync"] = (runId, sourceId, startedAt) =>
    databaseEffect("begin catalog sync", () =>
      database
        .insertInto("sync_runs")
        .values({
          id: runId,
          source_id: sourceId,
          scope: "catalog",
          status: "running",
          started_at: startedAt,
          collections_seen: 0,
          items_seen: 0,
        })
        .execute()
        .then(() => undefined));

  const reconcile: CatalogRepositoryService["reconcile"] = ({
    sourceId,
    observedAt,
    snapshot,
  }) => {
    const collectionIds = new Map(
      snapshot.collections.map((collection) => [
        kindKey(collection.contentKind, collection.externalId),
        collectionRecordId(sourceId, collection.contentKind, collection.externalId),
      ]),
    );

    const collectionRows = snapshot.collections.map((collection) => ({
      id: collectionRecordId(sourceId, collection.contentKind, collection.externalId),
      source_id: sourceId,
      parent_id: collection.parentExternalId === undefined
        ? null
        : collectionIds.get(kindKey(collection.contentKind, collection.parentExternalId)) ?? null,
      external_id: collection.externalId,
      content_kind: collection.contentKind,
      name: collection.name,
      position: collection.position,
      active: true,
      first_seen_at: observedAt,
      last_seen_at: observedAt,
    }));
    const collectionBaseRows = collectionRows.map((row) => ({
      ...row,
      parent_id: null,
    }));

    const catalogRows = snapshot.items.map((item) => ({
      id: catalogItemRecordId(sourceId, item.kind, item.externalId),
      kind: item.kind,
      name: item.name,
      artwork_url: item.artworkUrl ?? null,
      created_at: observedAt,
      updated_at: observedAt,
    }));

    const sourceRows = snapshot.items.map((item) => ({
      id: sourceItemRecordId(sourceId, item.kind, item.externalId),
      source_id: sourceId,
      item_id: catalogItemRecordId(sourceId, item.kind, item.externalId),
      external_id: item.externalId,
      content_kind: item.kind,
      source_name: item.name,
      source_artwork_url: item.artworkUrl ?? null,
      provider_position: item.position,
      provider_added_at: item.addedAt ?? null,
      active: true,
      first_seen_at: observedAt,
      last_seen_at: observedAt,
    }));

    const channelRows = snapshot.items.flatMap((item) =>
      item.kind !== "channel" || item.channel === undefined
        ? []
        : [{
          source_item_id: sourceItemRecordId(sourceId, item.kind, item.externalId),
          guide_channel_id: item.channel.guideChannelId ?? null,
          is_adult: item.channel.isAdult,
          catchup_enabled: item.channel.catchupEnabled,
          catchup_window_seconds: item.channel.catchupWindowSeconds ?? null,
        }]
    );

    const membershipRows = snapshot.items.flatMap((item) =>
      item.collectionExternalIds.flatMap((externalId) => {
        const collectionId = collectionIds.get(kindKey(item.kind, externalId));
        return collectionId === undefined
          ? []
          : [{
            collection_id: collectionId,
            source_item_id: sourceItemRecordId(sourceId, item.kind, item.externalId),
            position: item.position,
          }];
      })
    );

    return Effect.gen(function* () {
      yield* executeBatch(
        "upsert collections",
        chunks(collectionBaseRows, 10).map((batch) =>
          database
            .insertInto("collections")
            .values(batch)
            .onConflict((conflict) =>
              conflict.column("id").doUpdateSet((expression) => ({
                parent_id: expression.ref("excluded.parent_id"),
                name: expression.ref("excluded.name"),
                position: expression.ref("excluded.position"),
                active: true,
                last_seen_at: observedAt,
              }))
            )
        ),
      );

      yield* executeBatch(
        "link parent collections",
        collectionRows.flatMap((row) =>
          row.parent_id === null
            ? []
            : [database
              .updateTable("collections")
              .set({ parent_id: row.parent_id })
              .where("id", "=", row.id)]
        ),
      );

      yield* executeBatch(
        "upsert catalog items",
        chunks(catalogRows, 16).map((batch) =>
          database
            .insertInto("catalog_items")
            .values(batch)
            .onConflict((conflict) =>
              conflict.column("id").doUpdateSet((expression) => ({
                name: expression.ref("excluded.name"),
                artwork_url: expression.ref("excluded.artwork_url"),
                updated_at: observedAt,
              }))
            )
        ),
      );

      yield* executeBatch(
        "upsert source items",
        chunks(sourceRows, 8).map((batch) =>
          database
            .insertInto("source_items")
            .values(batch)
            .onConflict((conflict) =>
              conflict.column("id").doUpdateSet((expression) => ({
                source_name: expression.ref("excluded.source_name"),
                source_artwork_url: expression.ref("excluded.source_artwork_url"),
                provider_position: expression.ref("excluded.provider_position"),
                provider_added_at: expression.ref("excluded.provider_added_at"),
                active: true,
                last_seen_at: observedAt,
              }))
            )
        ),
      );

      yield* executeBatch(
        "upsert channel details",
        chunks(channelRows, 20).map((batch) =>
          database
            .insertInto("source_channel_details")
            .values(batch)
            .onConflict((conflict) =>
              conflict.column("source_item_id").doUpdateSet((expression) => ({
                guide_channel_id: expression.ref("excluded.guide_channel_id"),
                is_adult: expression.ref("excluded.is_adult"),
                catchup_enabled: expression.ref("excluded.catchup_enabled"),
                catchup_window_seconds: expression.ref("excluded.catchup_window_seconds"),
              }))
            )
        ),
      );

      if (snapshot.contentKinds.length === 0) {
        return;
      }

      yield* databaseEffect("clear collection memberships", () =>
        database
          .deleteFrom("collection_items")
          .where("collection_id", "in", (query) =>
            query
              .selectFrom("collections")
              .select("id")
              .where("source_id", "=", sourceId)
              .where("content_kind", "in", snapshot.contentKinds))
          .execute()
          .then(() => undefined));

      yield* executeBatch(
        "insert collection memberships",
        chunks(membershipRows, 33).map((batch) =>
          database
            .insertInto("collection_items")
            .values(batch)
            .onConflict((conflict) =>
              conflict.columns(["collection_id", "source_item_id"]).doUpdateSet((expression) => ({
                position: expression.ref("excluded.position"),
              }))
            )
        ),
      );

      yield* databaseEffect("deactivate missing collections", () =>
        database
          .updateTable("collections")
          .set({ active: false })
          .where("source_id", "=", sourceId)
          .where("content_kind", "in", snapshot.contentKinds)
          .where("last_seen_at", "<", observedAt)
          .execute()
          .then(() => undefined));

      yield* databaseEffect("deactivate missing source items", () =>
        database
          .updateTable("source_items")
          .set({ active: false })
          .where("source_id", "=", sourceId)
          .where("content_kind", "in", snapshot.contentKinds)
          .where("last_seen_at", "<", observedAt)
          .execute()
          .then(() => undefined));
    });
  };

  const completeSync: CatalogRepositoryService["completeSync"] = (input) =>
    Effect.all([
      databaseEffect("complete catalog sync", () =>
        database
          .updateTable("sync_runs")
          .set({
            status: "succeeded",
            finished_at: input.finishedAt,
            collections_seen: input.collectionsSeen,
            items_seen: input.itemsSeen,
            error_code: null,
            error_message: null,
          })
          .where("id", "=", input.runId)
          .execute()
          .then(() => undefined)),
      databaseEffect("mark source synchronized", () =>
        database
          .updateTable("sources")
          .set({
            last_successful_sync_at: input.finishedAt,
            updated_at: input.finishedAt,
          })
          .where("id", "=", input.sourceId)
          .execute()
          .then(() => undefined)),
    ], { discard: true });

  const failSync: CatalogRepositoryService["failSync"] = (input) =>
    databaseEffect("fail catalog sync", () =>
      database
        .updateTable("sync_runs")
        .set({
          status: "failed",
          finished_at: input.finishedAt,
          error_code: input.errorCode,
          error_message: input.errorMessage,
        })
        .where("id", "=", input.runId)
        .execute()
        .then(() => undefined));

  const countSources = databaseEffect("count sources", () =>
    database
      .selectFrom("sources")
      .select((expression) => expression.fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow()
      .then(({ count }) => Number(count)));

  const channelSelection = [
    "source_items.id",
    "source_items.source_id",
    "source_items.external_id",
    "source_items.source_name",
    "source_items.source_artwork_url",
    "source_items.provider_position",
    "source_channel_details.guide_channel_id",
    "source_channel_details.is_adult",
    "source_channel_details.catchup_enabled",
    "source_channel_details.catchup_window_seconds",
  ] as const;

  const mapChannel = (row: {
    readonly id: string;
    readonly source_id: string;
    readonly external_id: string;
    readonly source_name: string;
    readonly source_artwork_url: string | null;
    readonly provider_position: number;
    readonly guide_channel_id: string | null;
    readonly is_adult: boolean | number;
    readonly catchup_enabled: boolean | number;
    readonly catchup_window_seconds: number | null;
  }): CatalogChannelRecord => ({
    id: row.id,
    sourceId: row.source_id,
    externalId: row.external_id,
    name: row.source_name,
    ...(row.source_artwork_url === null ? {} : { artworkUrl: row.source_artwork_url }),
    position: row.provider_position,
    ...(row.guide_channel_id === null ? {} : { guideChannelId: row.guide_channel_id }),
    isAdult: Boolean(row.is_adult),
    catchupEnabled: Boolean(row.catchup_enabled),
    ...(row.catchup_window_seconds === null
      ? {}
      : { catchupWindowSeconds: row.catchup_window_seconds }),
  });

  const listCollections: CatalogRepositoryService["listCollections"] = (sourceId, contentKind) =>
    databaseEffect("list catalog collections", () =>
      database
        .selectFrom("collections")
        .select(["id", "parent_id", "name", "content_kind", "position"])
        .where("source_id", "=", sourceId)
        .where("content_kind", "=", contentKind)
        .where("active", "=", true)
        .orderBy("position")
        .execute()
        .then((rows) => rows.map((row) => ({
          id: row.id,
          ...(row.parent_id === null ? {} : { parentId: row.parent_id }),
          name: row.name,
          contentKind: row.content_kind as ContentKind,
          position: row.position,
        }))));

  const listChannels: CatalogRepositoryService["listChannels"] = (input) =>
    databaseEffect("list catalog channels", async () => {
      const base = database
        .selectFrom("source_items")
        .innerJoin(
          "source_channel_details",
          "source_channel_details.source_item_id",
          "source_items.id",
        );
      const scoped = input.collectionId === undefined
        ? base
        : base
          .innerJoin("collection_items", "collection_items.source_item_id", "source_items.id")
          .where("collection_items.collection_id", "=", input.collectionId);
      const rows = await scoped
        .select(channelSelection)
        .where("source_items.source_id", "=", input.sourceId)
        .where("source_items.content_kind", "=", "channel")
        .where("source_items.active", "=", true)
        .orderBy("source_items.provider_position")
        .orderBy("source_items.id")
        .limit(input.limit)
        .offset(input.offset)
        .execute();
      return rows.map(mapChannel);
    });

  const findChannel: CatalogRepositoryService["findChannel"] = (sourceId, channelId) =>
    databaseEffect("find catalog channel", () =>
      database
        .selectFrom("source_items")
        .innerJoin(
          "source_channel_details",
          "source_channel_details.source_item_id",
          "source_items.id",
        )
        .select(channelSelection)
        .where("source_items.source_id", "=", sourceId)
        .where("source_items.id", "=", channelId)
        .where("source_items.content_kind", "=", "channel")
        .where("source_items.active", "=", true)
        .executeTakeFirst()
        .then((row) => row === undefined ? undefined : mapChannel(row)));

  return {
    upsertSource,
    beginSync,
    reconcile,
    completeSync,
    failSync,
    listCollections,
    listChannels,
    findChannel,
    countSources,
  };
};

export const CatalogRepositoryLive = Layer.effect(
  CatalogRepository,
  Effect.gen(function* () {
    return makeCatalogRepository(yield* DatabaseClient);
  }),
);
