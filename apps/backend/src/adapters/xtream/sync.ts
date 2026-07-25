import * as Clock from "effect/Clock";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import { FetchHttpClient } from "effect/unstable/http";
import { synchronizeCatalog } from "../../catalog/sync.ts";
import {
  CatalogRepository,
  type SourceInput,
} from "../../catalog/repository.ts";
import { XtreamCatalogProviderLive } from "./catalog-provider.ts";

export interface SynchronizeXtreamSourceInput {
  readonly source: SourceInput;
  readonly username: Redacted.Redacted<string>;
  readonly password: Redacted.Redacted<string>;
}

export class XtreamSourceConfigurationError extends Data.TaggedError(
  "XtreamSourceConfigurationError",
)<{
  readonly message: string;
}> {}

export const synchronizeXtreamSource = (input: SynchronizeXtreamSourceInput) =>
  Effect.gen(function* () {
    const endpoint = yield* Effect.try({
      try: () => new URL(input.source.endpoint),
      catch: () => new XtreamSourceConfigurationError({
        message: "The Xtream source endpoint is not a valid URL",
      }),
    });
    const repository = yield* CatalogRepository;
    const now = yield* Clock.currentTimeMillis;

    yield* repository.upsertSource({
      ...input.source,
      adapterKey: "xtream",
    }, now);

    return yield* synchronizeCatalog(input.source.id).pipe(
      Effect.provide(XtreamCatalogProviderLive({
        endpoint,
        username: input.username,
        password: input.password,
      }).pipe(Layer.provide(FetchHttpClient.layer))),
    );
  });
