import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type { DatabaseConnection } from "../db/client.ts";
import type { CredentialEnvelope } from "./model.ts";

export class CredentialStoreError extends Data.TaggedError("CredentialStoreError")<{
  readonly operation: string;
  readonly message: string;
}> {}

export interface CredentialStoreService {
  readonly put: (
    sourceId: string,
    envelope: CredentialEnvelope,
    now: number,
  ) => Effect.Effect<void, CredentialStoreError>;
  readonly get: (
    sourceId: string,
  ) => Effect.Effect<CredentialEnvelope | undefined, CredentialStoreError>;
  readonly remove: (
    sourceId: string,
  ) => Effect.Effect<void, CredentialStoreError>;
}

export class CredentialStore extends Context.Service<
  CredentialStore,
  CredentialStoreService
>()("teloche/CredentialStore") {}

const databaseEffect = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: () => new CredentialStoreError({
      operation,
      message: `Database operation failed: ${operation}`,
    }),
  });

export const makeCredentialStore = (
  connection: DatabaseConnection,
): CredentialStoreService => {
  const database = connection.query;

  return CredentialStore.of({
    put: Effect.fn("CredentialStore.put")((sourceId, envelope, now) =>
      databaseEffect("store encrypted credentials", () =>
        database
          .insertInto("source_credentials")
          .values({
            source_id: sourceId,
            format_version: envelope.formatVersion,
            algorithm: envelope.algorithm,
            key_id: envelope.keyId,
            initialization_vector: envelope.initializationVector,
            ciphertext: envelope.ciphertext,
            created_at: now,
            updated_at: now,
          })
          .onConflict((conflict) =>
            conflict.column("source_id").doUpdateSet({
              format_version: envelope.formatVersion,
              algorithm: envelope.algorithm,
              key_id: envelope.keyId,
              initialization_vector: envelope.initializationVector,
              ciphertext: envelope.ciphertext,
              updated_at: now,
            })
          )
          .execute()
          .then(() => undefined))),

    get: Effect.fn("CredentialStore.get")((sourceId) =>
      databaseEffect("load encrypted credentials", () =>
        database
          .selectFrom("source_credentials")
          .select([
            "format_version",
            "algorithm",
            "key_id",
            "initialization_vector",
            "ciphertext",
          ])
          .where("source_id", "=", sourceId)
          .executeTakeFirst()
          .then((row) => row === undefined
            ? undefined
            : {
              formatVersion: row.format_version as 1,
              algorithm: row.algorithm as "AES-256-GCM",
              keyId: row.key_id,
              initializationVector: row.initialization_vector,
              ciphertext: row.ciphertext,
            }))),

    remove: Effect.fn("CredentialStore.remove")((sourceId) =>
      databaseEffect("remove encrypted credentials", () =>
        database
          .deleteFrom("source_credentials")
          .where("source_id", "=", sourceId)
          .execute()
          .then(() => undefined))),
  });
};
