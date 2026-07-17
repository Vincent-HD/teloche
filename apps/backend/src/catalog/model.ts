export type ContentKind = "channel" | "movie" | "series";

export interface ProviderCollection {
  readonly externalId: string;
  readonly contentKind: ContentKind;
  readonly name: string;
  readonly parentExternalId?: string;
  readonly position: number;
}

export interface ProviderChannelDetails {
  readonly guideChannelId?: string;
  readonly isAdult: boolean;
  readonly catchupEnabled: boolean;
  readonly catchupWindowSeconds?: number;
}

export interface ProviderCatalogItem {
  readonly externalId: string;
  readonly kind: ContentKind;
  readonly name: string;
  readonly artworkUrl?: string;
  readonly position: number;
  readonly addedAt?: number;
  readonly collectionExternalIds: ReadonlyArray<string>;
  readonly channel?: ProviderChannelDetails;
}

export interface CatalogSnapshot {
  readonly contentKinds: ReadonlyArray<ContentKind>;
  readonly collections: ReadonlyArray<ProviderCollection>;
  readonly items: ReadonlyArray<ProviderCatalogItem>;
}

const encodeIdPart = (value: string) => encodeURIComponent(value);

export const collectionRecordId = (
  sourceId: string,
  contentKind: ContentKind,
  externalId: string,
) => `collection:${encodeIdPart(sourceId)}:${contentKind}:${encodeIdPart(externalId)}`;

export const sourceItemRecordId = (
  sourceId: string,
  contentKind: ContentKind,
  externalId: string,
) => `source-item:${encodeIdPart(sourceId)}:${contentKind}:${encodeIdPart(externalId)}`;

export const catalogItemRecordId = (
  sourceId: string,
  contentKind: ContentKind,
  externalId: string,
) => `catalog-item:${encodeIdPart(sourceId)}:${contentKind}:${encodeIdPart(externalId)}`;
