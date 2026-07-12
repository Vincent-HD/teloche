# IRON TV PRO Report

Date: 2026-07-12

## Inventory

- APK: `apks/irontv48.apk`
- Size: `81494819` bytes
- SHA-256: `4300e2cd1f7879c36562c2a7d966cc85030e9d7d10367d6595f60637cb3524d8`
- Package: `com.mbm_soft.irontvpro`
- Label: `IRON TV PRO`
- Version: `42` / `5.4`
- SDK: min `21`, target `32`
- Manifest enables cleartext traffic.
- Android TV / Leanback launcher is present.

## Classification

IRON TV PRO is a near-clone of IRON TV MAX with different package name, label,
and version. Its API behavior is the same Xtream-style MBM Soft client pattern.

No France-specific channel API was found.

## Native Bootstrap

`SplashScreen` loads `native-lib` and calls `getValueString()` during startup.
The native library reveals:

```text
Java_com_mbm_1soft_irontvpro_activities_SplashScreen_getValueString
com.mbm_soft.irontvpro
http://apk2021.xyz/api/host.php
```

Repro command:

```sh
nix shell nixpkgs#binutils -c strings -a out/apktool/irontv48/lib/arm64-v8a/libnative-lib.so
```

Bootstrap request:

```http
GET http://apk2021.xyz/api/host.php
```

Expected JSON shape:

```json
{
  "su": "{xtream_base_url}",
  "ac": "{active_code_endpoint}"
}
```

Parser behavior:

- `su` is saved as `XC_HOST` with a trailing `/`.
- `ac` is saved as `ACTIVE_CODE_HOST`.

Live probe on 2026-07-12:

```text
curl: (6) Could not resolve host: apk2021.xyz
```

Key references:

- `out/jadx/irontv48/sources/com/mbm_soft/irontvpro/activities/SplashScreen.java`
- `out/apktool/irontv48/smali/com/mbm_soft/irontvpro/activities/SplashScreen.smali`
- `out/jadx/irontv48/sources/defpackage/e.java`

## Auth

IRON TV PRO supports active-code and direct account login.

Active-code request:

```http
POST {ACTIVE_CODE_HOST}
Content-Type: application/x-www-form-urlencoded

request=login&activeCode={activation_code}&mac={device_mac}
```

The activation response expects `success == 1`, then reads
`client[0].username` and `client[0].password`.

Direct Xtream login:

```http
GET {XC_HOST}/player_api.php?username={username}&password={password}
```

Device MAC behavior:

- Reads stored `mac_address` first.
- Tries interface MACs.
- On Android 11+, can generate and persist a random MAC-like value.

## Xtream Endpoints

Retrofit interface:

- `out/jadx/irontv48/sources/defpackage/m7.java`

Query helper:

- `out/jadx/irontv48/sources/defpackage/bh0.java`

Observed calls:

```http
GET {XC_HOST}/player_api.php?username={username}&password={password}
GET {XC_HOST}/player_api.php?username={username}&password={password}&action=get_live_streams
GET {XC_HOST}/player_api.php?username={username}&password={password}&action=get_live_categories
GET {XC_HOST}/player_api.php?username={username}&password={password}&action=get_vod_streams
GET {XC_HOST}/player_api.php?username={username}&password={password}&action=get_vod_categories
GET {XC_HOST}/player_api.php?username={username}&password={password}&action=get_series
GET {XC_HOST}/player_api.php?username={username}&password={password}&action=get_series_categories
GET {XC_HOST}/player_api.php?username={username}&password={password}&action=get_vod_info&vod_id={vod_id}
GET {XC_HOST}/player_api.php?username={username}&password={password}&action=get_series_info&series_id={series_id}
GET {XC_HOST}/player_api.php?username={username}&password={password}&action=get_simple_data_table&stream_id={stream_id}
GET {XC_HOST}/xmltv.php?username={username}&password={password}
GET {XC_HOST}/streaming/timeshift.php?username={username}&password={password}&stream={stream_id}&start={yyyy-MM-dd:kk-mm}&duration={minutes}
```

Initial sync pulls live streams/categories, VOD streams/categories, and
series/categories.

## Playback

Helper:

```text
{XC_HOST}{type}/{username}/{password}/{file}
```

Observed playback:

```text
Live:
{XC_HOST}/live/{username}/{password}/{stream_id}.ts

VOD:
direct_source when present, otherwise
{XC_HOST}/movie/{username}/{password}/{stream_id}.{container_extension}

Series:
{XC_HOST}/series/{username}/{password}/{episode_id}.{container_extension}

Catchup:
{XC_HOST}/streaming/timeshift.php?username={username}&password={password}&stream={stream_id}&start={yyyy-MM-dd:kk-mm}&duration={minutes}
```

ExoPlayer and VLC playback paths are both present.

## Not Found

- No app-level M3U import/login mode.
- No app-specific TLS certificate pinner or custom trust manager for the mapped
  API.
- No app-specific DRM license endpoint.
- No separate playback resolver API for Xtream streams.

## Difference From IRON TV MAX

The meaningful differences found so far are branding and package identity:

- `com.mbm_soft.irontvpro` instead of `com.mbm_soft.irontvmax`.
- `IRON TV PRO` instead of `IRON TV MAX`.
- Version `42` / `5.4` instead of `43` / `5.5`.
- Native symbols use `irontvpro` instead of `irontvmax`.

API behavior is otherwise the same in this static pass.
