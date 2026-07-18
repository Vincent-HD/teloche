import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type { DatabaseConnection } from "../db/client.ts";

export type HouseholdRole = "owner" | "admin" | "member";

export interface UserRecord {
  readonly id: string;
  readonly displayName: string;
  readonly createdAt: number;
}

export interface HouseholdRecord {
  readonly id: string;
  readonly name: string;
  readonly role: HouseholdRole;
  readonly createdAt: number;
}

export class TenancyRepositoryError extends Data.TaggedError("TenancyRepositoryError")<{
  readonly operation: string;
  readonly message: string;
}> {}

export interface RegisterUserInput {
  readonly userId: string;
  readonly displayName: string;
  readonly householdId: string;
  readonly householdName: string;
  readonly now: number;
}

export interface TenancyRepositoryService {
  readonly registerUser: (
    input: RegisterUserInput,
  ) => Effect.Effect<void, TenancyRepositoryError>;
  readonly findUser: (
    userId: string,
  ) => Effect.Effect<UserRecord | undefined, TenancyRepositoryError>;
  readonly listHouseholds: (
    userId: string,
  ) => Effect.Effect<ReadonlyArray<HouseholdRecord>, TenancyRepositoryError>;
  readonly findMembership: (
    userId: string,
    householdId: string,
  ) => Effect.Effect<HouseholdRole | undefined, TenancyRepositoryError>;
}

export class TenancyRepository extends Context.Service<
  TenancyRepository,
  TenancyRepositoryService
>()("teloche/TenancyRepository") {}

interface CompilableQuery {
  readonly compile: () => {
    readonly sql: string;
    readonly parameters: ReadonlyArray<unknown>;
  };
}

const databaseEffect = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: () => new TenancyRepositoryError({
      operation,
      message: `Database operation failed: ${operation}`,
    }),
  });

export const makeTenancyRepository = (
  connection: DatabaseConnection,
): TenancyRepositoryService => {
  const database = connection.query;
  const executeBatch = (operation: string, queries: ReadonlyArray<CompilableQuery>) =>
    databaseEffect(operation, () =>
      connection.raw.batch(queries.map((query) => {
        const compiled = query.compile();
        return connection.raw.prepare(compiled.sql).bind(...compiled.parameters);
      })).then(() => undefined));

  return {
    registerUser: Effect.fn("TenancyRepository.registerUser")((input) =>
      executeBatch("register user and household", [
        database.insertInto("users").values({
          id: input.userId,
          display_name: input.displayName,
          created_at: input.now,
          updated_at: input.now,
        }),
        database.insertInto("households").values({
          id: input.householdId,
          name: input.householdName,
          created_by_user_id: input.userId,
          created_at: input.now,
          updated_at: input.now,
        }),
        database.insertInto("household_memberships").values({
          household_id: input.householdId,
          user_id: input.userId,
          role: "owner",
          created_at: input.now,
        }),
      ])),

    findUser: Effect.fn("TenancyRepository.findUser")((userId) =>
      databaseEffect("find user", () =>
        database
          .selectFrom("users")
          .select(["id", "display_name", "created_at"])
          .where("id", "=", userId)
          .executeTakeFirst()
          .then((row) => row === undefined
            ? undefined
            : {
              id: row.id,
              displayName: row.display_name,
              createdAt: row.created_at,
            }))),

    listHouseholds: Effect.fn("TenancyRepository.listHouseholds")((userId) =>
      databaseEffect("list households", () =>
        database
          .selectFrom("household_memberships")
          .innerJoin("households", "households.id", "household_memberships.household_id")
          .select([
            "households.id",
            "households.name",
            "households.created_at",
            "household_memberships.role",
          ])
          .where("household_memberships.user_id", "=", userId)
          .orderBy("households.created_at")
          .execute()
          .then((rows) => rows.map((row) => ({
            id: row.id,
            name: row.name,
            role: row.role as HouseholdRole,
            createdAt: row.created_at,
          }))))),

    findMembership: Effect.fn("TenancyRepository.findMembership")((userId, householdId) =>
      databaseEffect("find household membership", () =>
        database
          .selectFrom("household_memberships")
          .select("role")
          .where("user_id", "=", userId)
          .where("household_id", "=", householdId)
          .executeTakeFirst()
          .then((row) => row?.role as HouseholdRole | undefined))),
  };
};
