import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";
import type * as Redacted from "effect/Redacted";
import type { CatalogProviderService } from "../catalog/provider.ts";

export interface ProviderSource {
  readonly id: string;
  readonly adapterKey: string;
  readonly endpoint: string;
}

export interface ProviderAccount {
  readonly status: string;
  readonly expiresAt?: number;
  readonly activeConnections?: number;
  readonly maximumConnections?: number;
  readonly allowedPlaybackFormats: ReadonlyArray<string>;
}

export type PlaybackFormat = "hls" | "mpeg-ts";

export interface PlaybackDescriptor {
  readonly url: string;
  readonly format: PlaybackFormat;
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt?: number;
}

export class ProviderAdapterError extends Data.TaggedError("ProviderAdapterError")<{
  readonly operation: "credentials" | "validation" | "catalog" | "playback";
  readonly message: string;
}> {}

export interface ProviderAdapter {
  readonly key: string;
  readonly validate: (
    source: ProviderSource,
    credentials: Redacted.Redacted<string>,
  ) => Effect.Effect<ProviderAccount, ProviderAdapterError, import("effect/unstable/http").HttpClient.HttpClient>;
  readonly makeCatalogProvider: (
    source: ProviderSource,
    credentials: Redacted.Redacted<string>,
  ) => Effect.Effect<CatalogProviderService, ProviderAdapterError, import("effect/unstable/http").HttpClient.HttpClient>;
  readonly resolvePlayback: (
    source: ProviderSource,
    credentials: Redacted.Redacted<string>,
    item: {
      readonly externalId: string;
      readonly kind: "channel" | "movie" | "series";
    },
    format: PlaybackFormat,
  ) => Effect.Effect<PlaybackDescriptor, ProviderAdapterError>;
}
