import type { WorkerEnv } from "../alchemy.run.ts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as EffectCrypto from "effect/Crypto";
import * as Layer from "effect/Layer";
import * as PlatformError from "effect/PlatformError";
import * as Redacted from "effect/Redacted";
import {
  FetchHttpClient,
  HttpClient,
  HttpRouter,
} from "effect/unstable/http";
import {
  CatalogRepository,
  makeCatalogRepository,
} from "./catalog/repository.ts";
import { CredentialCipher, makeCredentialCipher } from "./credentials/cipher.ts";
import { CredentialStore, makeCredentialStore } from "./credentials/store.ts";
import { CredentialVault, CredentialVaultLive } from "./credentials/vault.ts";
import { makeDatabaseConnection } from "./db/client.ts";
import { DatabaseClient } from "./db/service.ts";
import { ProviderAdapterRegistry, makeProviderAdapterRegistry } from "./providers/registry.ts";
import { XtreamAdapter } from "./adapters/xtream/adapter.ts";
import { BackendHttpApiLayer } from "./routes.ts";
import { makeSourceRepository, SourceRepository } from "./sources/repository.ts";
import { makeSources, Sources } from "./sources/service.ts";
import { makeTenancyRepository, TenancyRepository } from "./tenancy/repository.ts";
import { Tenancy, TenancyLive } from "./tenancy/service.ts";

const ApiLayer = BackendHttpApiLayer;

const { handler } = HttpRouter.toWebHandler(ApiLayer, {
  disableLogger: true,
});

const makeRuntimeCrypto = () => EffectCrypto.make({
  randomBytes: (size) => crypto.getRandomValues(new Uint8Array(size)),
  digest: (algorithm, data) => {
    const bytes = new Uint8Array(Array.from(data));
    return Effect.tryPromise({
      try: () => crypto.subtle.digest(algorithm, bytes),
      catch: (cause) => PlatformError.systemError({
        _tag: "Unknown",
        module: "Crypto",
        method: "digest",
        cause,
      }),
    }).pipe(Effect.map((digest) => new Uint8Array(digest)));
  },
});

const asRedacted = (value: string | Redacted.Redacted<string>) =>
  Redacted.isRedacted(value) ? value : Redacted.make(value);

export default {
  fetch: async (request, env) => {
    const database = makeDatabaseConnection(env.DB);
    const runtimeCrypto = makeRuntimeCrypto();
    const tenancyRepository = makeTenancyRepository(database);
    const sourceRepository = makeSourceRepository(database);
    const catalogRepository = makeCatalogRepository(database);
    const credentialStore = makeCredentialStore(database);

    try {
      const credentialCipher = await Effect.runPromise(makeCredentialCipher({
        masterKey: asRedacted(env.TELOCHE_CREDENTIAL_MASTER_KEY),
        keyId: "v1",
      }));
      const credentialVault = await Effect.runPromise(CredentialVaultLive.pipe(
        Effect.provideService(CredentialCipher, credentialCipher),
        Effect.provideService(CredentialStore, credentialStore),
      ));
      const tenancy = await Effect.runPromise(TenancyLive.pipe(
        Effect.provideService(TenancyRepository, tenancyRepository),
        Effect.provideService(EffectCrypto.Crypto, runtimeCrypto),
      ));
      const httpClient = await Effect.runPromise(Effect.scoped(
        Layer.build(FetchHttpClient.layer).pipe(
          Effect.map((context) => Context.get(context, HttpClient.HttpClient)),
        ),
      ));

      const services = Context.make(DatabaseClient, database).pipe(
        Context.add(CatalogRepository, catalogRepository),
        Context.add(CredentialStore, credentialStore),
        Context.add(CredentialCipher, credentialCipher),
        Context.add(CredentialVault, credentialVault),
        Context.add(EffectCrypto.Crypto, runtimeCrypto),
        Context.add(HttpClient.HttpClient, httpClient),
        Context.add(TenancyRepository, tenancyRepository),
        Context.add(Tenancy, tenancy),
        Context.add(SourceRepository, sourceRepository),
        Context.add(
          ProviderAdapterRegistry,
          makeProviderAdapterRegistry([XtreamAdapter]),
        ),
        Context.add(Sources, makeSources({
          sources: sourceRepository,
          catalog: catalogRepository,
        })),
      );

      return handler(request, services);
    } catch {
      return Response.json(
        { message: "Backend credential encryption is not configured" },
        { status: 500 },
      );
    }
  },
} satisfies ExportedHandler<WorkerEnv>;
