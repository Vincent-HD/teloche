# Common IPTV API Report

Date: 2026-07-12

## Scope

This report compares the four APKs currently in `apks/`:

| APK | Package | App label | Version | SHA-256 |
| --- | --- | --- | --- | --- |
| `noxpro.apk` | `com.noxiptv.noxiptviptviptv1iptvbox` | `NOX PRO` | `118` / `3.0.9.9` | `a8b4635528bdcf82c25e892bbaf38414b816f042e295db1ed49520f6aec2b608` |
| `ironmax.apk` | `com.mbm_soft.irontvmax` | `IRON TV MAX` | `43` / `5.5` | `1d18af73133813fa7088f23434b2416fd758811c13cde2d61d86ae869718415a` |
| `irontv48.apk` | `com.mbm_soft.irontvpro` | `IRON TV PRO` | `42` / `5.4` | `4300e2cd1f7879c36562c2a7d966cc85030e9d7d10367d6595f60637cb3524d8` |
| `mytv.apk` | `tv.formuler.mol3.real` | `MYTVOnline3` | `120133` / `12.1.33-5002-c58fe71f8` | `bd9bb80f311d21e6a37a0c7809cf8c742f949f7396bac5307b21cd2033f74d8e` |

For public internet sources that support or contextualize these findings, see
`notes/public-protocol-research.md`. For the central link/resource index, see
`notes/references.md`.

## Main Conclusion

The common protocol is Xtream Codes / Xtream IPTV.

NOX PRO, IRON TV MAX, IRON TV PRO, and MyTVOnline3's XTC mode all use the same
basic API shape:

- `player_api.php` for login, live channels, VOD, series, categories, and simple
  EPG data.
- `xmltv.php` for XMLTV EPG export.
- Direct playback URL construction under `/live/`, `/movie/`, `/series/`, and
  `/timeshift/`.

No APK revealed a public France-channel-specific API. The France channel list is
not bundled in the apps; it is expected to come from a panel account response,
a user-provided M3U playlist, or a Stalker/MAG portal configured by the user.

## Shared Xtream Request Map

All credentials below are placeholders. Real usernames/passwords should never be
committed to this repository.

```http
GET {base}/player_api.php?username={username}&password={password}
GET {base}/player_api.php?username={username}&password={password}&action=get_live_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_live_streams
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_streams
GET {base}/player_api.php?username={username}&password={password}&action=get_series_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_series
GET {base}/player_api.php?username={username}&password={password}&action=get_simple_data_table&stream_id={stream_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_short_epg&stream_id={stream_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_info&vod_id={vod_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_series_info&series_id={series_id}
GET {base}/xmltv.php?username={username}&password={password}
```

Observed app references:

- NOX PRO: `out/jadx/noxpro/sources/f/g/a/i/q/a.java`
- IRON TV MAX: `out/jadx/ironmax/sources/defpackage/n7.java`
- IRON TV PRO: `out/jadx/irontv48/sources/defpackage/m7.java`
- MyTVOnline3 XTC: `out/jadx/mytv/sources/tv/formuler/molprovider/module/server/api/XtcRetrofit.java`

## Shared Login Response Shape

The Xtream login call returns a top-level object with:

- `user_info`: account credentials/status/expiry/limits/output formats.
- `server_info`: server URL, protocol, ports, timezone.

Typical fields observed across apps:

```text
user_info.username
user_info.password
user_info.auth
user_info.status
user_info.exp_date
user_info.is_trial
user_info.active_cons
user_info.max_connections
user_info.allowed_output_formats
server_info.url
server_info.port
server_info.https_port
server_info.rtmp_port
server_info.server_protocol
server_info.timezone
```

## Shared Content Models

Live channels commonly use:

```text
num
name
stream_type
stream_id
stream_icon
epg_channel_id
category_id
tv_archive
tv_archive_duration
direct_source
```

Categories commonly use:

```text
category_id
category_name
parent_id
```

VOD and series entries use Xtream-style stream ids, names, icons/covers, ratings,
container extensions, and nested episode detail for series.

## Shared Playback Construction

The apps generally do not call a separate resolver API for Xtream playback.
They build media URLs locally from the chosen panel base URL plus credentials and
ids.

```text
Live:
{base}/live/{username}/{password}/{stream_id}.ts
{base}/live/{username}/{password}/{stream_id}.m3u8

Movie:
{base}/movie/{username}/{password}/{stream_id}.{container_extension}

Series:
{base}/series/{username}/{password}/{episode_id}.{container_extension}

Timeshift:
{base}/timeshift/{username}/{password}/{duration}/{start}/{stream_id}.ts
```

IRON uses an alternate catchup endpoint:

```http
GET {base}/streaming/timeshift.php?username={username}&password={password}&stream={stream_id}&start={yyyy-MM-dd:kk-mm}&duration={minutes}
```

## Bootstrap Differences

| App | Bootstrap source | Live status on 2026-07-12 |
| --- | --- | --- |
| NOX PRO | `GET http://nox.xtream.fr/Android/host2.php` | Returned panel candidates in `su`. |
| IRON TV MAX | Native `libnative-lib.so` returns `http://apk2021.xyz/api/host.php` | DNS did not resolve. Static evidence only. |
| IRON TV PRO | Native `libnative-lib.so` returns `http://apk2021.xyz/api/host.php` | DNS did not resolve. Static evidence only. |
| MyTVOnline3 | User-provided portal/Xtream/playlist config | No fixed France-specific bootstrap found. |

NOX PRO also has a VPN config endpoint:

```http
GET http://nox.xtream.fr/Android/server.php
```

IRON apps parse bootstrap JSON fields:

```json
{
  "su": "{xtream_base_url}",
  "ac": "{active_code_endpoint}"
}
```

`su` becomes `XC_HOST`, and `ac` becomes `ACTIVE_CODE_HOST`.

## Activation-Code Flows

NOX PRO:

```http
GET http://api.xtream.fr/protocol/receiver/receiver.php?request=login&activeCode={activation_code}&mac={mac}
```

IRON TV MAX / PRO:

```http
POST {ACTIVE_CODE_HOST}
Content-Type: application/x-www-form-urlencoded

request=login&activeCode={activation_code}&mac={device_mac}
```

Both activation flows eventually yield an Xtream username/password pair, then the
apps continue through normal `player_api.php` calls.

## M3U And Stalker

NOX PRO has a separate M3U mode.

MyTVOnline3 supports:

- Xtream/XTC.
- Stalker/MAG portal.
- Playlist/M3U with optional XMLTV EPG URLs.
- Generic portal mode.

IRON TV MAX and IRON TV PRO did not show an app-level M3U import/login path.
Their `m3u`/`m3u8` hits are player/library handling rather than account setup.

## Pinning, DRM, And Native Code

No app-specific TLS certificate pinning was confirmed for the Xtream flows.
Cleartext HTTP is explicitly allowed in NOX and IRON manifests. MyTV has a
network security config, but the mapped XTC requests are normal OkHttp/Retrofit
requests with a configurable `User-Agent`.

DRM/Widevine terms appear mostly from bundled player libraries. No app-specific
Widevine license endpoint was found in these passes.

The important native findings are:

- IRON TV MAX / PRO: native bootstrap URL is embedded in `libnative-lib.so`.
- MyTVOnline3: Stalker/MAG connection metadata and token/cookie details are
  exposed through `com.siptv.jni.SiptvJni`.

## What Is Enough For A Replacement Client

We have enough static information to implement a first replacement client for
Xtream-style panels if the user supplies a valid panel/account pair or an M3U
URL. The APKs themselves do not contain usable panel credentials.

Minimum client scope:

- Normalize a user-provided Xtream base URL.
- Login with `player_api.php`.
- Fetch live categories and streams.
- Fetch `xmltv.php` or simple EPG data.
- Build playback URLs locally.
- Support M3U import as a separate path.

Open gaps:

- A currently live IRON bootstrap response, because `apk2021.xyz` did not
  resolve during the probe.
- Confirmation of stream extensions against real `allowed_output_formats`.
- Dynamic traffic capture for any runtime-only headers, if the user later runs
  one of the APKs in an authorized emulator/device.
