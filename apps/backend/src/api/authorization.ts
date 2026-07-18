import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import {
  HttpApiMiddleware,
  HttpApiSecurity,
} from "effect/unstable/httpapi";
import { CurrentUser } from "../identity/current-user.ts";
import { UnauthorizedError } from "./errors.ts";

const trustedUserHeader = HttpApiSecurity.apiKey({
  in: "header",
  key: "x-teloche-user-id",
});

export class Authorization extends HttpApiMiddleware.Service<Authorization, {
  readonly provides: CurrentUser;
}>()("teloche/Authorization", {
  error: UnauthorizedError,
  security: { trustedUserHeader },
}) {}

export const AuthorizationLive = Layer.succeed(Authorization, {
  trustedUserHeader: (effect, options) =>
    Effect.provideServiceEffect(
      effect,
      CurrentUser,
      Effect.gen(function* () {
        const userId = Redacted.value(options.credential).trim();
        if (userId.length === 0) {
          return yield* Effect.fail(new UnauthorizedError({
            message: "A user identity is required",
          }));
        }
        return { id: userId };
      }),
    ),
});
