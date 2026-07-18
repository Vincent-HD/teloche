import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type { DatabaseConnection } from "../db/client.ts";

export interface SourceRecord {
  readonly id: string;
  readonly householdId: string;
  readonly adapterKey: string;
  readonly name: string;
  readonly endpoint: string;
  readonly enabled: boolean;
  readonly lastValidationStatus?: string;
  readonly lastValidatedAt?: number;
  readonly lastSuccessfulSyncAt?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface SyncRunRecord {
  readonly id: string;
  readonly status: string;
  readonly scope: string;
  readonly startedAt: number;
  readonly finishedAt?: number;
  readonly collectionsSeen: number;
  readonly itemsSeen: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export class SourceRepositoryError extends Data.TaggedError("SourceRepositoryError")<{
  readonly operation: string;
  readonly message: string;
}> {}

export interface SourceRepositoryService {
  readonly create: (
    source: SourceRecord,
  ) => Effect.Effect<void, SourceRepositoryError>;
  readonly remove: (
    sourceId: string,
  ) => Effect.Effect<void, SourceRepositoryError>;
  readonly findById: (
    sourceId: string,
  ) => Effect.Effect<SourceRecord | undefined, SourceRepositoryError>;
  readonly listByHousehold: (
    householdId: string,
  ) => Effect.Effect<ReadonlyArray<SourceRecord>, SourceRepositoryError>;
  readonly recordValidation: (
    sourceId: string,
    status: "valid" | "invalid",
    validatedAt: number,
  ) => Effect.Effect<void, SourceRepositoryError>;
  readonly listSyncRuns: (
    sourceId: string,
    limit: number,
  ) => Effect.Effect<ReadonlyArray<SyncRunRecord>, SourceRepositoryError>;
}

export class SourceRepository extends Context.Service<
  SourceRepository,
  SourceRepositoryService
>()("teloche/SourceRepository") {}

const databaseEffect = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: () => new SourceRepositoryError({
      operation,
      message: `Database operation failed: ${operation}`,
    }),
  });

const mapSource = (row: {
  readonly id: string;
  readonly household_id: string;
  readonly adapter_key: string;
  readonly name: string;
  readonly endpoint: string;
  readonly enabled: boolean | number;
  readonly last_validation_status: string | null;
  readonly last_validated_at: number | null;
  readonly last_successful_sync_at: number | null;
  readonly created_at: number;
  readonly updated_at: number;
}): SourceRecord => ({
  id: row.id,
  householdId: row.household_id,
  adapterKey: row.adapter_key,
  name: row.name,
  endpoint: row.endpoint,
  enabled: Boolean(row.enabled),
  ...(row.last_validation_status === null
    ? {}
    : { lastValidationStatus: row.last_validation_status }),
  ...(row.last_validated_at === null ? {} : { lastValidatedAt: row.last_validated_at }),
  ...(row.last_successful_sync_at === null
    ? {}
    : { lastSuccessfulSyncAt: row.last_successful_sync_at }),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const sourceSelection = [
  "id",
  "household_id",
  "adapter_key",
  "name",
  "endpoint",
  "enabled",
  "last_validation_status",
  "last_validated_at",
  "last_successful_sync_at",
  "created_at",
  "updated_at",
] as const;

export const makeSourceRepository = (
  connection: DatabaseConnection,
): SourceRepositoryService => {
  const database = connection.query;

  return SourceRepository.of({
    create: Effect.fn("SourceRepository.create")((source) =>
      databaseEffect("create source", () =>
        database
          .insertInto("sources")
          .values({
            id: source.id,
            household_id: source.householdId,
            adapter_key: source.adapterKey,
            name: source.name,
            endpoint: source.endpoint,
            enabled: source.enabled,
            last_validation_status: source.lastValidationStatus ?? null,
            last_validated_at: source.lastValidatedAt ?? null,
            last_successful_sync_at: source.lastSuccessfulSyncAt ?? null,
            created_at: source.createdAt,
            updated_at: source.updatedAt,
          })
          .execute()
          .then(() => undefined))),

    remove: Effect.fn("SourceRepository.remove")((sourceId) =>
      databaseEffect("remove source", () =>
        database
          .deleteFrom("sources")
          .where("id", "=", sourceId)
          .execute()
          .then(() => undefined))),

    findById: Effect.fn("SourceRepository.findById")((sourceId) =>
      databaseEffect("find source", () =>
        database
          .selectFrom("sources")
          .select(sourceSelection)
          .where("id", "=", sourceId)
          .executeTakeFirst()
          .then((row) => row === undefined ? undefined : mapSource(row)))),

    listByHousehold: Effect.fn("SourceRepository.listByHousehold")((householdId) =>
      databaseEffect("list household sources", () =>
        database
          .selectFrom("sources")
          .select(sourceSelection)
          .where("household_id", "=", householdId)
          .orderBy("created_at")
          .execute()
          .then((rows) => rows.map(mapSource)))),

    recordValidation: Effect.fn("SourceRepository.recordValidation")((sourceId, status, validatedAt) =>
      databaseEffect("record source validation", () =>
        database
          .updateTable("sources")
          .set({
            last_validation_status: status,
            last_validated_at: validatedAt,
            updated_at: validatedAt,
          })
          .where("id", "=", sourceId)
          .execute()
          .then(() => undefined))),

    listSyncRuns: Effect.fn("SourceRepository.listSyncRuns")((sourceId, limit) =>
      databaseEffect("list source sync runs", () =>
        database
          .selectFrom("sync_runs")
          .select([
            "id",
            "status",
            "scope",
            "started_at",
            "finished_at",
            "collections_seen",
            "items_seen",
            "error_code",
            "error_message",
          ])
          .where("source_id", "=", sourceId)
          .orderBy("started_at", "desc")
          .limit(limit)
          .execute()
          .then((rows) => rows.map((row) => ({
            id: row.id,
            status: row.status,
            scope: row.scope,
            startedAt: row.started_at,
            ...(row.finished_at === null ? {} : { finishedAt: row.finished_at }),
            collectionsSeen: row.collections_seen,
            itemsSeen: row.items_seen,
            ...(row.error_code === null ? {} : { errorCode: row.error_code }),
            ...(row.error_message === null ? {} : { errorMessage: row.error_message }),
          }))))),
  });
};
