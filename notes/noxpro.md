# NOX PRO Report

Date: 2026-07-12

This is the short per-APK report. The detailed NOX endpoint map remains in
`notes/api-map.md`.

## Inventory

- APK: `apks/noxpro.apk`
- Size: `101355721` bytes
- SHA-256: `a8b4635528bdcf82c25e892bbaf38414b816f042e295db1ed49520f6aec2b608`
- Package: `com.noxiptv.noxiptviptviptv1iptvbox`
- Label: `NOX PRO`
- Version: `118` / `3.0.9.9`
- SDK: min `17`, target `31`
- Manifest enables cleartext traffic.
- Android TV / Leanback launcher is present.

## Classification

NOX PRO is a white-label IPTV Smarters / Xtream Codes-style Android TV client.

The channel list, logos, metadata, VOD, series, and EPG are not bundled in the
APK. They come from a configured Xtream panel or from M3U mode.

## Bootstrap

Panel bootstrap:

```http
GET http://nox.xtream.fr/Android/host2.php
```

Live response on 2026-07-12:

```json
{
  "status": "true",
  "su": "http://sv.nfcd.cc:8080,http://sv2.nxpv.cc:2095,http://vip.silkatv.cc:8000",
  "ip_check": false
}
```

VPN config:

```http
GET http://nox.xtream.fr/Android/server.php
```

Live response on 2026-07-12:

```json
{
  "status": "true",
  "su": "http://51.91.151.44/downloads/servers.zip",
  "sc": "7e5cefea513bf4c2c0194e7553b30ca3",
  "ndd": ""
}
```

Key references:

- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/SplashActivity.java`
- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/view/activity/LoginActivity.java`
- `out/jadx/noxpro/sources/com/noxiptv/noxiptviptviptv1iptvbox/vpn/activities/ImportVPNActivity.java`

## Xtream API

Retrofit interface:

- `out/jadx/noxpro/sources/f/g/a/i/q/a.java`

Observed calls:

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

NOX handles HTTP `301`/`302` panel redirects by reading `Location`, splitting at
`/player_api.php`, storing the redirected base URL, and retrying login.

## Playback

The app builds playback URLs locally:

```text
Live:
{scheme}://{host}:{port}/live/{username}/{password}/{stream_id}.{ts_or_m3u8}

Movie:
{scheme}://{host}:{port}/movie/{username}/{password}/{stream_id}.{extension}

Series:
{scheme}://{host}:{port}/series/{username}/{password}/{episode_id}.{extension}

Timeshift:
{scheme}://{host}:{port}/timeshift/{username}/{password}/{duration_or_type}/{start}/{stream_id}.{format}
```

## Activation Code

NOX has an activation-code login path:

```http
GET http://api.xtream.fr/protocol/receiver/receiver.php?request=login&activeCode={activation_code}&mac={mac}
```

The response yields Xtream credentials, then the app uses normal
`player_api.php`.

## M3U Mode

NOX PRO has a separate M3U playlist mode. It stores placeholder credentials such
as `playlist`, downloads or copies a playlist, parses stream URLs, and stores
channels in local SQLite tables.

No `get.php?type=m3u_plus` URL builder was confirmed in the NOX code. M3U mode
is separate from the Xtream login mode.

## Not Found

- No app-specific Bearer token or Authorization header for the Xtream flow.
- No confirmed custom TLS pinning for the mapped API path.
- No public France-channel API bundled in the APK.
- No app-specific DRM license endpoint.
