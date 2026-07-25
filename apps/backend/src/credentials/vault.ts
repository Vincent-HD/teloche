import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type * as Redacted from "effect/Redacted";
import {
  CredentialCipher,
} from "./cipher.ts";
import type {
  CredentialDecryptionError,
  CredentialEncryptionError,
} from "./model.ts";
import { CredentialStore, type CredentialStoreError } from "./store.ts";

export class SourceCredentialsMissingError extends Data.TaggedError(
  "SourceCredentialsMissingError",
)<{
  readonly sourceId: string;
}> {}

export interface CredentialVaultService {
  readonly store: (
    input: {
      readonly sourceId: string;
      readonly adapterKey: string;
      readonly plaintext: Redacted.Redacted<string>;
    },
  ) => Effect.Effect<void, CredentialEncryptionError | CredentialStoreError>;
  readonly load: (
    input: { readonly sourceId: string; readonly adapterKey: string },
  ) => Effect.Effect<
    Redacted.Redacted<string>,
    CredentialDecryptionError | CredentialStoreError | SourceCredentialsMissingError
  >;
}

export class CredentialVault extends Context.Service<
  CredentialVault,
  CredentialVaultService
>()("teloche/CredentialVault") {}

export const CredentialVaultLive = Effect.gen(function* () {
  const cipher = yield* CredentialCipher;
  const store = yield* CredentialStore;

  return CredentialVault.of({
    store: Effect.fn("CredentialVault.store")(function* (input) {
      const envelope = yield* cipher.encrypt(input);
      const now = yield* Clock.currentTimeMillis;
      yield* store.put(input.sourceId, envelope, now);
    }),

    load: Effect.fn("CredentialVault.load")(function* (input) {
      const envelope = yield* store.get(input.sourceId);
      if (envelope === undefined) {
        return yield* Effect.fail(new SourceCredentialsMissingError({
          sourceId: input.sourceId,
        }));
      }
      return yield* cipher.decrypt({ ...input, envelope });
    }),
  });
});
