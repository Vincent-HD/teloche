import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";
import { Authorization } from "./authorization.ts";
import {
  InternalServerError,
  ProtectedEndpointErrors,
} from "./errors.ts";
import {
  ChannelPageSchema,
  ChannelSchema,
  CollectionSchema,
  CreateXtreamSourcePayload,
  HouseholdSchema,
  PlaybackDescriptorSchema,
  PlaybackRequestSchema,
  ProviderAccountSchema,
  RegisterUserPayload,
  SourceSchema,
  SyncResultSchema,
  SyncRunSchema,
  UserSchema,
} from "./schemas.ts";

const SystemGroup = HttpApiGroup.make("system").add(
  HttpApiEndpoint.get("databaseHealth", "/health/database", {
    success: Schema.Struct({
      database: Schema.Literal("ok"),
      sourceCount: Schema.Number,
    }),
    error: InternalServerError,
  }),
);

const UsersGroup = HttpApiGroup.make("users").add(
  HttpApiEndpoint.post("register", "/v1/users", {
    payload: RegisterUserPayload,
    success: UserSchema,
    error: InternalServerError,
  }),
);

const HouseholdsGroup = HttpApiGroup.make("households")
  .add(HttpApiEndpoint.get("list", "/v1/households", {
    success: Schema.Array(HouseholdSchema),
    error: ProtectedEndpointErrors,
  }))
  .middleware(Authorization);

const SourcesGroup = HttpApiGroup.make("sources")
  .add(HttpApiEndpoint.post("create", "/v1/households/:householdId/sources", {
    params: { householdId: Schema.String },
    payload: CreateXtreamSourcePayload,
    success: SourceSchema,
    error: ProtectedEndpointErrors,
  }))
  .add(HttpApiEndpoint.get("list", "/v1/households/:householdId/sources", {
    params: { householdId: Schema.String },
    success: Schema.Array(SourceSchema),
    error: ProtectedEndpointErrors,
  }))
  .add(HttpApiEndpoint.get("get", "/v1/sources/:sourceId", {
    params: { sourceId: Schema.String },
    success: SourceSchema,
    error: ProtectedEndpointErrors,
  }))
  .add(HttpApiEndpoint.post("validate", "/v1/sources/:sourceId/validate", {
    params: { sourceId: Schema.String },
    success: ProviderAccountSchema,
    error: ProtectedEndpointErrors,
  }))
  .add(HttpApiEndpoint.post("synchronize", "/v1/sources/:sourceId/sync", {
    params: { sourceId: Schema.String },
    success: SyncResultSchema,
    error: ProtectedEndpointErrors,
  }))
  .add(HttpApiEndpoint.get("syncRuns", "/v1/sources/:sourceId/sync-runs", {
    params: { sourceId: Schema.String },
    query: { limit: Schema.optionalKey(Schema.Int) },
    success: Schema.Array(SyncRunSchema),
    error: ProtectedEndpointErrors,
  }))
  .middleware(Authorization);

const CatalogGroup = HttpApiGroup.make("catalog")
  .add(HttpApiEndpoint.get("collections", "/v1/sources/:sourceId/collections", {
    params: { sourceId: Schema.String },
    query: { kind: Schema.optionalKey(Schema.Literals(["channel", "movie", "series"])) },
    success: Schema.Array(CollectionSchema),
    error: ProtectedEndpointErrors,
  }))
  .add(HttpApiEndpoint.get("channels", "/v1/sources/:sourceId/channels", {
    params: { sourceId: Schema.String },
    query: {
      collectionId: Schema.optionalKey(Schema.String),
      limit: Schema.optionalKey(Schema.Int),
      offset: Schema.optionalKey(Schema.Int),
    },
    success: ChannelPageSchema,
    error: ProtectedEndpointErrors,
  }))
  .add(HttpApiEndpoint.get("channel", "/v1/sources/:sourceId/channels/:channelId", {
    params: { sourceId: Schema.String, channelId: Schema.String },
    success: ChannelSchema,
    error: ProtectedEndpointErrors,
  }))
  .add(HttpApiEndpoint.post("playback", "/v1/sources/:sourceId/channels/:channelId/playback", {
    params: { sourceId: Schema.String, channelId: Schema.String },
    payload: PlaybackRequestSchema,
    success: PlaybackDescriptorSchema,
    error: ProtectedEndpointErrors,
  }))
  .middleware(Authorization);

export const BackendApi = HttpApi.make("TelocheBackendApi")
  .add(SystemGroup)
  .add(UsersGroup)
  .add(HouseholdsGroup)
  .add(SourcesGroup)
  .add(CatalogGroup)
  .annotate(OpenApi.Title, "Teloche Backend API")
  .annotate(
    OpenApi.Description,
    "Provider-neutral household, source, catalog, synchronization, and playback API.",
  );
