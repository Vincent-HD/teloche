# Agent Notes

## Project Goal

This repository is for investigating an IPTV Android APK that the user will provide.
The discovery phase focuses on understanding how the APK obtains:

- API endpoints and request formats.
- Authentication, tokens, headers, device identifiers, and session setup.
- France TV channel lists, categories, logos, metadata, and EPG data.
- Video stream URLs, manifests, DRM hints, CDN hosts, and playback parameters.

For now, the APK is only a reference target. Do not build the replacement
application until the discovery notes are solid enough to describe the observed
API behavior.

## Ground Rules

- Work only from APKs, files, and traffic captures provided in this workspace.
- Prefer read-only analysis first: unpack, decompile, search, and document.
- Do not modify or repack the APK unless the user explicitly asks.
- Keep findings reproducible. Record commands, paths, hashes, and tool versions
  when they matter.
- Treat secrets, tokens, and account-specific data carefully. Do not commit real
  credentials into source files.
- Separate confirmed facts from guesses. Mark uncertain behavior as hypothesis.

## Discovery Workflow

1. Inventory the APK.
   - Record filename, size, SHA-256, package name, version, permissions, and
     Android manifest metadata.
   - Check whether it is a normal APK, split APK set, XAPK/APKS bundle, or packed
     archive.

2. Static analysis.
   - Use `apktool` to decode resources and the manifest.
   - Use `jadx` / `jadx-gui` to inspect Java/Kotlin code.
   - Search decompiled code and resources with `rg` for URLs, hostnames, API
     paths, headers, player configuration, DRM terms, and channel metadata.
   - Inspect native libraries, assets, certificates, protobuf/schema files, JSON,
     XML, SQLite databases, and bundled config.

3. Endpoint mapping.
   - Build a notes file with observed endpoints, request methods, parameters,
     headers, response shapes, and where each was found in the APK.
   - Identify the call chain from app startup to channel list to playback URL.
   - Note whether streams are direct HLS/DASH URLs or require a resolver API.

4. Dynamic analysis, if needed.
   - Run the app only in an isolated emulator/device controlled by the user.
   - Use proxy tooling such as `mitmproxy` or `HTTP Toolkit` only when lawful and
     authorized.
   - If TLS pinning exists, document it first before considering bypass research.

5. Replacement app planning.
   - After discovery, design our own cleaner client around confirmed API calls.
   - Keep this later app separate from raw reverse-engineering output.

## Nix Tooling

This machine has Nix available. Prefer temporary, reproducible tool environments
instead of installing tools globally.

Useful patterns:

```sh
nix shell nixpkgs#apktool nixpkgs#jadx nixpkgs#android-tools nixpkgs#ripgrep
nix shell nixpkgs#mitmproxy nixpkgs#jq nixpkgs#sqlite
```

Run one-off tools with `nix run` when the package exposes the expected command:

```sh
nix run nixpkgs#apktool -- d app.apk -o out/apktool
nix run nixpkgs#jadx -- -d out/jadx app.apk
```

## Comma Tool

`comma` is installed, along with the short alias `,`. It runs programs from
nixpkgs without permanently installing them. This is useful during exploration
when a tool is needed once or when we do not yet know which package should be in
a project shell.

Examples:

```sh
, apktool d app.apk -o out/apktool
, jadx -d out/jadx app.apk
, aapt dump badging app.apk
, jq . file.json
```

Helpful `comma` options:

- `, -p <command>` prints the nix package that provides a command.
- `, -x <command>` prints the resolved executable path in the Nix store.
- `, -s <command>` opens a shell containing the package for that command.
- `, man <command>` opens the manpage when available.

## Likely Tools

- `apktool`: decode resources and manifest.
- `jadx` / `jadx-gui`: decompile Dalvik bytecode into readable Java/Kotlin.
- `aapt` / `apkanalyzer`: inspect APK metadata.
- `android-tools`: `adb`, `logcat`, install/run on emulator or device.
- `ripgrep`: fast search through decoded code and resources.
- `jq`, `yq`, `xmllint`: inspect structured config.
- `sqlite`: inspect bundled databases.
- `strings`, `file`, `binutils`, `radare2` or `ghidra`: inspect native blobs if
  the APK uses native code.
- `mitmproxy`: inspect HTTP(S) traffic during authorized dynamic testing.

## Expected Repository Layout

Use this layout once files arrive:

```text
apk/                 # user-provided APKs or bundles; avoid committing if large/private
out/                 # generated decode/decompile output; usually ignored
notes/               # human-written findings and endpoint maps
scripts/             # repeatable helper scripts
src/                 # later replacement app, after discovery
```

## First Commands When APK Arrives

```sh
mkdir -p apk out notes
sha256sum apk/*.apk
, aapt dump badging apk/*.apk
, apktool d apk/app.apk -o out/apktool
, jadx -d out/jadx apk/app.apk
rg -n "https?://|m3u8|mpd|token|Authorization|channel|chaine|epg|drm|widevine" out
```
