import * as Schema from "effect/Schema";

export class UnauthorizedError extends Schema.TaggedErrorClass<UnauthorizedError>()(
  "UnauthorizedError",
  { message: Schema.String },
  { httpApiStatus: 401 },
) {}

export class ForbiddenError extends Schema.TaggedErrorClass<ForbiddenError>()(
  "ForbiddenError",
  { message: Schema.String },
  { httpApiStatus: 403 },
) {}

export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()(
  "NotFoundError",
  { message: Schema.String },
  { httpApiStatus: 404 },
) {}

export class InvalidRequestError extends Schema.TaggedErrorClass<InvalidRequestError>()(
  "InvalidRequestError",
  { message: Schema.String },
  { httpApiStatus: 400 },
) {}

export class ProviderUnavailableError extends Schema.TaggedErrorClass<ProviderUnavailableError>()(
  "ProviderUnavailableError",
  { message: Schema.String },
  { httpApiStatus: 502 },
) {}

export class InternalServerError extends Schema.TaggedErrorClass<InternalServerError>()(
  "InternalServerError",
  { message: Schema.String },
  { httpApiStatus: 500 },
) {}

export const ProtectedEndpointErrors = [
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  InvalidRequestError,
  ProviderUnavailableError,
  InternalServerError,
] as const;
