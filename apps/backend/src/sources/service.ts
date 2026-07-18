import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type * as Http from "effect/unstable/http";
import { encodeXtreamCredentials } from "../adapters/xtream/adapter.ts";
import {
  CatalogProvider,
} from "../catalog/provider.ts";
import {
  CatalogRepository,
  type CatalogChannelRecord,
  type CatalogCollectionRecord,
  type CatalogRepositoryService,
} from "../catalog/repository.ts";
import { synchronizeCatalog, type CatalogSyncResult } from "../catalog/sync.ts";
import { CredentialVault } from "../credentials/vault.ts";
import type {
  PlaybackDescriptor,
  PlaybackFormat,
  ProviderAccount,
} from "../providers/adapter.ts";
import { ProviderAdapterRegistry } from "../providers/registry.ts";
import { Tenancy } from "../tenancy/service.ts";
import {
  type SourceRecord,
  type SourceRepositoryService,
  type SyncRunRecord,
} from "./repository.ts";
import type { HouseholdRole } from "../tenancy/repository.ts";

export class SourceNotFoundError extends Data.TaggedError("SourceNotFoundError")<{
  readonly sourceId: string;
}> {}

export class ChannelNotFoundError extends Data.TaggedError("ChannelNotFoundError")<{
  readonly sourceId: string;
  readonly channelId: string;
}> {}

export class SourceAccessDeniedError extends Data.TaggedError("SourceAccessDeniedError")<{
  readonly sourceId: string;
}> {}

export class InvalidSourceInputError extends Data.TaggedError("InvalidSourceInputError")<{
  readonly message: string;
}> {}

export class SourceOperationError extends Data.TaggedError("SourceOperationError")<{
  readonly operation: "create" | "credentials" | "validation" | "sync" | "catalog" | "playback";
  readonly kind: "internal" | "provider";
}> {}

export type SourceServiceError =
  | SourceNotFoundError
  | ChannelNotFoundError
  | SourceAccessDeniedError
  | InvalidSourceInputError
  | SourceOperationError;

export interface CreateXtreamSourceInput {
  readonly householdId: string;
  readonly name: string;
  readonly endpoint: string;
  readonly username: string;
  readonly password: string;
}

export interface SourceService {
  readonly createXtream: (
    userId: string,
    input: CreateXtreamSourceInput,
  ) => Effect.Effect<SourceRecord, SourceServiceError, SourceRuntime>;
  readonly listForHousehold: (
    userId: string,
    householdId: string,
  ) => Effect.Effect<ReadonlyArray<SourceRecord>, SourceServiceError, SourceRuntime>;
  readonly get: (
    userId: string,
    sourceId: string,
  ) => Effect.Effect<SourceRecord, SourceServiceError, SourceRuntime>;
  readonly validate: (
    userId: string,
    sourceId: string,
  ) => Effect.Effect<ProviderAccount, SourceServiceError, SourceRuntime>;
  readonly synchronize: (
    userId: string,
    sourceId: string,
  ) => Effect.Effect<CatalogSyncResult, SourceServiceError, SourceRuntime>;
  readonly listSyncRuns: (
    userId: string,
    sourceId: string,
    limit: number,
  ) => Effect.Effect<ReadonlyArray<SyncRunRecord>, SourceServiceError, SourceRuntime>;
  readonly listCollections: (
    userId: string,
    sourceId: string,
    kind: "channel" | "movie" | "series",
  ) => Effect.Effect<ReadonlyArray<CatalogCollectionRecord>, SourceServiceError, SourceRuntime>;
  readonly listChannels: (
    userId: string,
    input: {
      readonly sourceId: string;
      readonly collectionId?: string;
      readonly limit: number;
      readonly offset: number;
    },
  ) => Effect.Effect<ReadonlyArray<CatalogChannelRecord>, SourceServiceError, SourceRuntime>;
  readonly getChannel: (
    userId: string,
    sourceId: string,
    channelId: string,
  ) => Effect.Effect<CatalogChannelRecord, SourceServiceError, SourceRuntime>;
  readonly resolvePlayback: (
    userId: string,
    sourceId: string,
    channelId: string,
    format: PlaybackFormat,
  ) => Effect.Effect<PlaybackDescriptor, SourceServiceError, SourceRuntime>;
}

export class Sources extends Context.Service<Sources, SourceService>()("teloche/Sources") {}

const administrativeRoles: ReadonlyArray<HouseholdRole> = ["owner", "admin"];

type SourceRuntime =
  | Crypto.Crypto
  | CredentialVault
  | ProviderAdapterRegistry
  | Tenancy
  | Http.HttpClient.HttpClient;

const endpointFromInput = (value: string) =>
  Effect.try({
    try: () => {
      const endpoint = new URL(value.trim());
      if (
        (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") ||
        endpoint.username.length > 0 ||
        endpoint.password.length > 0 ||
        endpoint.search.length > 0 ||
        endpoint.hash.length > 0
      ) {
        throw new TypeError("Unsupported provider endpoint");
      }
      return endpoint.toString();
    },
    catch: () => new InvalidSourceInputError({
      message: "The provider endpoint must be an HTTP or HTTPS URL without embedded credentials",
    }),
  });

export const makeSources = (dependencies: {
  readonly sources: SourceRepositoryService;
  readonly catalog: CatalogRepositoryService;
}): SourceService => {
  const mapInternal = (operation: SourceOperationError["operation"]) =>
    Effect.mapError((error: unknown): SourceServiceError =>
      error instanceof SourceNotFoundError ||
      error instanceof ChannelNotFoundError ||
      error instanceof SourceAccessDeniedError ||
      error instanceof InvalidSourceInputError
        ? error
        : new SourceOperationError({ operation, kind: "internal" }));

  const mapProvider = (operation: SourceOperationError["operation"]) =>
    Effect.mapError((error: unknown): SourceServiceError =>
      error instanceof SourceNotFoundError ||
      error instanceof ChannelNotFoundError ||
      error instanceof SourceAccessDeniedError ||
      error instanceof InvalidSourceInputError
        ? error
        : new SourceOperationError({ operation, kind: "provider" }));

  const accessibleSource = (
    userId: string,
    sourceId: string,
    allowedRoles: ReadonlyArray<HouseholdRole>,
  ) => Effect.gen(function* () {
    const repository = dependencies.sources;
    const tenancy = yield* Tenancy;
    const source = yield* repository.findById(sourceId).pipe(mapInternal("catalog"));
    if (source === undefined) {
      return yield* Effect.fail(new SourceNotFoundError({ sourceId }));
    }
    yield* tenancy.requireHouseholdRole(userId, source.householdId, allowedRoles).pipe(
      Effect.mapError(() => new SourceAccessDeniedError({ sourceId })),
    );
    return source;
  });

  const withCredentials = (
    source: SourceRecord,
    operation: SourceOperationError["operation"],
  ) => Effect.gen(function* () {
    const vault = yield* CredentialVault;
    const registry = yield* ProviderAdapterRegistry;
    const credentials = yield* vault.load({
      sourceId: source.id,
      adapterKey: source.adapterKey,
    }).pipe(mapInternal("credentials"));
    const adapter = yield* registry.get(source.adapterKey).pipe(mapInternal(operation));
    return { adapter, credentials };
  });

  return Sources.of({
    createXtream: Effect.fn("Sources.createXtream")(function* (userId, input) {
      const tenancy = yield* Tenancy;
      const crypto = yield* Crypto.Crypto;
      const vault = yield* CredentialVault;
      const registry = yield* ProviderAdapterRegistry;
      const endpoint = yield* endpointFromInput(input.endpoint);
      yield* tenancy.requireHouseholdRole(
        userId,
        input.householdId,
        administrativeRoles,
      ).pipe(Effect.mapError(() => new SourceAccessDeniedError({ sourceId: input.householdId })));
      yield* registry.get("xtream").pipe(mapInternal("create"));

      const now = yield* Clock.currentTimeMillis;
      const source: SourceRecord = {
        id: yield* crypto.randomUUIDv7.pipe(mapInternal("create")),
        householdId: input.householdId,
        adapterKey: "xtream",
        name: input.name.trim(),
        endpoint,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      };
      const credentials = encodeXtreamCredentials({
        username: input.username,
        password: input.password,
      });

      yield* dependencies.sources.create(source).pipe(mapInternal("create"));
      yield* Effect.matchEffect(
        vault.store({
          sourceId: source.id,
          adapterKey: source.adapterKey,
          plaintext: credentials,
        }),
        {
          onFailure: (error) => dependencies.sources.remove(source.id).pipe(
            Effect.ignore,
            Effect.andThen(Effect.fail(error)),
          ),
          onSuccess: () => Effect.void,
        },
      ).pipe(mapInternal("credentials"));
      return source;
    }),

    listForHousehold: Effect.fn("Sources.listForHousehold")(function* (userId, householdId) {
      const tenancy = yield* Tenancy;
      yield* tenancy.requireHouseholdRole(userId, householdId).pipe(
        Effect.mapError(() => new SourceAccessDeniedError({ sourceId: householdId })),
      );
      return yield* dependencies.sources.listByHousehold(householdId).pipe(mapInternal("catalog"));
    }),

    get: Effect.fn("Sources.get")((userId, sourceId) =>
      accessibleSource(userId, sourceId, ["owner", "admin", "member"])),

    validate: Effect.fn("Sources.validate")(function* (userId, sourceId) {
      const source = yield* accessibleSource(userId, sourceId, administrativeRoles);
      const { adapter, credentials } = yield* withCredentials(source, "validation");
      const account = yield* adapter.validate(source, credentials).pipe(
        Effect.tapError(() =>
          Clock.currentTimeMillis.pipe(
            Effect.flatMap((now) => dependencies.sources.recordValidation(source.id, "invalid", now)),
            Effect.ignore,
          )),
        mapProvider("validation"),
      );
      const now = yield* Clock.currentTimeMillis;
      yield* dependencies.sources.recordValidation(source.id, "valid", now).pipe(mapInternal("validation"));
      return account;
    }),

    synchronize: Effect.fn("Sources.synchronize")(function* (userId, sourceId) {
      const source = yield* accessibleSource(userId, sourceId, administrativeRoles);
      const { adapter, credentials } = yield* withCredentials(source, "sync");
      const provider = yield* adapter.makeCatalogProvider(source, credentials).pipe(mapProvider("sync"));
      return yield* synchronizeCatalog(source.id).pipe(
        Effect.provideService(CatalogProvider, provider),
        Effect.provideService(CatalogRepository, dependencies.catalog),
        mapProvider("sync"),
      );
    }),

    listSyncRuns: Effect.fn("Sources.listSyncRuns")(function* (userId, sourceId, limit) {
      yield* accessibleSource(userId, sourceId, ["owner", "admin", "member"]);
      return yield* dependencies.sources.listSyncRuns(sourceId, limit).pipe(mapInternal("catalog"));
    }),

    listCollections: Effect.fn("Sources.listCollections")(function* (userId, sourceId, kind) {
      yield* accessibleSource(userId, sourceId, ["owner", "admin", "member"]);
      return yield* dependencies.catalog.listCollections(sourceId, kind).pipe(mapInternal("catalog"));
    }),

    listChannels: Effect.fn("Sources.listChannels")(function* (userId, input) {
      yield* accessibleSource(userId, input.sourceId, ["owner", "admin", "member"]);
      return yield* dependencies.catalog.listChannels(input).pipe(mapInternal("catalog"));
    }),

    getChannel: Effect.fn("Sources.getChannel")(function* (userId, sourceId, channelId) {
      yield* accessibleSource(userId, sourceId, ["owner", "admin", "member"]);
      const channel = yield* dependencies.catalog.findChannel(sourceId, channelId).pipe(mapInternal("catalog"));
      if (channel === undefined) {
        return yield* Effect.fail(new ChannelNotFoundError({ sourceId, channelId }));
      }
      return channel;
    }),

    resolvePlayback: Effect.fn("Sources.resolvePlayback")(function* (
      userId,
      sourceId,
      channelId,
      format,
    ) {
      const source = yield* accessibleSource(userId, sourceId, ["owner", "admin", "member"]);
      const channel = yield* dependencies.catalog.findChannel(sourceId, channelId).pipe(mapInternal("playback"));
      if (channel === undefined) {
        return yield* Effect.fail(new ChannelNotFoundError({ sourceId, channelId }));
      }
      const { adapter, credentials } = yield* withCredentials(source, "playback");
      return yield* adapter.resolvePlayback(
        source,
        credentials,
        { externalId: channel.externalId, kind: "channel" },
        format,
      ).pipe(mapProvider("playback"));
    }),
  });
};
