import { assert, describe, it } from "@effect/vitest";
import { env, exports } from "cloudflare:workers";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Schema from "effect/Schema";
import { beforeEach } from "vitest";
import type { WorkerEnv } from "../../alchemy.run.ts";
import {
  normalizeXtreamLiveCatalog,
  XtreamCategorySchema,
  XtreamLiveStreamSchema,
} from "../adapters/xtream/catalog-provider.ts";
import { makeDatabaseConnection } from "../db/client.ts";
import type { CatalogSnapshot } from "./model.ts";
import { CatalogProvider, CatalogProviderError } from "./provider.ts";
import {
  CatalogRepository,
  makeCatalogRepository,
} from "./repository.ts";
import { synchronizeCatalog } from "./sync.ts";

const workerEnvironment = env as WorkerEnv;

const initialSnapshot: CatalogSnapshot = {
  contentKinds: ["channel"],
  collections: [
    {
      externalId: "sports",
      contentKind: "channel",
      name: "Sports",
      position: 0,
    },
    {
      externalId: "news",
      contentKind: "channel",
      name: "News",
      position: 1,
    },
    {
      externalId: "football",
      contentKind: "channel",
      name: "Football",
      parentExternalId: "sports",
      position: 2,
    },
  ],
  items: [
    {
      externalId: "channel-1",
      kind: "channel",
      name: "Channel One",
      artworkUrl: "https://images.example/channel-one.png",
      position: 1,
      addedAt: 1_700_000_000_000,
      collectionExternalIds: ["football"],
      channel: {
        guideChannelId: "channel-one.example",
        isAdult: false,
        catchupEnabled: true,
        catchupWindowSeconds: 172_800,
      },
    },
    {
      externalId: "channel-2",
      kind: "channel",
      name: "Channel Two",
      position: 2,
      collectionExternalIds: ["news"],
      channel: {
        isAdult: false,
        catchupEnabled: false,
      },
    },
  ],
};

const cleanDatabase = () =>
  workerEnvironment.DB.batch([
    workerEnvironment.DB.prepare("DELETE FROM collection_items"),
    workerEnvironment.DB.prepare("DELETE FROM source_channel_details"),
    workerEnvironment.DB.prepare("DELETE FROM source_items"),
    workerEnvironment.DB.prepare("DELETE FROM collections"),
    workerEnvironment.DB.prepare("DELETE FROM catalog_items"),
    workerEnvironment.DB.prepare("DELETE FROM sync_runs"),
    workerEnvironment.DB.prepare("DELETE FROM sources"),
  ]);

describe("catalog synchronization", () => {
  beforeEach(cleanDatabase);

  it.effect("synchronizes a provider-neutral catalog snapshot", () =>
    Effect.gen(function* () {
      const connection = makeDatabaseConnection(workerEnvironment.DB);
      const database = connection.query;
      const repository = makeCatalogRepository(connection);

      yield* repository.upsertSource({
        id: "source-1",
        adapterKey: "fixture",
        name: "Fixture provider",
        endpoint: "https://provider.example",
      }, 100);

      const result = yield* synchronizeCatalog("source-1").pipe(
        Effect.provideService(CatalogRepository, repository),
        Effect.provideService(CatalogProvider, {
          fetchCatalog: Effect.succeed(initialSnapshot),
        }),
      );

      assert.strictEqual(result.collectionsSeen, 3);
      assert.strictEqual(result.itemsSeen, 2);

      const sourceItems = yield* Effect.promise(() =>
        database
          .selectFrom("source_items")
          .select(["external_id", "source_name", "active"])
          .orderBy("provider_position")
          .execute(),
      );
      assert.deepStrictEqual(sourceItems.map(({ external_id, source_name }) => ({
        externalId: external_id,
        sourceName: source_name,
      })), [
        { externalId: "channel-1", sourceName: "Channel One" },
        { externalId: "channel-2", sourceName: "Channel Two" },
      ]);
      assert.ok(sourceItems.every(({ active }) => Boolean(active)));

      const channel = yield* Effect.promise(() =>
        database
          .selectFrom("source_channel_details")
          .innerJoin("source_items", "source_items.id", "source_channel_details.source_item_id")
          .select([
            "source_items.external_id",
            "source_channel_details.guide_channel_id",
            "source_channel_details.catchup_window_seconds",
          ])
          .where("source_items.external_id", "=", "channel-1")
          .executeTakeFirstOrThrow(),
      );
      assert.deepStrictEqual(channel, {
        external_id: "channel-1",
        guide_channel_id: "channel-one.example",
        catchup_window_seconds: 172_800,
      });

      const childCollection = yield* Effect.promise(() =>
        database
          .selectFrom("collections as child")
          .innerJoin("collections as parent", "parent.id", "child.parent_id")
          .select([
            "child.name as child_name",
            "parent.name as parent_name",
          ])
          .where("child.external_id", "=", "football")
          .executeTakeFirstOrThrow(),
      );
      assert.deepStrictEqual(childCollection, {
        child_name: "Football",
        parent_name: "Sports",
      });

      const run = yield* Effect.promise(() =>
        database
          .selectFrom("sync_runs")
          .select(["status", "collections_seen", "items_seen"])
          .executeTakeFirstOrThrow(),
      );
      assert.deepStrictEqual(run, {
        status: "succeeded",
        collections_seen: 3,
        items_seen: 2,
      });
    }),
  );

  it.effect("marks records missing from a later snapshot inactive", () =>
    Effect.gen(function* () {
      const connection = makeDatabaseConnection(workerEnvironment.DB);
      const database = connection.query;
      const repository = makeCatalogRepository(connection);

      yield* repository.upsertSource({
        id: "source-1",
        adapterKey: "fixture",
        name: "Fixture provider",
        endpoint: "https://provider.example",
      }, 50);
      yield* repository.reconcile({
        sourceId: "source-1",
        observedAt: 100,
        snapshot: initialSnapshot,
      });
      yield* repository.reconcile({
        sourceId: "source-1",
        observedAt: 200,
        snapshot: {
          contentKinds: ["channel"],
          collections: initialSnapshot.collections.slice(0, 1),
          items: initialSnapshot.items.slice(0, 1),
        },
      });

      const missingItem = yield* Effect.promise(() =>
        database
          .selectFrom("source_items")
          .select("active")
          .where("external_id", "=", "channel-2")
          .executeTakeFirstOrThrow(),
      );
      const missingCollection = yield* Effect.promise(() =>
        database
          .selectFrom("collections")
          .select("active")
          .where("external_id", "=", "news")
          .executeTakeFirstOrThrow(),
      );

      assert.strictEqual(Boolean(missingItem.active), false);
      assert.strictEqual(Boolean(missingCollection.active), false);
    }),
  );

  it.effect("writes a catalog at the observed provider scale", () =>
    Effect.gen(function* () {
      const connection = makeDatabaseConnection(workerEnvironment.DB);
      const database = connection.query;
      const repository = makeCatalogRepository(connection);
      const items = Array.from({ length: 4_110 }, (_, index) => ({
        externalId: `channel-${index}`,
        kind: "channel" as const,
        name: `Channel ${index}`,
        position: index,
        collectionExternalIds: [],
        channel: {
          isAdult: false,
          catchupEnabled: false,
        },
      }));

      yield* repository.upsertSource({
        id: "source-1",
        adapterKey: "fixture",
        name: "Fixture provider",
        endpoint: "https://provider.example",
      }, 50);
      yield* repository.reconcile({
        sourceId: "source-1",
        observedAt: 100,
        snapshot: {
          contentKinds: ["channel"],
          collections: [],
          items,
        },
      });

      const result = yield* Effect.promise(() =>
        database
          .selectFrom("source_items")
          .select((expression) => expression.fn.countAll<number>().as("count"))
          .executeTakeFirstOrThrow(),
      );
      assert.strictEqual(Number(result.count), 4_110);
    }),
  );

  it.effect("records a failed run without persisting a remote error cause", () =>
    Effect.gen(function* () {
      const connection = makeDatabaseConnection(workerEnvironment.DB);
      const database = connection.query;
      const repository = makeCatalogRepository(connection);

      yield* repository.upsertSource({
        id: "source-1",
        adapterKey: "fixture",
        name: "Fixture provider",
        endpoint: "https://provider.example",
      }, 50);

      const exit = yield* synchronizeCatalog("source-1").pipe(
        Effect.provideService(CatalogRepository, repository),
        Effect.provideService(CatalogProvider, {
          fetchCatalog: Effect.fail(new CatalogProviderError({
            operation: "fetch catalog",
            message: "Sensitive upstream detail",
          })),
        }),
        Effect.exit,
      );
      assert.strictEqual(Exit.isFailure(exit), true);

      const run = yield* Effect.promise(() =>
        database
          .selectFrom("sync_runs")
          .select(["status", "error_code", "error_message"])
          .executeTakeFirstOrThrow(),
      );
      assert.deepStrictEqual(run, {
        status: "failed",
        error_code: "CatalogProviderError",
        error_message: "Remote catalog synchronization failed",
      });
    }),
  );

  it("normalizes inconsistent Xtream scalar types at the adapter boundary", () => {
    const categories = Schema.decodeUnknownSync(Schema.Array(XtreamCategorySchema))([
      { category_id: "80", category_name: " SPORTS FR ", parent_id: 0 },
    ]);
    const streams = Schema.decodeUnknownSync(Schema.Array(XtreamLiveStreamSchema))([
      {
        num: 1,
        name: " Channel One ",
        stream_id: 80365,
        stream_icon: "https://images.example/channel.png",
        epg_channel_id: null,
        category_id: "80",
        added: "1704885011",
        is_adult: "0",
        tv_archive: 1,
        tv_archive_duration: "2",
      },
    ]);

    const snapshot = normalizeXtreamLiveCatalog(categories, streams);
    assert.strictEqual(snapshot.collections[0]?.name, "SPORTS FR");
    assert.strictEqual(snapshot.items[0]?.externalId, "80365");
    assert.strictEqual(snapshot.items[0]?.addedAt, 1_704_885_011_000);
    assert.strictEqual(snapshot.items[0]?.channel?.catchupWindowSeconds, 172_800);
  });

  it.effect("reports the synchronized source count through the Worker", () =>
    Effect.gen(function* () {
      const connection = makeDatabaseConnection(workerEnvironment.DB);
      const repository = makeCatalogRepository(connection);
      yield* repository.upsertSource({
        id: "source-1",
        adapterKey: "fixture",
        name: "Fixture provider",
        endpoint: "https://provider.example",
      }, 100);

      const response = yield* Effect.promise(() =>
        exports.default.fetch("http://example.test/health/database"),
      );

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(yield* Effect.promise(() => response.json()), {
        database: "ok",
        sourceCount: 1,
      });
    }),
  );
});
