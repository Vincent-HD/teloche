# Teloche

Monorepo for the Teloche Android TV client and backend.

## Stack

- Package manager / script runner: Nub
- App: Expo TV template with `react-native-tvos`
- Backend: Effect 4 on Cloudflare Workers with D1; Wrangler handles TypeScript
  locally and Alchemy handles deployment, with no separate build script
- Backend test runner: Vitest
- Backend effect system: Effect v4 beta, codename "smol"
- Dev environment: Nix flakes + direnv

## Workspaces

```text
apps/tv        Expo React Native TV app
apps/backend   Effect API on Cloudflare Workers
```

## Setup

```sh
direnv allow
nub install --ignore-scripts
```

`--ignore-scripts` avoids optional native install scripts during the initial
bootstrap. Revisit build-script approvals when we add dependencies that require
native postinstall work.

## Commands

```sh
nub run dev:tv
nub run android:tv
nub run prebuild:tv
nub run dev:backend
nub run dev:xtream-docs
nub run db:migrate:local
nub run test
nub run versions
```

`dev:backend` applies pending migrations to Wrangler's isolated local D1 and
starts the same Cloudflare Worker entry point that Alchemy deploys. Xtream API
documentation remains available separately through `dev:xtream-docs`.

The provider-neutral catalog schema and synchronization lifecycle are described
in [`docs/catalog-sync.md`](docs/catalog-sync.md).
