# IRON TV MAX Report

Date: 2026-07-12

## Inventory

- APK: `apks/ironmax.apk`
- Size: `81997912` bytes
- SHA-256: `1d18af73133813fa7088f23434b2416fd758811c13cde2d61d86ae869718415a`
- Package: `com.mbm_soft.irontvmax`
- Label: `IRON TV MAX`
- Version: `43` / `5.5`
- SDK: min `21`, target `32`
- Manifest enables cleartext traffic.
- Android TV / Leanback launcher is present.

## Classification

IRON TV MAX is a branded MBM Soft Android TV IPTV client. It is not the same
codebase as NOX PRO, but it still uses standard Xtream API calls and local
playback URL construction.

No France-specific channel API was found. Channels are expected from the Xtream
panel configured by bootstrap/login.

## Native Bootstrap

`SplashScreen` loads `native-lib` and calls `getValueString()` during startup.
The native library reveals:

```text
Java_com_mbm_1soft_irontvmax_activities_SplashScreen_getValueString
com.mbm_soft.irontvmax
http://apk2021.xyz/api/host.php
```

Repro command:

```sh
nix shell nixpkgs#binutils -c strings -a out/apktool/ironmax/lib/arm64-v8a/libnative-lib.so
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

- `out/jadx/ironmax/sources/com/mbm_soft/irontvmax/activities/SplashScreen.java`
- `out/apktool/ironmax/smali/com/mbm_soft/irontvmax/activities/SplashScreen.smali`
- `out/jadx/ironmax/sources/defpackage/e.java`

## Auth

IRON TV MAX supports active-code and direct account login.

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

The app expects `user_info.auth == "1"` and active account status, then persists
account status, username, password, message, timezone, dates, and trial flag.

Device MAC behavior:

- Reads stored `mac_address` first.
- Tries `wlan0`, then `eth0`.
- On Android 11+, can generate and persist a random MAC-like value.

## Xtream Endpoints

Retrofit interface:

- `out/jadx/ironmax/sources/defpackage/n7.java`

Query helper:

- `out/jadx/ironmax/sources/defpackage/ah0.java`

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

## Difference From NOX PRO

- NOX has fixed NOX bootstrap endpoints under `nox.xtream.fr`.
- IRON TV MAX hides bootstrap in native code and expects `su`/`ac`.
- NOX has a separate M3U mode; IRON TV MAX did not show one.
- NOX has a VPN config endpoint; no equivalent was found here.
