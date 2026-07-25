import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type { ProviderAdapter } from "./adapter.ts";

export class UnsupportedProviderAdapterError extends Data.TaggedError(
  "UnsupportedProviderAdapterError",
)<{
  readonly adapterKey: string;
}> {}

export interface ProviderAdapterRegistryService {
  readonly get: (
    adapterKey: string,
  ) => Effect.Effect<ProviderAdapter, UnsupportedProviderAdapterError>;
  readonly keys: ReadonlyArray<string>;
}

export class ProviderAdapterRegistry extends Context.Service<
  ProviderAdapterRegistry,
  ProviderAdapterRegistryService
>()("teloche/ProviderAdapterRegistry") {}

export const makeProviderAdapterRegistry = (
  adapters: ReadonlyArray<ProviderAdapter>,
): ProviderAdapterRegistryService => {
  const byKey = new Map(adapters.map((adapter) => [adapter.key, adapter]));

  return ProviderAdapterRegistry.of({
    keys: Array.from(byKey.keys()),
    get: Effect.fn("ProviderAdapterRegistry.get")(function* (adapterKey) {
      const adapter = byKey.get(adapterKey);
      if (adapter === undefined) {
        return yield* Effect.fail(new UnsupportedProviderAdapterError({ adapterKey }));
      }
      return adapter;
    }),
  });
};
