import { assert, describe, it } from "@effect/vitest";
import { env, exports } from "cloudflare:workers";
import * as Effect from "effect/Effect";
import type { WorkerEnv } from "../../alchemy.run.ts";
import { makeDatabaseConnection } from "../db/client.ts";
import { makeCatalogRepository } from "../catalog/repository.ts";

const workerEnvironment = env as WorkerEnv;

const cleanDatabase = () =>
  workerEnvironment.DB.batch([
    workerEnvironment.DB.prepare("DELETE FROM collection_items"),
    workerEnvironment.DB.prepare("DELETE FROM source_channel_details"),
    workerEnvironment.DB.prepare("DELETE FROM source_items"),
    workerEnvironment.DB.prepare("DELETE FROM collections"),
    workerEnvironment.DB.prepare("DELETE FROM catalog_items"),
    workerEnvironment.DB.prepare("DELETE FROM sync_runs"),
    workerEnvironment.DB.prepare("DELETE FROM source_credentials"),
    workerEnvironment.DB.prepare("DELETE FROM sources"),
    workerEnvironment.DB.prepare("DELETE FROM household_memberships"),
    workerEnvironment.DB.prepare("DELETE FROM households"),
    workerEnvironment.DB.prepare("DELETE FROM users"),
  ]);

const request = (
  path: string,
  options: RequestInit = {},
) => exports.default.fetch(new Request(`http://example.test${path}`, options));

describe("backend Worker API", () => {
  it.effect("stores encrypted source credentials and resolves source-scoped playback", () =>
    Effect.gen(function* () {
      yield* Effect.promise(cleanDatabase);

      const registration = yield* Effect.promise(() => request("/v1/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Test User" }),
      }));
      assert.strictEqual(registration.status, 200);
      const user = yield* Effect.promise(() => registration.json() as Promise<{
        readonly id: string;
        readonly household: { readonly id: string };
      }>);

      const sourceResponse = yield* Effect.promise(() => request(
        `/v1/households/${user.household.id}/sources`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-teloche-user-id": user.id,
          },
          body: JSON.stringify({
            name: "Fixture Xtream",
            adapter: {
              type: "xtream",
              endpoint: "https://provider.example/",
              credentials: {
                username: "fixture-user",
                password: "fixture-password",
              },
            },
          }),
        },
      ));
      assert.strictEqual(sourceResponse.status, 200);
      const source = yield* Effect.promise(() => sourceResponse.json() as Promise<{
        readonly id: string;
        readonly householdId: string;
        readonly adapterKey: string;
      }>);
      assert.strictEqual(source.householdId, user.household.id);
      assert.strictEqual(source.adapterKey, "xtream");

      const credentials = yield* Effect.promise(() =>
        workerEnvironment.DB
          .prepare("SELECT algorithm, ciphertext, initialization_vector FROM source_credentials WHERE source_id = ?")
          .bind(source.id)
          .first<Record<string, unknown>>(),
      );
      assert.strictEqual(credentials?.algorithm, "AES-256-GCM");
      assert.ok(!JSON.stringify(credentials).includes("fixture-user"));
      assert.ok(!JSON.stringify(credentials).includes("fixture-password"));

      const repository = makeCatalogRepository(makeDatabaseConnection(workerEnvironment.DB));
      yield* repository.reconcile({
        sourceId: source.id,
        observedAt: 1_700_000_000_000,
        snapshot: {
          contentKinds: ["channel"],
          collections: [],
          items: [{
            externalId: "42",
            kind: "channel",
            name: "Fixture Channel",
            position: 1,
            collectionExternalIds: [],
            channel: {
              isAdult: false,
              catchupEnabled: false,
            },
          }],
        },
      });

      const channelId = `source-item:${encodeURIComponent(source.id)}:channel:42`;
      const playback = yield* Effect.promise(() => request(
        `/v1/sources/${source.id}/channels/${channelId}/playback`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-teloche-user-id": user.id,
          },
          body: JSON.stringify({ format: "hls" }),
        },
      ));
      assert.strictEqual(playback.status, 200);
      const descriptor = yield* Effect.promise(() => playback.json() as Promise<{
        readonly url: string;
        readonly format: string;
      }>);
      assert.strictEqual(descriptor.format, "hls");
      assert.ok(descriptor.url.endsWith("/live/fixture-user/fixture-password/42.m3u8"));

      const missingIdentity = yield* Effect.promise(() => request(
        `/v1/sources/${source.id}/channels`,
      ));
      assert.strictEqual(missingIdentity.status, 401);
    }),
  );
});
