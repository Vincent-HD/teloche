import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import {
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";
import type {
  PlaybackDescriptor,
  PlaybackFormat,
  ProviderAdapter,
  ProviderSource,
} from "../../providers/adapter.ts";
import { ProviderAdapterError } from "../../providers/adapter.ts";
import {
  makeXtreamCatalogProvider,
  playerApiUrl,
} from "./catalog-provider.ts";

const XtreamStoredCredentials = Schema.Struct({
  username: Schema.String,
  password: Schema.String,
});

const StringOrNumber = Schema.Union([Schema.String, Schema.Number]);
const OptionalStringOrNumber = Schema.optional(Schema.NullOr(StringOrNumber));

const XtreamAccountResponse = Schema.Struct({
  user_info: Schema.Struct({
    auth: OptionalStringOrNumber,
    status: Schema.optional(Schema.NullOr(Schema.String)),
    exp_date: OptionalStringOrNumber,
    active_cons: OptionalStringOrNumber,
    max_connections: OptionalStringOrNumber,
    allowed_output_formats: Schema.optional(Schema.Array(Schema.String)),
  }),
});

type XtreamCredentials = typeof XtreamStoredCredentials.Type;

export interface XtreamCredentialInput {
  readonly username: string;
  readonly password: string;
}

export const encodeXtreamCredentials = (
  credentials: XtreamCredentialInput,
): Redacted.Redacted<string> => Redacted.make(JSON.stringify(credentials));

const decodeCredentials = (credentials: Redacted.Redacted<string>) =>
  Effect.try({
    try: () => JSON.parse(Redacted.value(credentials)) as unknown,
    catch: () => new ProviderAdapterError({
      operation: "credentials",
      message: "Stored provider credentials are invalid",
    }),
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(XtreamStoredCredentials)),
    Effect.mapError(() => new ProviderAdapterError({
      operation: "credentials",
      message: "Stored provider credentials are invalid",
    })),
  );

const optionsFrom = (source: ProviderSource, credentials: XtreamCredentials) => ({
  endpoint: new URL(source.endpoint),
  username: Redacted.make(credentials.username),
  password: Redacted.make(credentials.password),
});

const optionalNumber = (value: string | number | null | undefined) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
};

const pathSegment = (value: string) => encodeURIComponent(value);

const playbackUrl = (
  source: ProviderSource,
  credentials: XtreamCredentials,
  externalId: string,
  kind: "channel" | "movie" | "series",
  format: PlaybackFormat,
) => {
  const endpoint = new URL(source.endpoint);
  if (endpoint.pathname.endsWith("/player_api.php")) {
    endpoint.pathname = endpoint.pathname.slice(0, -"player_api.php".length);
  }
  const base = new URL(endpoint.toString().endsWith("/") ? endpoint : `${endpoint.toString()}/`);
  const route = kind === "channel" ? "live" : kind;
  const extension = format === "hls" ? "m3u8" : "ts";
  return new URL(
    `${route}/${pathSegment(credentials.username)}/${pathSegment(credentials.password)}/${pathSegment(externalId)}.${extension}`,
    base,
  ).toString();
};

export const XtreamAdapter: ProviderAdapter = {
  key: "xtream",

  validate: Effect.fn("XtreamAdapter.validate")(function* (source, encryptedCredentials) {
    const credentials = yield* decodeCredentials(encryptedCredentials);
    const client = yield* HttpClient.HttpClient;
    const options = optionsFrom(source, credentials);
    const response = yield* HttpClientRequest.get(playerApiUrl(options.endpoint)).pipe(
      HttpClientRequest.setUrlParams({
        username: Redacted.value(options.username),
        password: Redacted.value(options.password),
      }),
      client.execute,
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(XtreamAccountResponse)),
      Effect.timeout("30 seconds"),
      Effect.mapError(() => new ProviderAdapterError({
        operation: "validation",
        message: "Provider validation failed",
      })),
      Effect.provideService(HttpClient.TracerDisabledWhen, () => true),
    );

    if (String(response.user_info.auth ?? "0") !== "1") {
      return yield* Effect.fail(new ProviderAdapterError({
        operation: "validation",
        message: "Provider rejected the credentials",
      }));
    }

    const expirationSeconds = optionalNumber(response.user_info.exp_date);
    const activeConnections = optionalNumber(response.user_info.active_cons);
    const maximumConnections = optionalNumber(response.user_info.max_connections);

    return {
      status: response.user_info.status ?? "Active",
      ...(expirationSeconds === undefined || expirationSeconds === 0
        ? {}
        : { expiresAt: expirationSeconds * 1_000 }),
      ...(activeConnections === undefined ? {} : { activeConnections }),
      ...(maximumConnections === undefined ? {} : { maximumConnections }),
      allowedPlaybackFormats: response.user_info.allowed_output_formats ?? [],
    };
  }),

  makeCatalogProvider: Effect.fn("XtreamAdapter.makeCatalogProvider")(function* (
    source,
    encryptedCredentials,
  ) {
    const credentials = yield* decodeCredentials(encryptedCredentials);
    const client = yield* HttpClient.HttpClient;
    return makeXtreamCatalogProvider(client, optionsFrom(source, credentials));
  }),

  resolvePlayback: Effect.fn("XtreamAdapter.resolvePlayback")(function* (
    source,
    encryptedCredentials,
    item,
    format,
  ): Generator<Effect.Effect<XtreamCredentials, ProviderAdapterError>, PlaybackDescriptor> {
    const credentials = yield* decodeCredentials(encryptedCredentials);
    return {
      url: playbackUrl(source, credentials, item.externalId, item.kind, format),
      format,
      headers: {},
    };
  }),
};
