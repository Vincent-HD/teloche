import * as Context from "effect/Context";

export interface CurrentUserValue {
  readonly id: string;
}

export class CurrentUser extends Context.Service<CurrentUser, CurrentUserValue>()(
  "teloche/CurrentUser",
) {}
