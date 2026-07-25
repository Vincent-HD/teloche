import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  HttpServer,
} from "effect/unstable/http";
import {
  HttpApiBuilder,
  HttpApiScalar,
} from "effect/unstable/httpapi";
import { CatalogRepository } from "./catalog/repository.ts";
import { CurrentUser } from "./identity/current-user.ts";
import { Sources, type SourceServiceError } from "./sources/service.ts";
import { Tenancy } from "./tenancy/service.ts";
import { AuthorizationLive } from "./api/authorization.ts";
import { BackendApi } from "./api/contract.ts";
import {
  ForbiddenError,
  InternalServerError,
  InvalidRequestError,
  NotFoundError,
  ProviderUnavailableError,
  UnauthorizedError,
} from "./api/errors.ts";

const internalError = () => new InternalServerError({
  message: "The backend could not complete the request",
});

const sourceError = (error: SourceServiceError) => {
  switch (error._tag) {
    case "SourceNotFoundError":
    case "ChannelNotFoundError":
      return new NotFoundError({ message: "The requested catalog resource was not found" });
    case "SourceAccessDeniedError":
      return new ForbiddenError({ message: "You do not have access to this source" });
    case "InvalidSourceInputError":
      return new InvalidRequestError({ message: error.message });
    case "SourceOperationError":
      return error.kind === "provider"
        ? new ProviderUnavailableError({ message: "The provider could not complete the request" })
        : internalError();
  }
};

const mapSourceErrors = <A, R>(effect: Effect.Effect<A, SourceServiceError, R>) =>
  Effect.matchEffect(effect, {
    onFailure: (error) => Effect.fail(sourceError(error)),
    onSuccess: Effect.succeed,
  });

const mapInternalErrors = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.matchEffect(effect, {
    onFailure: () => Effect.fail(internalError()),
    onSuccess: Effect.succeed,
  });

const sourceResponse = (source: {
  readonly id: string;
  readonly householdId: string;
  readonly adapterKey: string;
  readonly name: string;
  readonly endpoint: string;
  readonly enabled: boolean;
  readonly lastValidationStatus?: string;
  readonly lastValidatedAt?: number;
  readonly lastSuccessfulSyncAt?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}) => ({
  id: source.id,
  householdId: source.householdId,
  adapterKey: source.adapterKey,
  name: source.name,
  endpoint: source.endpoint,
  enabled: source.enabled,
  ...(source.lastValidationStatus === undefined
    ? {}
    : { lastValidationStatus: source.lastValidationStatus }),
  ...(source.lastValidatedAt === undefined ? {} : { lastValidatedAt: source.lastValidatedAt }),
  ...(source.lastSuccessfulSyncAt === undefined
    ? {}
    : { lastSuccessfulSyncAt: source.lastSuccessfulSyncAt }),
  createdAt: source.createdAt,
  updatedAt: source.updatedAt,
});

const channelResponse = (channel: {
  readonly id: string;
  readonly sourceId: string;
  readonly name: string;
  readonly artworkUrl?: string;
  readonly position: number;
  readonly guideChannelId?: string;
  readonly isAdult: boolean;
  readonly catchupEnabled: boolean;
  readonly catchupWindowSeconds?: number;
}) => ({
  id: channel.id,
  sourceId: channel.sourceId,
  name: channel.name,
  ...(channel.artworkUrl === undefined ? {} : { artworkUrl: channel.artworkUrl }),
  position: channel.position,
  ...(channel.guideChannelId === undefined ? {} : { guideChannelId: channel.guideChannelId }),
  isAdult: channel.isAdult,
  catchupEnabled: channel.catchupEnabled,
  ...(channel.catchupWindowSeconds === undefined
    ? {}
    : { catchupWindowSeconds: channel.catchupWindowSeconds }),
});

const boundedLimit = (value: number | undefined, fallback: number, maximum: number) => {
  if (value === undefined) {
    return fallback;
  }
  return Math.min(Math.max(value, 1), maximum);
};

const SystemRoutes = HttpApiBuilder.group(BackendApi, "system", (handlers) =>
  handlers.handle("databaseHealth", () =>
    Effect.gen(function* () {
      const repository = yield* CatalogRepository;
      const sourceCount = yield* repository.countSources.pipe(mapInternalErrors);
      return { database: "ok" as const, sourceCount };
    })),
);

const UsersRoutes = HttpApiBuilder.group(BackendApi, "users", (handlers) =>
  handlers.handle("register", ({ payload }) =>
    Effect.gen(function* () {
      const tenancy = yield* Tenancy;
      return yield* tenancy.registerUser(payload.displayName.trim()).pipe(mapInternalErrors);
    })),
);

const HouseholdsRoutes = HttpApiBuilder.group(BackendApi, "households", (handlers) =>
  handlers.handle("list", () =>
    Effect.gen(function* () {
      const user = yield* CurrentUser;
      const tenancy = yield* Tenancy;
      yield* tenancy.assertUserExists(user.id).pipe(
        Effect.matchEffect({
          onFailure: () => Effect.fail(new UnauthorizedError({
            message: "The user identity is not recognized",
          })),
          onSuccess: Effect.succeed,
        }),
      );
      return yield* tenancy.listHouseholds(user.id).pipe(mapInternalErrors);
    })),
);

const SourcesRoutes = HttpApiBuilder.group(BackendApi, "sources", (handlers) =>
  handlers.handleAll({
    create: ({ params, payload }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        const source = yield* sources.createXtream(user.id, {
          householdId: params.householdId,
          name: payload.name,
          endpoint: payload.adapter.endpoint,
          username: payload.adapter.credentials.username,
          password: payload.adapter.credentials.password,
        }).pipe(mapSourceErrors);
        return sourceResponse(source);
      }),

    list: ({ params }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        const result = yield* sources.listForHousehold(user.id, params.householdId).pipe(mapSourceErrors);
        return result.map(sourceResponse);
      }),

    get: ({ params }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        return sourceResponse(yield* sources.get(user.id, params.sourceId).pipe(mapSourceErrors));
      }),

    validate: ({ params }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        return yield* sources.validate(user.id, params.sourceId).pipe(mapSourceErrors);
      }),

    synchronize: ({ params }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        return yield* sources.synchronize(user.id, params.sourceId).pipe(mapSourceErrors);
      }),

    syncRuns: ({ params, query }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        return yield* sources.listSyncRuns(
          user.id,
          params.sourceId,
          boundedLimit(query.limit, 20, 100),
        ).pipe(mapSourceErrors);
      }),
  }),
);

const CatalogRoutes = HttpApiBuilder.group(BackendApi, "catalog", (handlers) =>
  handlers.handleAll({
    collections: ({ params, query }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        return yield* sources.listCollections(user.id, params.sourceId, query.kind ?? "channel").pipe(mapSourceErrors);
      }),

    channels: ({ params, query }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        const limit = boundedLimit(query.limit, 100, 200);
        const offset = query.offset === undefined ? 0 : Math.max(query.offset, 0);
        const items = yield* sources.listChannels(user.id, {
          sourceId: params.sourceId,
          ...(query.collectionId === undefined ? {} : { collectionId: query.collectionId }),
          limit: limit + 1,
          offset,
        }).pipe(mapSourceErrors);
        const page = items.slice(0, limit);
        return {
          items: page.map(channelResponse),
          offset,
          limit,
          nextOffset: items.length > limit ? offset + limit : null,
        };
      }),

    channel: ({ params }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        return channelResponse(yield* sources.getChannel(
          user.id,
          params.sourceId,
          params.channelId,
        ).pipe(mapSourceErrors));
      }),

    playback: ({ params, payload }) =>
      Effect.gen(function* () {
        const user = yield* CurrentUser;
        const sources = yield* Sources;
        return yield* sources.resolvePlayback(
          user.id,
          params.sourceId,
          params.channelId,
          payload.format ?? "hls",
        ).pipe(mapSourceErrors);
      }),
  }),
);

export const BackendHttpApiLayer = HttpApiBuilder.layer(BackendApi, {
  openapiPath: "/openapi.json",
}).pipe(
  Layer.provide(SystemRoutes),
  Layer.provide(UsersRoutes),
  Layer.provide(HouseholdsRoutes),
  Layer.provide(SourcesRoutes),
  Layer.provide(CatalogRoutes),
  Layer.provide(AuthorizationLive),
  Layer.provide(HttpApiScalar.layerCdn(BackendApi, { path: "/docs" })),
  Layer.provide(HttpServer.layerServices),
);
