# Public Protocol Research

Date: 2026-07-12

This note supplements the static APK findings with public internet sources that
help explain the protocol surface we uncovered.

It is meant to answer two questions:

1. Which parts of the IPTV behavior we found are publicly documented or at least
   consistently implemented elsewhere?
2. Which public formats and APIs can help us build a cleaner replacement client?

## High-Level Takeaway

The public ecosystem strongly reinforces the main static conclusion from
`notes/common-report.md`:

- Xtream-compatible clients revolve around `player_api.php`, `get.php`,
  `xmltv.php`, and locally constructed playback URLs.
- Stalker/MAG portals use a different query-string protocol, usually under
  `portal.php` or `server/load.php`, with MAC-based auth, cookies, and a bearer
  token.
- M3U Plus and XMLTV are the common interchange formats between providers and
  players.

There is no single authoritative public Xtream specification comparable to a
standards document. For Xtream, the best public evidence is a combination of:

- vendor help articles,
- compatible client libraries,
- open-source implementations.

By contrast, XMLTV has a real maintained format definition.

## 1. Xtream / Xtreme Codes Surface

### Best Public References

I did not find a current, maintained official Xtream Codes specification.
The most useful public references are:

- an archived mirror of older Xtream API docs:
  <https://github.com/engenex/xtream-codes-api-v2>
- a current Xtream UI article that lists the same player-facing endpoints:
  <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- public compatible client/server implementations.

This means the Xtream section should be treated as a compatibility contract
reconstructed from multiple sources, not as a formal standard.

### Publicly Repeated Endpoint Shapes

Multiple public sources describe the same core Xtream-compatible endpoints:

```http
GET {base}/player_api.php?username={username}&password={password}
GET {base}/player_api.php?username={username}&password={password}&action=get_live_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_live_streams
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_streams
GET {base}/player_api.php?username={username}&password={password}&action=get_series_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_series
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_info&vod_id={vod_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_series_info&series_id={series_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_short_epg&stream_id={stream_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_simple_data_table&stream_id={stream_id}
GET {base}/xmltv.php?username={username}&password={password}
GET {base}/get.php?username={username}&password={password}&type=m3u_plus&output=ts
```

Public sources:

- archived Xtream API mirror:
  <https://github.com/engenex/xtream-codes-api-v2>
- Xtream UI article:
  <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- Formuler support: `get.php?...type=m3u_plus` can be converted into Xtream/XC
  base URL + username + password.
  Link: <https://support.formuler.tv/kb/article/91-how-to-convert-long-m3u-to-xc-api-portal/>
- Formuler portal setup overview: MYTVOnline supports `MAC-ID`, `XC`, and `M3U`
  connection types.
  Link: <https://support.formuler.tv/kb/article/63-how-to-set-up-portals-on-mytvonline-mac-id-xc-m3u/>
- Fermata discussion that enumerates common Xtream actions and playlist export.
  Link: <https://github.com/AndreyPavlenko/Fermata/discussions/434>
- `py-xtream-codes` URL builders.
  Link: <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- `go.xtream-codes` public client.
  Link: <https://github.com/tellytv/go.xtream-codes/blob/master/xtream-codes.go>
- `XtreamCodesExtendAPI` implementation with accepted actions.
  Link: <https://github.com/gtaman92/XtreamCodesExtendAPI/blob/master/player_api.php>
- `xtream_code_client` docs showing playlist URL helpers and XMLTV support.
  Link: <https://pub.dev/documentation/xtream_code_client/latest/>

### What Matches Our APK Findings

This public surface matches the static APK findings very closely:

- NOX PRO, IRON TV MAX, IRON TV PRO, and MyTVOnline3 all use `player_api.php`.
- All four align with `xmltv.php`.
- MyTVOnline3 explicitly parses `get.php?...type=m3u_plus`.
- Our APKs build live/movie/series/timeshift URLs locally instead of relying on
  a dedicated playback resolver API.

Public sources also add a few useful implementation details:

- `get_short_epg` commonly accepts `limit={X}`, often defaulting to `4`.
- `category_id={X}` filtering for `get_live_streams`, `get_vod_streams`, and
  `get_series` is commonly supported.
- public response models often expose the same `user_info` and `server_info`
  fields we saw statically in the APKs.

### Publicly Repeated Playback Shapes

Public Xtream-compatible implementations consistently expose or emulate:

```text
{base}/live/{username}/{password}/{stream_id}.ts
{base}/movie/{username}/{password}/{vod_id}.{extension}
{base}/series/{username}/{password}/{episode_id}.{extension}
```

Public examples:

- Tunerr's downstream Xtream-compatible output:
  <https://github.com/snapetech/iptvtunerr>
- Tunerr feature notes:
  <https://github.com/snapetech/iptvtunerr/blob/main/features.md>
- public clients that build stream URLs locally:
  <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>

This lines up with our local APK evidence in:

- `notes/common-report.md`
- `notes/noxpro.md`
- `notes/ironmax.md`
- `notes/irontv48.md`
- `notes/mytv.md`

### Cautions

- Community discussions sometimes contain typos. One common example is
  `get_simple_date_table`; our APKs and public client libraries point to
  `get_simple_data_table`.
- Public code also shows two timeshift/catchup styles in the wild:
  - path style:
    `{base}/timeshift/{username}/{password}/{duration}/{start}/{stream_id}.ts`
  - query style:
    `{base}/streaming/timeshift.php?username={username}&password={password}&stream={stream_id}&start={timestamp_or_datetime}&duration={minutes}`
  This matches our split between MyTV and the IRON apps.
- Xtream panel implementations can differ slightly in accepted query params and
  response field types.

For the replacement client, we should treat Xtream as a compatibility family,
not a perfectly strict single implementation.

## 2. Stalker / MAG / Ministra

### Official Infomir REST API

Infomir documents an official Ministra REST API with:

- HTTP methods `GET`, `PUT`, `POST`, `DELETE`
- Basic HTTP authentication
- resources such as `STB` and `ACCOUNTS`

Official source:

- <https://wiki.infomir.eu/eng/ministra-tv-platform/ministra-setup-guide/rest-api-v1>

Important distinction:

- This official REST API is an admin/service API.
- It is not the same thing as the MAG/STB portal protocol used by consumer
  clients like the MyTVOnline3 APK.
- Public portal clients consistently target `/stalker_portal/` or
  `/server/load.php`, while the official REST docs describe `/api/...`
  management resources with Basic Auth.

### Publicly Observed Portal Protocol

Public Stalker/MAG client implementations converge on a query-string-based
consumer protocol with a handshake, cookies, bearer token, and MAG-like headers.

Public sources:

- Kodi's maintained `pvr.stalker` client:
  <https://raw.githubusercontent.com/kodi-pvr/pvr.stalker/refs/heads/Piers/src/stalker/SAPI.cpp>
- `crispy-stalker` crate overview:
  <https://docs.rs/crispy-stalker/latest/crispy_stalker/>
- `crispy-stalker` repository:
  <https://github.com/moabualruz/crispy-stalker>
- Kodi Stalker plugin:
  <https://github.com/esxbr/plugin.video.stalker/blob/master/load_channels.py>
- `stalkerhek` handshake implementation:
  <https://github.com/erkexzcx/stalkerhek/blob/master/stalker/authentication.go>
- public portal script with MAG-like headers/cookies:
  <https://raw.githubusercontent.com/mandrakodi/mandrakodi.github.io/refs/heads/main/portal_api.py>
- public portal client showing `do_auth` style account login:
  <https://github.com/kens13/Kens13_Repo/blob/master/Addons/plugin.video.IPTVXtra/stalker.py>

Publicly repeated portal requests include:

```http
GET {portal}?type=stb&action=handshake&JsHttpRequest=1-xml
GET {portal}?type=stb&action=get_profile&JsHttpRequest=1-xml
GET {portal}?type=itv&action=get_genres&JsHttpRequest=1-xml
GET {portal}?type=itv&action=get_all_channels&JsHttpRequest=1-xml
GET {portal}?type=itv&action=get_ordered_list&genre={genre_id}&p={page}&JsHttpRequest=1-xml
GET {portal}?type=vod&action=get_categories&JsHttpRequest=1-xml
GET {portal}?type=vod&action=get_ordered_list&category={category}&p={page}&JsHttpRequest=1-xml
GET {portal}?type=stb&action=do_auth&login={username}&password={password}&device_id={device_id1}&device_id2={device_id2}&JsHttpRequest=1-xml
GET {portal}?type=epg&action=get_simple_data_table&ch_id={channel_id}&date={date}&p={page}&JsHttpRequest=1-xml
GET {portal}?action=create_link&type=tv_archive&cmd=auto%20/media/...&JsHttpRequest=1-xml
```

Publicly repeated request headers include MAG-like values such as:

- `User-Agent: Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/... MAG200 ...`
- `X-User-Agent: Model: MAG254; Link: Ethernet`
- `Authorization: Bearer {token}`
- `Cookie: PHPSESSID=...; sn=...; mac=...; stb_lang=en; timezone=...`

### What Matches Our APK Findings

This public portal behavior matches the MyTVOnline3 APK very well:

- `notes/mytv.md` shows `StkApi` and `SiptvJni`.
- The app computes or stores MAC/sn/device ids and builds the same family of
  portal URLs.
- The headers/cookies/token pattern in public clients matches the headers built
  by MyTV's `StkApi`.
- The maintained Kodi `pvr.stalker` client explicitly implements handshake,
  profile, auth, genres, channels, and link creation methods, which matches the
  same progression visible in MyTV's `StkApi`.

This makes MyTV a useful protocol reference client, even though it is not a
France-specific branded provider app.

### Cautions

- `get_simple_data_table` for EPG is common in public portal code, but I did not
  find it documented in the official Infomir REST docs.
- `create_link` response details vary by portal/version. Public clients usually
  expect a `cmd` field but often add fallback or redirect handling.
- `do_auth` appears common but not universal. Some portals work with MAC +
  handshake/profile only, while others require a second account-auth step.

## 3. XMLTV

### Closest Thing To A Real Spec

XMLTV is the cleanest documented piece of this ecosystem.

Official/public-maintained sources:

- Format overview:
  <https://wiki.xmltv.org/index.php/XMLTVFormat>
- XMLTV project:
  <https://wiki.xmltv.org/index.php/XMLTVProject>
- DTD:
  <https://github.com/XMLTV/xmltv/blob/master/xmltv.dtd>

Key points:

- The file is centered around a `<tv>` root element.
- Channels are identified by `channel` ids.
- Programmes refer back to those ids.
- Programme timing/channel are attributes; metadata is stored in nested
  elements.

### Why This Matters For Us

For the replacement client, XMLTV should be treated as the canonical guide
format, even if playlists or provider APIs differ in how they name channels.

That suggests:

- internal EPG mapping should be keyed around a normalized channel id,
- playlist `tvg-id` values should map to XMLTV channel ids when possible,
- provider-specific EPG JSON can be translated into the same internal model.

## 4. M3U / M3U Plus

### Practical Reality

There is no single strong official IPTV M3U Plus specification.
What exists is a widely shared convention around `#EXTM3U` and `#EXTINF`
augmented with IPTV-specific attributes.

Useful public references:

- SS IPTV "About M3U":
  <https://www.ss-iptv.com/en/users/documents/m3u>
- Kodi PVR IPTV Simple Client:
  <https://kodi.wiki/view/Add-on%3APVR_IPTV_Simple_Client>
- Telly wiki example of M3U Plus fields:
  <https://github.com/tellytv/telly/wiki/Prerequisites%3A-IPTV-Account>
- `ipytv` library notes on M3U Plus:
  <https://github.com/Beer4Ever83/ipytv>

Publicly repeated attributes include:

```text
tvg-id
tvg-name
tvg-logo
tvg-chno
tvg-language
tvg-country
group-title
```

### External Guide Linkage

SS IPTV documents:

```text
#EXTM3U x-tvg-url="EPG_url"
```

and says:

- XMLTV and JTV are supported guide formats.
- XMLTV must not be gzipped for that use case.
- CORS headers may be required for client-side fetching.

Source:

- <https://ss-iptv.com/en/operators/epg>

### What Matches Our APK Findings

- NOX PRO supports M3U mode directly.
- MyTVOnline3 supports M3U/playlist mode directly.
- The Xtream `get.php?...type=m3u_plus` to XC-credentials conversion documented
  by Formuler matches MyTV's URL parsing behavior.

### Replacement-Client Implication

We should support playlist ingestion as a first-class source, not as a fallback.

The app should be able to ingest:

- M3U or M3U Plus,
- optional embedded `x-tvg-url`,
- optional user-provided XMLTV override,
- direct stream links using `http`, `https`, `udp`, `rtp`, or HLS `.m3u8`.

## 5. HLS / `.m3u8`

When a provider or playlist uses `.m3u8`, that is often HLS rather than a plain
playlist metadata export.

Official references:

- RFC 8216:
  <https://datatracker.ietf.org/doc/html/rfc8216>
- Apple HLS docs:
  <https://developer.apple.com/streaming/>

This matters because:

- `get.php?...output=m3u8` should be treated as a playback/stream choice,
  not just a metadata format switch.
- the replacement client should distinguish between:
  - IPTV catalog playlists,
  - HLS media playlists,
  - HLS master playlists.

## 6. Public Metadata And Enrichment Sources

These are not the same as the provider APIs used by the APKs, but they may help
us enrich the replacement client later.

### iptv-org API

Public API:

- <https://github.com/iptv-org/api>

The API exposes public datasets for:

- channels,
- feeds,
- logos,
- streams,
- guides,
- categories,
- languages,
- countries,
- regions,
- timezones,
- blocklist.

The docs include France examples such as `France3.fr` and feed/logo/stream
records.

### What It Is Good For

- public channel metadata fallback,
- public logo lookup,
- optional public XMLTV/guide cross-linking,
- optional France free-to-air enrichment if we later support non-provider inputs.

### What It Is Not

- It is not the same API used by the branded IPTV APKs.
- It should be treated as optional enrichment, not as a substitute for Xtream or
  Stalker provider integration.

## 7. Design Guidance For The Alternative Client

Based on both the APK reverse-engineering and the public sources, a clean client
should treat these as separate but converging ingestion paths:

1. Xtream/XC login:
   - base URL,
   - username,
   - password.
2. Stalker/MAG portal:
   - portal URL,
   - MAC identity,
   - optional device metadata.
3. Playlist/M3U:
   - URL or local file,
   - optional XMLTV URL override.

Internally, all three should normalize into one catalog model:

- channels,
- groups/categories,
- logos,
- stream endpoints,
- EPG entries,
- catchup/timeshift capability,
- playback hints such as `mpegts`, `hls`, `dash`, direct file.

## 8. Confidence Levels

Confirmed by both APKs and public sources:

- Xtream `player_api.php`
- Xtream `xmltv.php`
- Xtream `get.php` playlist export
- Xtream local playback URL construction
- Stalker/MAG handshake + token + cookie pattern
- XMLTV as the guide format
- M3U Plus attributes like `tvg-id`, `tvg-logo`, `group-title`
- Formuler-style conversion from `get.php?...type=m3u_plus` into XC credentials
- distinction between official Infomir REST management API and portal playback
  protocol

Reasonable but still compatibility-sensitive:

- exact field sets in Xtream responses,
- exact timeshift URL variants,
- exact accepted output extensions per panel,
- panel-specific quirks in Stalker portals.

Still needs live testing later:

- a currently working IRON bootstrap host response,
- real panel responses from a valid account,
- how often different providers diverge from the public Xtream surface.
