import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import {
  CredentialCipher,
  CredentialCipherLive,
  WebCrypto,
} from "./cipher.ts";
import type { CredentialEnvelope } from "./model.ts";

const keyId = "test-key-1";
const firstMasterKey = Redacted.make(
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
);
const secondMasterKey = Redacted.make(
  "ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8=",
);
const binding = {
  sourceId: "source-1",
  adapterKey: "fixture",
} as const;

const layer = (masterKey = firstMasterKey) =>
  CredentialCipherLive({ keyId, masterKey });

const alterBase64 = (value: string): string =>
  `${value[0] === "A" ? "B" : "A"}${value.slice(1)}`;

describe("CredentialCipher", () => {
  it.effect("roundtrips redacted credentials", () =>
    Effect.gen(function* () {
      const cipher = yield* CredentialCipher;
      const plaintext = Redacted.make(JSON.stringify({
        username: "viewer",
        password: "correct horse battery staple",
      }));

      const envelope = yield* cipher.encrypt({ ...binding, plaintext });
      const decrypted = yield* cipher.decrypt({ ...binding, envelope });

      assert.strictEqual(envelope.formatVersion, 1);
      assert.strictEqual(envelope.algorithm, "AES-256-GCM");
      assert.strictEqual(envelope.keyId, keyId);
      assert.strictEqual(Redacted.value(decrypted), Redacted.value(plaintext));
      assert.strictEqual(String(decrypted), "<redacted>");
    }).pipe(Effect.provide(layer())),
  );

  it.effect("uses a fresh IV and ciphertext for every encryption", () =>
    Effect.gen(function* () {
      const cipher = yield* CredentialCipher;
      const plaintext = Redacted.make("same credentials");

      const first = yield* cipher.encrypt({ ...binding, plaintext });
      const second = yield* cipher.encrypt({ ...binding, plaintext });

      assert.notStrictEqual(
        first.initializationVector,
        second.initializationVector,
      );
      assert.notStrictEqual(first.ciphertext, second.ciphertext);
    }).pipe(Effect.provide(layer())),
  );

  it.effect("rejects tampering with authenticated metadata", () =>
    Effect.gen(function* () {
      const cipher = yield* CredentialCipher;
      const envelope = yield* cipher.encrypt({
        ...binding,
        plaintext: Redacted.make("bound credentials"),
      });

      const attempts = [
        cipher.decrypt({
          ...binding,
          sourceId: "source-2",
          envelope,
        }),
        cipher.decrypt({
          ...binding,
          adapterKey: "other-adapter",
          envelope,
        }),
        cipher.decrypt({
          ...binding,
          envelope: {
            ...envelope,
            formatVersion: 2,
          } as unknown as CredentialEnvelope,
        }),
        cipher.decrypt({
          ...binding,
          envelope: {
            ...envelope,
            algorithm: "AES-128-GCM",
          } as unknown as CredentialEnvelope,
        }),
        cipher.decrypt({
          ...binding,
          envelope: { ...envelope, keyId: "other-key" },
        }),
      ];

      const exits = yield* Effect.all(attempts.map(Effect.exit));
      assert.ok(exits.every(Exit.isFailure));
    }).pipe(Effect.provide(layer())),
  );

  it.effect("rejects ciphertext tampering", () =>
    Effect.gen(function* () {
      const cipher = yield* CredentialCipher;
      const envelope = yield* cipher.encrypt({
        ...binding,
        plaintext: Redacted.make("untampered credentials"),
      });
      const exit = yield* cipher.decrypt({
        ...binding,
        envelope: {
          ...envelope,
          ciphertext: alterBase64(envelope.ciphertext),
        },
      }).pipe(Effect.exit);

      assert.ok(Exit.isFailure(exit));
    }).pipe(Effect.provide(layer())),
  );

  it.effect("rejects a different master key", () =>
    Effect.gen(function* () {
      const encryptor = yield* CredentialCipher;
      const envelope = yield* encryptor.encrypt({
        ...binding,
        plaintext: Redacted.make("key-bound credentials"),
      });

      const exit = yield* Effect.gen(function* () {
        const decryptor = yield* CredentialCipher;
        return yield* decryptor.decrypt({ ...binding, envelope });
      }).pipe(Effect.provide(layer(secondMasterKey)), Effect.exit);

      assert.ok(Exit.isFailure(exit));
    }).pipe(Effect.provide(layer())),
  );

  it.effect("does not expose plaintext through encryption errors", () => {
    const plaintext = "plaintext-must-not-appear";
    const rejectingCrypto = {
      ...globalThis.crypto,
      subtle: {
        ...globalThis.crypto.subtle,
        importKey: globalThis.crypto.subtle.importKey.bind(
          globalThis.crypto.subtle,
        ),
        encrypt: () => Promise.reject(new Error(plaintext)),
      },
      getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
    } as Crypto;
    const rejectingLayer = layer().pipe(
      Layer.provide(Layer.succeed(WebCrypto, rejectingCrypto)),
    );

    return Effect.gen(function* () {
      const cipher = yield* CredentialCipher;
      const error = yield* cipher.encrypt({
        ...binding,
        plaintext: Redacted.make(plaintext),
      }).pipe(Effect.flip);

      assert.strictEqual(error._tag, "CredentialEncryptionError");
      assert.ok(!String(error).includes(plaintext));
      assert.ok(!JSON.stringify(error).includes(plaintext));
    }).pipe(Effect.provide(rejectingLayer));
  });
});
