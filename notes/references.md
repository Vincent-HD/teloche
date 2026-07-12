# Reference Resources

Date: 2026-07-13

This file is the central resource index for the IPTV/APK investigation. It
collects the public references, local reports, observed non-secret endpoints,
tooling, and implementation examples that may be useful when we build the
replacement client.

Do not add real usernames, passwords, activation codes, stream tokens, or live
account-specific URLs here. Use placeholders for anything credential-bearing.

## Local Project Artifacts

- `AGENTS.md`: project goal, workflow, ground rules, and Nix/comma usage.
- `openapi/xtream-compatible.yaml`: current unofficial OpenAPI draft for the
  Xtream-compatible surface.
- `notes/common-report.md`: cross-APK protocol summary.
- `notes/api-map.md`: detailed NOX-focused API map and code references.
- `notes/public-protocol-research.md`: broader internet research and protocol
  context.
- `notes/xtream-api-coverage.md`: endpoint-by-endpoint coverage notes used to
  build the OpenAPI draft.
- `notes/investigation-log.md`: commands, decode paths, and reproducibility log.
- `notes/noxpro.md`: NOX PRO-specific static analysis.
- `notes/ironmax.md`: IRON TV MAX-specific static analysis.
- `notes/irontv48.md`: IRON TV PRO-specific static analysis.
- `notes/mytv.md`: MyTVOnline3/Formuler-specific static analysis.

## Public Xtream / XC References

- Archived Xtream Codes API mirror:
  <https://github.com/engenex/xtream-codes-api-v2>
- Xtream UI endpoint article:
  <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- Fermata discussion listing common Xtream actions and playlist export:
  <https://github.com/AndreyPavlenko/Fermata/discussions/434>
- Formuler support: convert long M3U URL to XC API portal:
  <https://support.formuler.tv/kb/article/91-how-to-convert-long-m3u-to-xc-api-portal/>
- Formuler support: MYTVOnline portal types, including `MAC-ID`, `XC`, and
  `M3U`:
  <https://support.formuler.tv/kb/article/63-how-to-set-up-portals-on-mytvonline-mac-id-xc-m3u/>
- IPTV Smarters user portal, useful mainly as ecosystem context:
  <https://users.iptvsmarters.com/>

## Xtream Client And Server Implementations

- `ektotv/xtream-api`, TypeScript Xtream client inspected during this work:
  <https://github.com/ektotv/xtream-api>
- `ektotv/xtream-api` generated docs:
  <https://ektotv.github.io/xtream-api/>
- `@iptv/xtream-api` npm package page:
  <https://www.npmjs.com/package/@iptv/xtream-api>
- `py-xtream-codes`, Python URL builders and client behavior:
  <https://github.com/chazlarson/py-xtream-codes>
- Specific `py-xtream-codes` implementation file:
  <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- `go.xtream-codes`, Go client:
  <https://github.com/tellytv/go.xtream-codes>
- Specific `go.xtream-codes` implementation file:
  <https://github.com/tellytv/go.xtream-codes/blob/master/xtream-codes.go>
- `xtream_code_client`, Dart package docs:
  <https://pub.dev/documentation/xtream_code_client/latest/>
- `XtreamCodesExtendAPI`, PHP-compatible `player_api.php` implementation:
  <https://github.com/gtaman92/XtreamCodesExtendAPI/blob/master/player_api.php>
- `xtreamcodeserver`, compatible server/proxy implementation:
  <https://github.com/o0Zz/xtreamcodeserver>
- `iptvtunerr`, downstream Xtream-compatible output:
  <https://github.com/snapetech/iptvtunerr>
- Tunerr feature notes:
  <https://github.com/snapetech/iptvtunerr/blob/main/features.md>
- `netv` Xtream implementation:
  <https://github.com/jvdillon/netv/blob/main/xtream.py>
- `open-tv` Rust Xtream implementation:
  <https://github.com/Fredolx/open-tv/blob/main/src-tauri/src/xtream.rs>
- `mediaflow-proxy_exe`, useful for stream/proxy behavior references:
  <https://github.com/qwertyuiop8899/mediaflow-proxy_exe>

## Xtream Endpoint Shapes To Keep In Mind

These are protocol patterns, not calls to run with real credentials in committed
files.

```http
GET {base}/player_api.php?username={username}&password={password}
GET {base}/player_api.php?username={username}&password={password}&action=get_profile
GET {base}/player_api.php?username={username}&password={password}&action=get_server_info
GET {base}/player_api.php?username={username}&password={password}&action=get_live_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_live_streams
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_streams
GET {base}/player_api.php?username={username}&password={password}&action=get_vod_info&vod_id={vod_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_series_categories
GET {base}/player_api.php?username={username}&password={password}&action=get_series
GET {base}/player_api.php?username={username}&password={password}&action=get_series_info&series_id={series_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_short_epg&stream_id={stream_id}
GET {base}/player_api.php?username={username}&password={password}&action=get_short_epg&stream_id={stream_id}&limit={limit}
GET {base}/player_api.php?username={username}&password={password}&action=get_simple_data_table&stream_id={stream_id}
GET {base}/xmltv.php?username={username}&password={password}
GET {base}/get.php?username={username}&password={password}&type=m3u_plus&output=ts
```

Common local playback URL shapes:

```text
{base}/live/{username}/{password}/{stream_id}.ts
{base}/live/{username}/{password}/{stream_id}.m3u8
{base}/movie/{username}/{password}/{vod_id}.{container_extension}
{base}/series/{username}/{password}/{episode_id}.{container_extension}
{base}/timeshift/{username}/{password}/{duration}/{start}/{stream_id}.ts
{base}/streaming/timeshift.php?username={username}&password={password}&stream={stream_id}&start={start}&duration={duration}
{base}/{username}/{password}/{stream_id}
```

## Observed Non-Secret Provider/App Endpoints

These are endpoints and hosts found in APKs or bootstrap responses. They are
not credentials, but treat them as investigation notes rather than public
product configuration.

- NOX bootstrap:
  <http://nox.xtream.fr/Android/host2.php>
- NOX VPN/server-list bootstrap:
  <http://nox.xtream.fr/Android/server.php>
- NOX activation receiver:
  <http://api.xtream.fr/protocol/receiver/receiver.php?request=login&activeCode={activation_code}&mac={mac}>
- NOX receiver base:
  <http://api.xtream.fr/protocol/receiver/>
- NOX bootstrap panel candidates observed from `host2.php`:
  `http://sv.nfcd.cc:8080`, `http://sv2.nxpv.cc:2095`,
  `http://vip.silkatv.cc:8000`
- NOX server-list zip observed from `server.php`:
  <http://51.91.151.44/downloads/servers.zip>
- IRON bootstrap endpoint embedded in native code:
  <http://apk2021.xyz/api/host.php>
- IRON HTTPS variant tested:
  <https://apk2021.xyz/api/host.php>
- MyTV/NOX unrelated content endpoint found during static search:
  <https://cms.alldrama.tv/>
- TMDB API host referenced by bundled/app code:
  <http://api.themoviedb.org/3/>

## Stalker / MAG / Ministra References

- Official Infomir Ministra REST API docs. Important: this is an admin/service
  REST API, not the same as the consumer MAG/STB portal protocol:
  <https://wiki.infomir.eu/eng/ministra-tv-platform/ministra-setup-guide/rest-api-v1>
- Kodi `pvr.stalker` client source:
  <https://raw.githubusercontent.com/kodi-pvr/pvr.stalker/refs/heads/Piers/src/stalker/SAPI.cpp>
- `crispy-stalker` crate docs:
  <https://docs.rs/crispy-stalker/latest/crispy_stalker/>
- `crispy-stalker` repository:
  <https://github.com/moabualruz/crispy-stalker>
- Kodi Stalker plugin:
  <https://github.com/esxbr/plugin.video.stalker/blob/master/load_channels.py>
- `stalkerhek` authentication implementation:
  <https://github.com/erkexzcx/stalkerhek/blob/master/stalker/authentication.go>
- Public portal script with MAG-like headers/cookies:
  <https://raw.githubusercontent.com/mandrakodi/mandrakodi.github.io/refs/heads/main/portal_api.py>
- IPTVXtra Stalker client:
  <https://github.com/kens13/Kens13_Repo/blob/master/Addons/plugin.video.IPTVXtra/stalker.py>

Common portal request shapes:

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
GET {portal}?action=create_link&type=tv_archive&cmd={cmd}&JsHttpRequest=1-xml
```

## XMLTV And EPG References

- XMLTV format overview:
  <https://wiki.xmltv.org/index.php/XMLTVFormat>
- XMLTV project:
  <https://wiki.xmltv.org/index.php/XMLTVProject>
- XMLTV DTD:
  <https://github.com/XMLTV/xmltv/blob/master/xmltv.dtd>

Implementation notes:

- Xtream JSON EPG fields `title` and `description` are often base64-encoded.
- `xmltv.php` is the closest thing to a clean guide export in the Xtream
  ecosystem.
- Internal guide storage should normalize channel ids so M3U `tvg-id`, XMLTV
  channel ids, and Xtream `epg_channel_id` can be matched.

## M3U / M3U Plus References

- SS IPTV M3U notes:
  <https://www.ss-iptv.com/en/users/documents/m3u>
- SS IPTV EPG linkage notes:
  <https://ss-iptv.com/en/operators/epg>
- Kodi PVR IPTV Simple Client:
  <https://kodi.wiki/view/Add-on%3APVR_IPTV_Simple_Client>
- Telly M3U Plus examples:
  <https://github.com/tellytv/telly/wiki/Prerequisites%3A-IPTV-Account>
- `ipytv`, Python M3U/M3U Plus library:
  <https://github.com/Beer4Ever83/ipytv>

Common M3U Plus attributes:

```text
tvg-id
tvg-name
tvg-logo
tvg-chno
tvg-language
tvg-country
group-title
```

Common external guide linkage:

```text
#EXTM3U x-tvg-url="{xmltv_url}"
```

## HLS / M3U8 References

- RFC 8216, HTTP Live Streaming:
  <https://datatracker.ietf.org/doc/html/rfc8216>
- Apple HLS documentation:
  <https://developer.apple.com/streaming/>

Implementation note: distinguish M3U/M3U Plus IPTV catalog playlists from HLS
media playlists. `get.php?...output=m3u8` means stream format selection, while
`.m3u8` stream URLs are usually HLS playback assets.

## Public Metadata / Enrichment References

- `iptv-org/api`, public channel/feed/logo/guide datasets:
  <https://github.com/iptv-org/api>

Use this as optional enrichment only. It is not the provider API used by the
APKs and should not replace Xtream/Stalker/M3U ingestion.

## Tooling References

Prefer Nix/comma over global installs.

```sh
nix shell nixpkgs#apktool nixpkgs#jadx nixpkgs#android-tools nixpkgs#ripgrep
nix shell nixpkgs#mitmproxy nixpkgs#jq nixpkgs#sqlite nixpkgs#binutils
nix shell nixpkgs#redocly -c redocly lint openapi/xtream-compatible.yaml
```

Comma examples:

```sh
, apktool d app.apk -o out/apktool
, jadx -d out/jadx app.apk
, aapt dump badging app.apk
, jq . file.json
, -p apktool
, -x jadx
, -s mitmproxy
```

Important tools used or planned:

- `apktool`: decode APK resources and manifests.
- `jadx` / `jadx-gui`: decompile Dalvik bytecode.
- `aapt` / `apkanalyzer`: APK metadata.
- `android-tools`: `adb`, install/run/logcat.
- `ripgrep`: fast static searches.
- `jq`, `yq`, `xmllint`: structured data inspection.
- `sqlite`: bundled/local database inspection.
- `strings`, `file`, `binutils`: native blob inspection.
- `mitmproxy` or HTTP Toolkit: authorized traffic inspection.
- `redocly`: OpenAPI validation.

## Replacement Client Design Inputs

The resources above point toward three ingestion modes:

- Xtream/XC: base URL, username, password.
- Stalker/MAG: portal URL, MAC/device identity, handshake token/cookie flow.
- Playlist/M3U: URL or local file, optional XMLTV URL override.

All three should normalize into one internal model:

- channels,
- categories/groups,
- logos,
- stream URLs and playback hints,
- EPG entries,
- catchup/timeshift metadata,
- provider/account capabilities.

