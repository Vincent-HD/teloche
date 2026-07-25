import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";
import type { CatalogSnapshot } from "./model.ts";

export class CatalogProviderError extends Data.TaggedError("CatalogProviderError")<{
  readonly operation: string;
  readonly message: string;
}> {}

export interface CatalogProviderService {
  readonly fetchCatalog: Effect.Effect<CatalogSnapshot, CatalogProviderError>;
}

export class CatalogProvider extends Context.Service<
  CatalogProvider,
  CatalogProviderService
>()("teloche/CatalogProvider") {}
