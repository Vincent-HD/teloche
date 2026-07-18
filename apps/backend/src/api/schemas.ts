import * as Schema from "effect/Schema";

export const UserSchema = Schema.Struct({
  id: Schema.String,
  displayName: Schema.String,
  household: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    role: Schema.Literal("owner"),
  }),
}).annotate({ identifier: "RegisteredUser" });

export const RegisterUserPayload = Schema.Struct({
  displayName: Schema.NonEmptyString,
}).annotate({ identifier: "RegisterUserPayload" });

export const HouseholdSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  role: Schema.Literals(["owner", "admin", "member"]),
  createdAt: Schema.Number,
}).annotate({ identifier: "Household" });

export const SourceSchema = Schema.Struct({
  id: Schema.String,
  householdId: Schema.String,
  adapterKey: Schema.String,
  name: Schema.String,
  endpoint: Schema.String,
  enabled: Schema.Boolean,
  lastValidationStatus: Schema.optionalKey(Schema.String),
  lastValidatedAt: Schema.optionalKey(Schema.Number),
  lastSuccessfulSyncAt: Schema.optionalKey(Schema.Number),
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
}).annotate({ identifier: "Source" });

export const CreateXtreamSourcePayload = Schema.Struct({
  name: Schema.NonEmptyString,
  adapter: Schema.Struct({
    type: Schema.Literal("xtream"),
    endpoint: Schema.NonEmptyString,
    credentials: Schema.Struct({
      username: Schema.NonEmptyString,
      password: Schema.NonEmptyString,
    }),
  }),
}).annotate({ identifier: "CreateXtreamSourcePayload" });

export const ProviderAccountSchema = Schema.Struct({
  status: Schema.String,
  expiresAt: Schema.optionalKey(Schema.Number),
  activeConnections: Schema.optionalKey(Schema.Number),
  maximumConnections: Schema.optionalKey(Schema.Number),
  allowedPlaybackFormats: Schema.Array(Schema.String),
}).annotate({ identifier: "ProviderAccount" });

export const SourceValidationSchema = Schema.Struct({
  sourceId: Schema.String,
  valid: Schema.Boolean,
  account: ProviderAccountSchema,
}).annotate({ identifier: "SourceValidation" });

export const SyncResultSchema = Schema.Struct({
  runId: Schema.String,
  collectionsSeen: Schema.Number,
  itemsSeen: Schema.Number,
}).annotate({ identifier: "CatalogSyncResult" });

export const SyncRunSchema = Schema.Struct({
  id: Schema.String,
  status: Schema.String,
  scope: Schema.String,
  startedAt: Schema.Number,
  finishedAt: Schema.optionalKey(Schema.Number),
  collectionsSeen: Schema.Number,
  itemsSeen: Schema.Number,
  errorCode: Schema.optionalKey(Schema.String),
  errorMessage: Schema.optionalKey(Schema.String),
}).annotate({ identifier: "SyncRun" });

export const CollectionSchema = Schema.Struct({
  id: Schema.String,
  parentId: Schema.optionalKey(Schema.String),
  name: Schema.String,
  contentKind: Schema.Literals(["channel", "movie", "series"]),
  position: Schema.Number,
}).annotate({ identifier: "CatalogCollection" });

export const ChannelSchema = Schema.Struct({
  id: Schema.String,
  sourceId: Schema.String,
  name: Schema.String,
  artworkUrl: Schema.optionalKey(Schema.String),
  position: Schema.Number,
  guideChannelId: Schema.optionalKey(Schema.String),
  isAdult: Schema.Boolean,
  catchupEnabled: Schema.Boolean,
  catchupWindowSeconds: Schema.optionalKey(Schema.Number),
}).annotate({ identifier: "Channel" });

export const ChannelPageSchema = Schema.Struct({
  items: Schema.Array(ChannelSchema),
  offset: Schema.Number,
  limit: Schema.Number,
  nextOffset: Schema.NullOr(Schema.Number),
}).annotate({ identifier: "ChannelPage" });

export const PlaybackRequestSchema = Schema.Struct({
  format: Schema.optionalKey(Schema.Literals(["hls", "mpeg-ts"])),
}).annotate({ identifier: "PlaybackRequest" });

export const PlaybackDescriptorSchema = Schema.Struct({
  url: Schema.String,
  format: Schema.Literals(["hls", "mpeg-ts"]),
  headers: Schema.Record(Schema.String, Schema.String),
  expiresAt: Schema.optionalKey(Schema.Number),
}).annotate({ identifier: "PlaybackDescriptor" });
