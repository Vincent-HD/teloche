import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import { CatalogProvider } from "./provider.ts";
import { CatalogRepository } from "./repository.ts";

export interface CatalogSyncResult {
  readonly runId: string;
  readonly collectionsSeen: number;
  readonly itemsSeen: number;
}

const safeErrorMessage = (error: { readonly _tag?: string }) =>
  error._tag === "CatalogProviderError"
    ? "Remote catalog synchronization failed"
    : "Catalog persistence failed";

export const synchronizeCatalog = (sourceId: string) =>
  Effect.gen(function* () {
    const provider = yield* CatalogProvider;
    const repository = yield* CatalogRepository;
    const startedAt = yield* Clock.currentTimeMillis;
    const runId = yield* Effect.sync(() => crypto.randomUUID());

    yield* repository.beginSync(runId, sourceId, startedAt);

    const synchronize = Effect.gen(function* () {
      const snapshot = yield* provider.fetchCatalog;
      yield* repository.reconcile({ sourceId, observedAt: startedAt, snapshot });

      const finishedAt = yield* Clock.currentTimeMillis;
      yield* repository.completeSync({
        runId,
        sourceId,
        finishedAt,
        collectionsSeen: snapshot.collections.length,
        itemsSeen: snapshot.items.length,
      });

      return {
        runId,
        collectionsSeen: snapshot.collections.length,
        itemsSeen: snapshot.items.length,
      } satisfies CatalogSyncResult;
    });

    return yield* synchronize.pipe(
      Effect.tapError((error) =>
        Clock.currentTimeMillis.pipe(
          Effect.flatMap((finishedAt) =>
            repository.failSync({
              runId,
              finishedAt,
              errorCode: error._tag,
              errorMessage: safeErrorMessage(error),
            })
          ),
          Effect.ignore,
        )
      ),
    );
  });
