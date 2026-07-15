# Teloche

Monorepo for the Teloche Android TV client and backend.

## Stack

- Package manager / script runner: Nub
- App: Expo TV template with `react-native-tvos`
- Backend: Node.js 24 native TypeScript, no build step
- Backend test runner: Vitest
- Backend effect system: Effect v4 beta, codename "smol"
- Dev environment: Nix flakes + direnv

## Workspaces

```text
apps/tv        Expo React Native TV app
apps/backend   Node.js API backend
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
nub run test
nub run versions
```
