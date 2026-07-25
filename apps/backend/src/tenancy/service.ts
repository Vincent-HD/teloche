import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import { TenancyRepository, type HouseholdRole } from "./repository.ts";

export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string;
}> {}

export class HouseholdAccessDeniedError extends Data.TaggedError("HouseholdAccessDeniedError")<{
  readonly householdId: string;
}> {}

export interface RegisteredUser {
  readonly id: string;
  readonly displayName: string;
  readonly household: {
    readonly id: string;
    readonly name: string;
    readonly role: "owner";
  };
}

export interface TenancyService {
  readonly registerUser: (
    displayName: string,
  ) => Effect.Effect<RegisteredUser, import("effect/PlatformError").PlatformError | import("./repository.ts").TenancyRepositoryError>;
  readonly assertUserExists: (
    userId: string,
  ) => Effect.Effect<void, UserNotFoundError | import("./repository.ts").TenancyRepositoryError>;
  readonly requireHouseholdRole: (
    userId: string,
    householdId: string,
    allowedRoles?: ReadonlyArray<HouseholdRole>,
  ) => Effect.Effect<HouseholdRole, HouseholdAccessDeniedError | import("./repository.ts").TenancyRepositoryError>;
  readonly listHouseholds: (
    userId: string,
  ) => Effect.Effect<ReadonlyArray<import("./repository.ts").HouseholdRecord>, import("./repository.ts").TenancyRepositoryError>;
}

export class Tenancy extends Context.Service<Tenancy, TenancyService>()("teloche/Tenancy") {}

export const TenancyLive = Effect.gen(function* () {
  const repository = yield* TenancyRepository;
  const crypto = yield* Crypto.Crypto;

  return Tenancy.of({
    registerUser: Effect.fn("Tenancy.registerUser")(function* (displayName) {
      const userId = yield* crypto.randomUUIDv7;
      const householdId = yield* crypto.randomUUIDv7;
      const now = yield* Clock.currentTimeMillis;
      const householdName = `${displayName}'s household`;

      yield* repository.registerUser({
        userId,
        displayName,
        householdId,
        householdName,
        now,
      });

      return {
        id: userId,
        displayName,
        household: {
          id: householdId,
          name: householdName,
          role: "owner",
        },
      };
    }),

    assertUserExists: Effect.fn("Tenancy.assertUserExists")(function* (userId) {
      const user = yield* repository.findUser(userId);
      if (user === undefined) {
        return yield* Effect.fail(new UserNotFoundError({ userId }));
      }
    }),

    requireHouseholdRole: Effect.fn("Tenancy.requireHouseholdRole")(function* (
      userId,
      householdId,
      allowedRoles = ["owner", "admin", "member"],
    ) {
      const role = yield* repository.findMembership(userId, householdId);
      if (role === undefined || !allowedRoles.includes(role)) {
        return yield* Effect.fail(new HouseholdAccessDeniedError({ householdId }));
      }
      return role;
    }),

    listHouseholds: Effect.fn("Tenancy.listHouseholds")((userId) =>
      repository.listHouseholds(userId)),
  });
});
