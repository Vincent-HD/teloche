# NOX PRO APK API Map

Date: 2026-07-12

## APK Inventory

- APK: `apks/noxpro.apk`
- Size: 97M
- SHA-256: `a8b4635528bdcf82c25e892bbaf38414b816f042e295db1ed49520f6aec2b608`
- Package: `com.noxiptv.noxiptviptviptv1iptvbox`
  - Found in `out/apktool/noxpro/AndroidManifest.xml:2`
- App label: `NOX PRO`
  - Found in `out/apktool/noxpro/res/values/strings.xml:163`
- App id string: `A4FEBA39`
  - Found in `out/apktool/noxpro/res/values/strings.xml:162`
- Version code/name: `118` / `3.0.9.9`
  - Found in `out/apktool/noxpro/apktool.yml:9`
- Android SDK: min `17`, target `31`
  - Found in `out/apktool/noxpro/apktool.yml:6`
- Manifest enables cleartext traffic:
  - `android:usesCleartextTraffic="true"` at `out/apktool/noxpro/AndroidManifest.xml:35`
- Android TV/Leanback launcher is present:
  - `LEANBACK_LAUNCHER` at `out/apktool/noxpro/AndroidManifest.xml:54`

## High-Level Architecture

This APK is a white-label IPTV Smarters / Xtream Codes-style Android client.

The primary IPTV path is:

1. Download bootstrap panel candidates from NOX config.
2. Store/select one panel base URL.
3. Call Xtream-style `player_api.php` with username/password.
4. Pull categories, live streams, VOD streams, series, and EPG through `player_api.php`.
5. Build playback URLs locally from `server_info`, stored username/password, stream id, type, and extension.

There is also a separate M3U playlist mode that stores `playlist` as placeholder credentials, downloads/copies a playlist, parses URLs, and stores channels in local SQLite tables.

No France-specific channel API surfaced in static analysis. The France channel list appears to come from the generic Xtream panel account data or from a user-provided M3U playlist.

## Bootstrap Config

### Panel List

Code:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/SplashActivity.java:568`
- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/LoginActivity.java:486`
- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/NewDashboardActivity.java:1180`

Request:

```http
GET http://nox.xtream.fr/Android/host2.php
```

Live probe result on 2026-07-12:

```json
{
  "status": "true",
  "su": "http://sv.nfcd.cc:8080,http://sv2.nxpv.cc:2095,http://vip.silkatv.cc:8000",
  "ip_check": false
}
```

Current unauthenticated dummy probes:

- `http://sv.nfcd.cc:8080/player_api.php?...` returned HTTP `404`.
- `http://sv2.nxpv.cc:2095/player_api.php?...` returned HTTP `404`.
- `http://vip.silkatv.cc:8000/...` did not resolve.

These probes used fake credentials only. They do not prove whether a panel works for real users.

### VPN Config

Code:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/vpn/activities/ImportVPNActivity.java:224`

Request:

```http
GET http://nox.xtream.fr/Android/server.php
```

Live probe result on 2026-07-12:

```json
{
  "status": "true",
  "su": "http://51.91.151.44/downloads/servers.zip",
  "sc": "7e5cefea513bf4c2c0194e7553b30ca3",
  "ndd": ""
}
```

## Xtream API Client

Retrofit interface:

- `out/jadx/noxpro/sources/f/g/a/i/q/a.java:37`

Base URL normalization:

- `out/jadx/noxpro/sources/f/g/a/h/i/e.java:1739`
- Reads `loginPrefsserverurl`, lowercases it, prepends `http://` if no scheme exists, and ensures a trailing slash.
- Uses OkHttp with 60 second timeouts and redirects enabled.

Login caller:

- `out/jadx/noxpro/sources/f/g/a/j/b.java:145`

Category/stream caller:

- `out/jadx/noxpro/sources/f/g/a/j/c.java:152`

Redirect handling:

- If login receives HTTP `301` or `302`, the client reads `Location`, splits it at `/player_api.php`, stores the redirected base URL, and retries.
- Code: `out/jadx/noxpro/sources/f/g/a/j/b.java:48`
- Code: `out/jadx/noxpro/sources/f/g/a/j/b.java:109`

### Requests

Use these with placeholders. Do not commit real credentials.

```http
GET {base}/player_api.php?username={username}&password={password}
GET {base}/player_api.php?username={username}&password={password}&action=get_live_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_live_streams
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_streams
GET {base}/player_api.php?username={username}&password={password}&action=get_series_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_series
GET {base}/player_api.php?username={username}&password={password}&action=get_simple_data_table&stream_id={stream_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_info&vod_id={vod_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_series_info&series_id={series_id}
GET {base}/xmltv.php?username={username}&password={password}
```

Code references:

- Login: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:74`
- Live EPG: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:48`
- Live streams: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:54`
- VOD categories: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:63`
- VOD info: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:80`
- Series list: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:90`
- VOD streams: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:93`
- Live categories: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:99`
- Series categories: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:105`
- Series info: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:115`
- XMLTV setup: `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/NewDashboardActivity.java:1981`

These Xtream calls pass credentials in query parameters. Static analysis did not find Bearer/Auth headers for this API path.

## Login Response Shape

Model:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/callback/LoginCallback.java:7`

Top-level fields:

- `user_info`
- `server_info`

`user_info` fields:

- `username`
- `password`
- `auth`
- `status`
- `exp_date`
- `is_trial`
- `active_cons`
- `created_at`
- `max_connections`
- `allowed_output_formats`

Code:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/callback/UserLoginInfoCallback.java:8`

`server_info` fields:

- `url`
- `port`
- `rtmp_port`
- `timezone`
- `https_port`
- `server_protocol`

Code:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/callback/ServerInfoCallback.java:8`

Successful login persists `username`, `password`, `serverUrl`, `serverPort`, `serverProtocol`, HTTPS/RTMP ports, timezone, and account limits.

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/LoginActivity.java:860`
- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/SplashActivity.java:856`

## Channel, VOD, Series, and EPG Fields

Live category:

- `category_id`
- `category_name`
- `parent_id`
- Code: `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/callback/LiveStreamCategoriesCallback.java:7`

VOD category:

- `category_id`
- `category_name`
- `parent_id`
- Code: `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/callback/VodCategoriesCallback.java:7`

Series category:

- `category_id`
- `category_name`
- Code: `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/callback/GetSeriesStreamCategoriesCallback.java:7`

Live stream:

- `num`
- `name`
- `stream_type`
- `stream_id`
- `stream_icon`
- `epg_channel_id`
- `added`
- `category_id`
- `custom_sid`
- `tv_archive`
- `direct_source`
- `tv_archive_duration`
- Code: `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/callback/LiveStreamsCallback.java:8`

VOD stream:

- `num`
- `name`
- `stream_type`
- `stream_id`
- `stream_icon`
- `rating`
- `rating_5based`
- `added`
- `category_id`
- `series_no`
- `container_extension`
- `custom_sid`
- `direct_source`
- Code: `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/callback/VodStreamsCallback.java:7`

Series list item:

- `num`
- `name`
- `stream_type`
- `series_id`
- `cover`
- `plot`
- `cast`
- `director`
- `genre`
- `releaseDate`
- `last_modified`
- `rating`
- `category_id`
- `youtube_trailer`
- `backdrop_path`
- Code: `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/callback/GetSeriesStreamCallback.java:8`

Simple EPG listing:

- `title`
- `start`
- `end`
- `description`
- `channel_id`
- `start_timestamp`
- `stop_timestamp`
- `has_archive`
- Code: `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/pojo/EpgListingPojo.java:8`

VOD detail `info`:

- `movie_image`
- `genre`
- `plot`
- `cast`
- `rating`
- `director`
- `releasedate`
- `tmdb_id`
- `duration_secs`
- `youtube_trailer`
- `backdrop_path`
- Code: `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/model/pojo/VodInfoPojo.java:8`

## Playback URL Construction

The app does not appear to request a separate playback resolver for normal Xtream live/VOD/series playback. It builds stream URLs locally from stored login/server info.

### Live

Code:

- `out/jadx/noxpro/sources/f/g/a/h/i/e.java:1278`

Observed format:

```text
{scheme}://{serverUrl}:{port}/{username}/{password}/{stream_id}
{scheme}://{serverUrl}:{port}/{type}/{username}/{password}/{stream_id}{extension}
```

For live, `{type}` is usually `live`, and `{extension}` is based on allowed format such as `.ts` or `.m3u8`.

Player code also constructs this prefix directly and appends `stream_id + extension` for API mode.

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/ijkplayer/activities/NSTIJKPlayerSkyTvActivity.java:3196`
- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/ijkplayer/activities/NSTIJKPlayerSkyTvActivity.java:3299`
- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/exoplayer/NSTEXOPlayerSkyActivity.java:4098`

### VOD and Series

JADX did not fully decompile this method, but smali shows the same preference reads and URL construction.

Code:

- `out/apktool/noxpro/smali/f/g/a/h/i/e.smali:611`

Observed format:

```text
{scheme}://{serverUrl}:{port}/{type}/{username}/{password}/{stream_id}.{container_extension}
```

`{type}` is expected to be `movie` or `series`.

External-player calls into this helper are visible in:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/ViewDetailsActivity.java:328`
- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/SeriesDetailActivity.java:332`

A visible series episode path is:

```text
{scheme}://{serverUrl}:{port}/series/{username}/{password}/{episode_id}.{container_extension}
```

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/adapter/EpisodeDetailAdapter.java:427`

### Timeshift / Catch-Up

Code:

- `out/jadx/noxpro/sources/f/g/a/h/i/e.java:1173`

Observed format:

```text
{scheme}://{serverUrl}:{port}/timeshift/{username}/{password}/{duration_or_type}/{start}/{stream_id}.{format}
```

Parameter names are inferred from app behavior; the method arguments are obfuscated.

### XMLTV Base Helper

JADX did not fully decompile helper `G`, but smali confirms it builds a base URL from `serverUrl`, `serverProtocol`, and the selected port.

Code:

- `out/apktool/noxpro/smali/f/g/a/h/i/e.smali:1540`

Then dashboard code appends:

```text
xmltv.php?username={username}&password={password}
```

## Activation Path

The APK has an activation-code login path that returns Xtream credentials, then proceeds through normal `player_api.php`.

Base:

```text
http://api.xtream.fr/protocol/receiver/
```

Code:

- Base configured in `out/jadx/noxpro/sources/f/g/a/h/i/e.java:2042`
- Interface method in `out/jadx/noxpro/sources/f/g/a/i/q/a.java:38`
- Caller in `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/LoginActivity.java:1512`

Request:

```http
GET http://api.xtream.fr/protocol/receiver/receiver.php?request=login&activeCode={activation_code}&mac={mac}
```

Response model:

- `ActivationPojo`, with `success` and `client[{username,password}]`.

## M3U Mode

M3U login is separate from Xtream API login.

Code:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/LoginM3uActivity.java:767`
- Parser entry area: `out/jadx/noxpro/sources/f/g/a/k/g/a.java:46`

Behavior:

- Stores `username = playlist`.
- Stores `password = playlist`.
- Stores the input URL/file path as `serverUrl` and `serverM3UUrl`.
- Marks app type as `m3u`.
- Downloads a user-supplied M3U URL with `new URL(...).openStream()` into `Documents/NOXIPTV/data.txt`.
- Parses playlist lines containing `http://` or `https://`, excluding `tvg-logo` lines.
- Uses the stored playlist URL directly for playback instead of building an Xtream stream URL.
- Writes parsed content into local SQLite tables such as:
  - `iptv_live_streams_m3u`
  - `iptv_live_category_m3u`
  - `iptv_movie_category_m3u`
  - `iptv_series_category_m3u`
  - `epg_m3u`

Local DB schemas are visible in:

- `out/jadx/noxpro/sources/f/g/a/i/p/e.java:92`
- `out/jadx/noxpro/sources/f/g/a/i/p/f.java:31`

M3U import/download references:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/ImportM3uActivity.java:81`
- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/ImportM3uActivity.java:167`

No Java construction of `get.php?type=m3u_plus` was found; M3U appears user-provided/downloaded and stored locally.

## Ancillary APIs

### NOX App Telemetry / Config

Base:

```text
http://nox.xtream.fr/Android/
```

Endpoint:

```text
response_api.php
```

Code:

- Base and endpoint constants: `out/jadx/noxpro/sources/f/g/a/f/g.java:15`
- OkHttp helper: `out/jadx/noxpro/sources/f/g/a/f/a.java:24`
- User-Agent: `IPTV Smarters Pro` at `out/jadx/noxpro/sources/f/g/a/f/a.java:36`

Observed fields in login/M3U telemetry include:

- `m`
- `k`
- `sc`
- `u`
- `pw`
- `r`
- `av`
- `dt`
- `d`
- `do`

Example construction:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/LoginM3uActivity.java:750`

### WHMCS / Billing / Support

Base:

```text
https://cms.alldrama.tv/
```

Endpoint:

```text
modules/addons/AppProducts/response.php
```

Code:

- Base: `out/jadx/noxpro/sources/f/g/a/e/d/b.java:22`
- Interface: `out/jadx/noxpro/sources/f/g/a/e/d/a.java:11`

Commands observed:

- `validateCustomLogin`
- `freetrail`
- ticket/invoice/client product commands through the same endpoint

The APK contains hardcoded WHMCS API credentials in multiple call sites. Do not commit those secrets into source or notes.

Related billing/web URLs:

- `https://users.iptvsmarters.com/` with `/includes/smartersapi/api.php`
  - Base: `out/jadx/noxpro/sources/f/g/a/h/i/e.java:1768`
  - Interface methods: `out/jadx/noxpro/sources/f/g/a/i/q/a.java:41`
- Invoice and upgrade webviews under `cms.alldrama.tv` and `51.75.16.104`
  - `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/WHMCSClientapp/activities/BuyNowActivity.java:88`

### TMDB Metadata

The app uses TMDB for VOD/series metadata and trailers.

Base:

```text
http://api.themoviedb.org/3/
```

Code:

- `out/jadx/noxpro/sources/f/g/a/h/i/e.java:1802`
- `out/jadx/noxpro/sources/f/g/a/j/d.java:153`

The TMDB API key appears hardcoded in presenters. Treat it as a third-party key and do not rely on it for our replacement app.

## DRM and Player Notes

The APK bundles media/player libraries such as IJKPlayer, FFmpeg, and ExoPlayer/Facebook ad media code. Static searches did not show a first-party Widevine/license API for the IPTV stream path. Current evidence points to simple Xtream HLS/TS style playback URLs, with no confirmed DRM resolver.

Native libraries include:

- `libijkplayer.so`
- `libijkffmpeg.so`
- `libopenvpn.so`
- `libovpn3.so`
- `librealm-jni.so`

Additional static checks:

- No app-specific `networkSecurityConfig`, `pin-sha256`, or `CertificatePinner` use was found.
- No bundled `.ovpn`, `.crt`, `.pem`, `.key`, `.p12`, `.bks`, `.conf`, or network-security XML files were found.
- Native `strings` scans of arm64 libraries and OpenVPN assets did not find extra app-specific hosts beyond the Java/resource findings.
- Firebase services are registered, but discovered Firebase property files only contained library version metadata. No `google-services.json`, `google_app_id`, `google_api_key`, or sender id surfaced.

## Confirmed vs Hypothesis

Confirmed:

- The app uses a standard Xtream-style `player_api.php` flow.
- `host2.php` bootstraps panel candidates.
- Login/category/channel/VOD/series/EPG endpoints are statically mapped.
- Normal playback URLs are built locally from stored server/user/pass/stream data.
- M3U mode is a separate playlist parser path.
- Static analysis did not find app-specific TLS pinning or hidden native endpoints.

Hypotheses / needs more evidence:

- The exact valid panel behavior requires a lawful test account.
- The exact timeshift parameter meaning should be confirmed against live responses.
- Whether `direct_source` is ever preferred over constructed URLs should be tested with real channel data.
- Any TLS pinning or runtime-only protection would need dynamic testing on an isolated device/emulator.
