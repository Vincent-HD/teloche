import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import {
  CredentialCipherConfigurationError,
  CredentialDecryptionError,
  CredentialEncryptionError,
  CredentialEnvelopeAlgorithm,
  CredentialEnvelopeFormatVersion,
  type CredentialBinding,
  type CredentialCipherService,
  type CredentialEnvelope,
} from "./model.ts";

const masterKeyByteLength = 32;
const initializationVectorByteLength = 12;
const authenticationTagByteLength = 16;
const base64Pattern =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export interface CredentialCipherConfig {
  readonly masterKey: Redacted.Redacted<string>;
  readonly keyId: string;
}

export const WebCrypto = Context.Reference<Crypto>(
  "teloche/credentials/WebCrypto",
  { defaultValue: () => globalThis.crypto },
);

export class CredentialCipher extends Context.Service<
  CredentialCipher,
  CredentialCipherService
>()("teloche/CredentialCipher") {}

const configurationError = () =>
  new CredentialCipherConfigurationError({
    code: "INVALID_CONFIGURATION",
    message: "Credential cipher configuration is invalid",
  });

const encryptionError = () =>
  new CredentialEncryptionError({
    code: "ENCRYPTION_FAILED",
    message: "Source credentials could not be encrypted",
  });

const decryptionError = () =>
  new CredentialDecryptionError({
    code: "DECRYPTION_FAILED",
    message: "Source credentials could not be decrypted",
  });

const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
};

const decodeBase64 = (encoded: string): Uint8Array<ArrayBuffer> => {
  if (
    encoded.length === 0 ||
    encoded.length % 4 !== 0 ||
    !base64Pattern.test(encoded)
  ) {
    throw new TypeError("Invalid base64");
  }

  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const additionalData = (
  binding: CredentialBinding,
  envelope: Pick<CredentialEnvelope, "formatVersion" | "algorithm" | "keyId">,
): Uint8Array<ArrayBuffer> =>
  textEncoder.encode(JSON.stringify({
    sourceId: binding.sourceId,
    adapterKey: binding.adapterKey,
    version: envelope.formatVersion,
    algorithm: envelope.algorithm,
    keyId: envelope.keyId,
  }));

export const makeCredentialCipher = Effect.fn("CredentialCipher.make")(
  function* (config: CredentialCipherConfig) {
    const webCrypto = yield* WebCrypto;
    const keyBytes = yield* Effect.try({
      try: () => decodeBase64(Redacted.value(config.masterKey)),
      catch: configurationError,
    });

    if (
      config.keyId.length === 0 ||
      keyBytes.length !== masterKeyByteLength ||
      webCrypto === undefined ||
      webCrypto.subtle === undefined
    ) {
      keyBytes.fill(0);
      return yield* Effect.fail(configurationError());
    }

    const key = yield* Effect.tryPromise({
      try: () => webCrypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
      ),
      catch: configurationError,
    }).pipe(Effect.ensuring(Effect.sync(() => keyBytes.fill(0))));

    const encrypt: CredentialCipherService["encrypt"] = Effect.fn(
      "CredentialCipher.encrypt",
    )(function* (input) {
      const envelopeMetadata = {
        formatVersion: CredentialEnvelopeFormatVersion,
        algorithm: CredentialEnvelopeAlgorithm,
        keyId: config.keyId,
      } as const;
      const plaintext = textEncoder.encode(Redacted.value(input.plaintext));

      return yield* Effect.tryPromise({
        try: async () => {
          const initializationVector = webCrypto.getRandomValues(
            new Uint8Array(initializationVectorByteLength),
          );
          const encrypted = await webCrypto.subtle.encrypt(
            {
              name: "AES-GCM",
              iv: initializationVector,
              additionalData: additionalData(input, envelopeMetadata),
              tagLength: authenticationTagByteLength * 8,
            },
            key,
            plaintext,
          );

          return {
            ...envelopeMetadata,
            initializationVector: encodeBase64(initializationVector),
            ciphertext: encodeBase64(new Uint8Array(encrypted)),
          };
        },
        catch: encryptionError,
      }).pipe(Effect.ensuring(Effect.sync(() => plaintext.fill(0))));
    });

    const decrypt: CredentialCipherService["decrypt"] = Effect.fn(
      "CredentialCipher.decrypt",
    )(function* (input) {
      const { envelope } = input;

      if (
        envelope.formatVersion !== CredentialEnvelopeFormatVersion ||
        envelope.algorithm !== CredentialEnvelopeAlgorithm ||
        envelope.keyId !== config.keyId
      ) {
        return yield* Effect.fail(decryptionError());
      }

      const decoded = yield* Effect.try({
        try: () => {
          const initializationVector = decodeBase64(
            envelope.initializationVector,
          );
          const ciphertext = decodeBase64(envelope.ciphertext);

          if (
            initializationVector.length !== initializationVectorByteLength ||
            ciphertext.length < authenticationTagByteLength
          ) {
            throw new TypeError("Invalid credential envelope");
          }

          return { initializationVector, ciphertext };
        },
        catch: decryptionError,
      });

      return yield* Effect.tryPromise({
        try: async () => {
          const decrypted = await webCrypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv: decoded.initializationVector,
              additionalData: additionalData(input, envelope),
              tagLength: authenticationTagByteLength * 8,
            },
            key,
            decoded.ciphertext,
          );
          const plaintext = new Uint8Array(decrypted);

          try {
            return Redacted.make(textDecoder.decode(plaintext));
          } finally {
            plaintext.fill(0);
          }
        },
        catch: decryptionError,
      }).pipe(Effect.ensuring(Effect.sync(() => decoded.ciphertext.fill(0))));
    });

    return CredentialCipher.of({ encrypt, decrypt });
  },
);

export const CredentialCipherLive = (config: CredentialCipherConfig) =>
  Layer.effect(CredentialCipher, makeCredentialCipher(config));

export const credentialCipherLayer = CredentialCipherLive;
