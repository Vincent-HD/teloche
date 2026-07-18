# Backend API

The backend owns IPTV provider configuration, synchronization, and catalog
access. The TV application speaks this API rather than the Xtream API directly.
Xtream is currently one adapter behind the boundary, not a client contract.

## Ownership

```text
user -> household membership -> household -> source -> source catalog
```

- A user is an application identity.
- A household owns sources and lets members share their synchronized catalog.
- A source is one provider subscription: adapter, endpoint, and encrypted
  credentials.
- Collections, source items, stream capabilities, and sync runs belong to the
  source because subscriptions on the same provider can expose different
  entitlements.
- A future canonical catalog item can relate several source items without
  changing provider ownership.

The initial registration endpoint creates a user and an owner household. The
current `x-teloche-user-id` request header is a trusted-development identity
adapter, not production authentication. It exists so tenancy rules are real
now while TV pairing and session authentication are designed separately.

## Credentials

Provider credentials are serialized only inside the provider adapter and stored
in `source_credentials` as AES-256-GCM ciphertext. D1 never receives plaintext
credentials, raw provider payloads, or constructed playback URLs.

`TELOCHE_CREDENTIAL_MASTER_KEY` is a base64-encoded 32-byte secret. Set a unique
value for each environment. The committed `.dev.vars.example` is only a shape
example; create an ignored `.dev.vars` locally with a real key, for example:

```sh
node -e 'console.log(require("node:crypto").randomBytes(32).toString("base64"))'
```

Alchemy binds the same value as a Cloudflare Worker secret. Credential envelopes
carry a key ID (`v1`) and authenticated source/adapter metadata so key rotation
can be added without changing the stored source model.

## API Surface

The live API documentation is available at `/docs`; the generated OpenAPI JSON
is at `/openapi.json`.

```text
POST /v1/users
GET  /v1/households

POST /v1/households/:householdId/sources
GET  /v1/households/:householdId/sources
GET  /v1/sources/:sourceId
POST /v1/sources/:sourceId/validate
POST /v1/sources/:sourceId/sync
GET  /v1/sources/:sourceId/sync-runs

GET  /v1/sources/:sourceId/collections
GET  /v1/sources/:sourceId/channels
GET  /v1/sources/:sourceId/channels/:channelId
POST /v1/sources/:sourceId/channels/:channelId/playback
```

Catalog endpoints page channels and return provider-neutral IDs. Playback is
resolved on demand and returns a generic descriptor (`url`, `format`, and
headers). With direct playback, the client necessarily receives a URL containing
provider credentials for Xtream. This is an explicit trade-off: it keeps the
backend out of the media path, but a future proxy mode is needed when the client
must never receive those credentials.

## Deferred Work

- Real authentication, TV pairing, sessions, and device registration.
- Household invitations, profile preferences, favorites, and history.
- Scheduled synchronization and backoff policy.
- EPG synchronization and retention.
- VOD, series, seasons, episodes, metadata matching, and a true canonical-item
  merge strategy.
- Proxy playback, DRM-aware descriptors, and short-lived provider tokens where
  the upstream protocol supports them.
