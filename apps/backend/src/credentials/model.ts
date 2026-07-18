import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";
import type * as Redacted from "effect/Redacted";

export const CredentialEnvelopeFormatVersion = 1 as const;

export const CredentialEnvelopeAlgorithm = "AES-256-GCM" as const;

export type CredentialEnvelopeFormatVersion =
  typeof CredentialEnvelopeFormatVersion;

export type CredentialEnvelopeAlgorithm = typeof CredentialEnvelopeAlgorithm;

export interface CredentialEnvelope {
  readonly formatVersion: CredentialEnvelopeFormatVersion;
  readonly algorithm: CredentialEnvelopeAlgorithm;
  readonly keyId: string;
  readonly initializationVector: string;
  readonly ciphertext: string;
}

export interface CredentialBinding {
  readonly sourceId: string;
  readonly adapterKey: string;
}

export interface EncryptCredentialsInput extends CredentialBinding {
  readonly plaintext: Redacted.Redacted<string>;
}

export interface DecryptCredentialsInput extends CredentialBinding {
  readonly envelope: CredentialEnvelope;
}

export class CredentialCipherConfigurationError extends Data.TaggedError(
  "CredentialCipherConfigurationError",
)<{
  readonly code: "INVALID_CONFIGURATION";
  readonly message: string;
}> {}

export class CredentialEncryptionError extends Data.TaggedError(
  "CredentialEncryptionError",
)<{
  readonly code: "ENCRYPTION_FAILED";
  readonly message: string;
}> {}

export class CredentialDecryptionError extends Data.TaggedError(
  "CredentialDecryptionError",
)<{
  readonly code: "DECRYPTION_FAILED";
  readonly message: string;
}> {}

export interface CredentialCipherService {
  readonly encrypt: (
    input: EncryptCredentialsInput,
  ) => Effect.Effect<CredentialEnvelope, CredentialEncryptionError>;
  readonly decrypt: (
    input: DecryptCredentialsInput,
  ) => Effect.Effect<Redacted.Redacted<string>, CredentialDecryptionError>;
}
