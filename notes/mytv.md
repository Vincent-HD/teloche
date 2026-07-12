# MyTVOnline3 Report

Date: 2026-07-12

## Inventory

- APK: `apks/mytv.apk`
- Size: `97892719` bytes
- SHA-256: `bd9bb80f311d21e6a37a0c7809cf8c742f949f7396bac5307b21cd2033f74d8e`
- Package: `tv.formuler.mol3.real`
- Label: `MYTVOnline3`
- Version: `120133` / `12.1.33-5002-c58fe71f8`
- SDK: min `28`, target `32`
- Android TV / Leanback launcher is present.
- Manifest uses `@xml/network_security_config`.

## Classification

MyTVOnline3 is a generic Formuler IPTV client, not a France-specific IPTV APK.
It is useful because it supports the major protocols we care about:

- Stalker/MAG portal.
- Xtream/XTC.
- Playlist/M3U.
- Generic portal.

Server types are defined in:

- `out/jadx/mytv/sources/tv/formuler/molprovider/module/server/config/ServerType.java`

```text
STK(2)
XTC(3)
PLAYLIST(4)
PORTAL(1)
```

## Xtream / XTC Mode

MyTV accepts Xtream-style `get.php` URLs and extracts:

- Base URL: `{scheme}://{authority}`
- `username`
- `password`

Reference:

- `out/jadx/mytv/sources/tv/formuler/mol3/register/server/add/ModifyServerFragment.java`

Retrofit interface:

- `out/jadx/mytv/sources/tv/formuler/molprovider/module/server/api/XtcRetrofit.java`

Observed XTC calls:

```http
GET {base}/player_api.php?username={username}&password={password}
GET {base}/player_api.php?action=get_live_streams&username={username}&password={password}
GET {base}/player_api.php?action=get_short_epg&username={username}&password={password}&stream_id={stream_id}
GET {base}/player_api.php?action=get_simple_data_table&username={username}&password={password}&stream_id={stream_id}
GET {base}/player_api.php?action=get_vod_categories&username={username}&password={password}
GET {base}/player_api.php?action=get_vod_streams&username={username}&password={password}
GET {base}/player_api.php?action=get_vod_info&username={username}&password={password}&vod_id={vod_id}
GET {base}/player_api.php?action=get_series_categories&username={username}&password={password}
GET {base}/player_api.php?action=get_series&username={username}&password={password}
GET {base}/player_api.php?action=get_series_info&username={username}&password={password}&series_id={series_id}
GET {base}/xmltv.php?username={username}&password={password}
```

The OkHttp clients add a configured `User-Agent` header.

## XTC Playback

The XTC server code builds URLs locally.

Live:

```text
{domain}/live/{username}/{password}/{stream_id}.ts
```

Reference:

- `out/apktool/mytv/smali_classes3/tv/formuler/molprovider/module/server/XtcServer.smali`

VOD:

```text
{domain}/{stream_type}/{username}/{password}/{vod_id}.{container_extension}
```

For normal Xtream movie entries, `stream_type` is expected to be `movie`.

Series:

```text
{domain}/series/{username}/{password}/{episode_id}.{container_extension}
```

Timeshift:

```text
{domain}/timeshift/{username}/{password}/{duration}/{start}/{stream_id}.ts
```

XMLTV:

```http
GET {server_url}/xmltv.php?username={username}&password={password}
```

## Stalker / MAG Mode

Stalker support is implemented through `StkApi` and native `SiptvJni`.

Important references:

- `out/jadx/mytv/sources/tv/formuler/molprovider/module/server/api/StkApi.java`
- `out/jadx/mytv/sources/com/siptv/jni/SiptvJni.java`

Native functions expose portal/account values:

```text
OTT_Set_Opt_Sn_Mac
OTT_Set_Token
OTT_Get_ServerUrl
OTT_Get_DeviceId1
OTT_Get_DeviceId2
OTT_Get_PortalPath
OTT_Get_PortalIndex
OTT_Get_PortalVer
OTT_Get_Sign
OTT_Get_PhpSessId
OTT_Get_CookieName
OTT_Get_CookieValue
OTT_Get_XpcMac
OTT_Get_XpcSn
OTT_Get_VodPath
OTT_Get_MatrixPath
OTT_Get_MatrixIndex
```

Default MAG-style headers:

```http
User-Agent: Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 2738 Mobile Safari/533.3
X-User-Agent: Model: MAG254; Link: Ethernet
Accept: */*
Authorization: Bearer {token}
Cookie: PHPSESSID={php_session_id}; sn={sn}; mac={mac}; timezone={timezone}; stb_lang=en
```

`Authorization` is only added when a token is present.

Stalker URL base construction:

```text
{serverAddr}{portalPath}{portalIndex}{query}
```

Observed Stalker requests:

```http
GET ?action=get_genres&type=itv&JsHttpRequest=1-xml
GET ?action=get_all_channels&type=itv&JsHttpRequest=1-xml
GET ?type=stb&action=do_auth&login={username}&password={password}&device_id={device_id1}&device_id2={device_id2}&JsHttpRequest=1-xml
GET ?type=stb&action=logout&JsHttpRequest=1-xml
GET ?action=get_short_epg&ch_id={channel_id}&type=itv&JsHttpRequest=1-xml
GET ?type=epg&action=get_week&JsHttpRequest=1-xml
GET ?action=get_simple_data_table&type=epg&ch_id={channel_id}&date={date}&p={page}&JsHttpRequest=1-xml
GET ?action=create_link&type=tv_archive&cmd=auto%20/media/{archive_file}
GET ?type=vod&action=get_categories&JsHttpRequest=1-xml
GET ?type=vod&action=get_ordered_list&category={category}&p={page}&JsHttpRequest=1-xml
```

The live playback resolver method `requestRealLiveUrl(...)` did not decompile
cleanly in JADX, but nearby code shows Stalker play logging and link parsing.
This should be revisited from smali if Stalker becomes a target protocol.

## Playlist / M3U

The UI strings and playlist code show first-class M3U support:

- `Add m3u Playlist`
- `Add XMLTV EPG URL`
- `Playlist XMLTV EPG URL (optional)`

Playlist support is user-provided. It is not a hidden bundled France-channel
list.

## Not Found

- No fixed France-channel endpoint.
- No embedded account credentials.
- No single app-controlled panel bootstrap like NOX or IRON for XTC mode.

## Decompile Note

JADX completed with errors for this APK, but enough Java and smali output was
generated to map the XTC, Stalker, and Playlist paths above.
