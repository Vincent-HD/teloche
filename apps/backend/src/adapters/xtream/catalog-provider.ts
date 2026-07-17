import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";
import type { CatalogSnapshot } from "../../catalog/model.ts";
import {
  CatalogProvider,
  CatalogProviderError,
  type CatalogProviderService,
} from "../../catalog/provider.ts";

const StringOrNumber = Schema.Union([Schema.String, Schema.Number]);
const OptionalStringOrNumber = Schema.optional(Schema.NullOr(StringOrNumber));

export const XtreamCategorySchema = Schema.Struct({
  category_id: StringOrNumber,
  category_name: Schema.String,
  parent_id: OptionalStringOrNumber,
});

export const XtreamLiveStreamSchema = Schema.Struct({
  num: StringOrNumber,
  name: Schema.String,
  stream_id: StringOrNumber,
  stream_icon: Schema.optional(Schema.NullOr(Schema.String)),
  epg_channel_id: OptionalStringOrNumber,
  category_id: OptionalStringOrNumber,
  added: OptionalStringOrNumber,
  is_adult: OptionalStringOrNumber,
  tv_archive: OptionalStringOrNumber,
  tv_archive_duration: OptionalStringOrNumber,
});

const XtreamCategoriesSchema = Schema.Array(XtreamCategorySchema);
const XtreamLiveStreamsSchema = Schema.Array(XtreamLiveStreamSchema);

type XtreamCategory = typeof XtreamCategorySchema.Type;
type XtreamLiveStream = typeof XtreamLiveStreamSchema.Type;

export interface XtreamCatalogProviderOptions {
  readonly endpoint: URL;
  readonly username: Redacted.Redacted<string>;
  readonly password: Redacted.Redacted<string>;
}

const normalizedString = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized === "" ? undefined : normalized;
};

const normalizedNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const enabledFlag = (value: string | number | null | undefined) =>
  normalizedString(value) === "1";

const epochSecondsToMillis = (value: string | number | null | undefined) => {
  const seconds = normalizedNumber(value);
  return seconds === undefined || seconds <= 0 ? undefined : seconds * 1_000;
};

export const normalizeXtreamLiveCatalog = (
  categories: ReadonlyArray<XtreamCategory>,
  streams: ReadonlyArray<XtreamLiveStream>,
): CatalogSnapshot => ({
  contentKinds: ["channel"],
  collections: categories.map((category, position) => {
    const parentExternalId = normalizedString(category.parent_id);
    return {
      externalId: String(category.category_id),
      contentKind: "channel" as const,
      name: category.category_name.trim(),
      ...(parentExternalId === undefined || parentExternalId === "0"
        ? {}
        : { parentExternalId }),
      position,
    };
  }),
  items: streams.map((stream) => {
    const artworkUrl = normalizedString(stream.stream_icon);
    const guideChannelId = normalizedString(stream.epg_channel_id);
    const categoryId = normalizedString(stream.category_id);
    const addedAt = epochSecondsToMillis(stream.added);
    const catchupEnabled = enabledFlag(stream.tv_archive);
    const catchupDays = normalizedNumber(stream.tv_archive_duration);

    return {
      externalId: String(stream.stream_id),
      kind: "channel" as const,
      name: stream.name.trim(),
      ...(artworkUrl === undefined ? {} : { artworkUrl }),
      position: normalizedNumber(stream.num) ?? 0,
      ...(addedAt === undefined ? {} : { addedAt }),
      collectionExternalIds: categoryId === undefined ? [] : [categoryId],
      channel: {
        ...(guideChannelId === undefined ? {} : { guideChannelId }),
        isAdult: enabledFlag(stream.is_adult),
        catchupEnabled,
        ...(catchupEnabled && catchupDays !== undefined && catchupDays > 0
          ? { catchupWindowSeconds: catchupDays * 24 * 60 * 60 }
          : {}),
      },
    };
  }),
});

const playerApiUrl = (endpoint: URL) => {
  if (endpoint.pathname.endsWith("/player_api.php")) {
    return endpoint;
  }
  const base = endpoint.toString().endsWith("/")
    ? endpoint
    : new URL(`${endpoint.toString()}/`);
  return new URL("player_api.php", base);
};

export const makeXtreamCatalogProvider = (
  client: HttpClient.HttpClient,
  options: XtreamCatalogProviderOptions,
): CatalogProviderService => {
  const execute = <S extends Schema.Constraint>(action: string, schema: S) =>
    HttpClientRequest.get(playerApiUrl(options.endpoint)).pipe(
      HttpClientRequest.setUrlParams({
        username: Redacted.value(options.username),
        password: Redacted.value(options.password),
        action,
      }),
      client.execute,
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
      Effect.timeout("60 seconds"),
      Effect.mapError(() =>
        new CatalogProviderError({
          operation: action,
          message: `Xtream request failed: ${action}`,
        })
      ),
      Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
    );

  return {
    fetchCatalog: Effect.gen(function* () {
      const [categories, streams] = yield* Effect.all([
        execute("get_live_categories", XtreamCategoriesSchema),
        execute("get_live_streams", XtreamLiveStreamsSchema),
      ], { concurrency: 2 });

      return normalizeXtreamLiveCatalog(categories, streams);
    }),
  };
};

export const XtreamCatalogProviderLive = (options: XtreamCatalogProviderOptions) =>
  Layer.effect(
    CatalogProvider,
    Effect.gen(function* () {
      return makeXtreamCatalogProvider(yield* HttpClient.HttpClient, options);
    }),
  );
