# Investigation Log

Date: 2026-07-12

## Setup

Private/generated folders are ignored:

```sh
printf '/apks/\n/out/\n' > .gitignore
```

Current `.gitignore`:

```text
/apks/
/out/
```

Generated folders:

```sh
mkdir -p apks out notes
```

## APK Inventory

```sh
stat -c '%n %s bytes' apks/*.apk
sha256sum apks/*.apk
```

Results:

```text
apks/ironmax.apk 81997912 bytes
apks/irontv48.apk 81494819 bytes
apks/mytv.apk 97892719 bytes
apks/noxpro.apk 101355721 bytes

1d18af73133813fa7088f23434b2416fd758811c13cde2d61d86ae869718415a  apks/ironmax.apk
4300e2cd1f7879c36562c2a7d966cc85030e9d7d10367d6595f60637cb3524d8  apks/irontv48.apk
bd9bb80f311d21e6a37a0c7809cf8c742f949f7396bac5307b21cd2033f74d8e  apks/mytv.apk
a8b4635528bdcf82c25e892bbaf38414b816f042e295db1ed49520f6aec2b608  apks/noxpro.apk
```

Metadata came from apktool outputs:

```sh
rg -n "versionCode|versionName|minSdkVersion|targetSdkVersion" out/apktool/*/apktool.yml
rg -n "package=|usesCleartextTraffic|LEANBACK_LAUNCHER" out/apktool/*/AndroidManifest.xml
rg -n "<string name=\"app_name\"|<string name=\"mytvonline3\"" out/apktool/*/res/values/strings.xml
```

## Decode / Decompile

Commands used:

```sh
nix shell nixpkgs#apktool -c apktool d -f apks/noxpro.apk -o out/apktool/noxpro
nix shell nixpkgs#jadx -c jadx -d out/jadx/noxpro apks/noxpro.apk

nix shell nixpkgs#apktool -c apktool d -f apks/ironmax.apk -o out/apktool/ironmax
nix shell nixpkgs#jadx -c jadx -d out/jadx/ironmax apks/ironmax.apk

nix shell nixpkgs#apktool -c apktool d -f apks/irontv48.apk -o out/apktool/irontv48
nix shell nixpkgs#jadx -c jadx -d out/jadx/irontv48 apks/irontv48.apk

nix shell nixpkgs#apktool -c apktool d -f apks/mytv.apk -o out/apktool/mytv
nix shell nixpkgs#jadx -c jadx -d out/jadx/mytv apks/mytv.apk
```

Notes:

- `apktool` outputs are in `out/apktool/{noxpro,ironmax,irontv48,mytv}`.
- `jadx` outputs are in `out/jadx/{noxpro,ironmax,irontv48,mytv}`.
- NOX JADX finished with decompiler errors, but Java and smali were usable.
- MyTV JADX finished with `ERROR - finished with errors, count: 79`; smali was
  used where coroutine-heavy Java methods were skipped.

## Useful Searches

Shared searches:

```sh
rg -n "https?://|player_api\.php|xmltv\.php|get_live_streams|get_live_categories|get_vod_streams|get_vod_categories|get_series|get_series_categories|get_simple_data_table|get_vod_info|get_series_info|m3u8|m3u|xtream|xstream|stalker|MAG|Authorization|Bearer|widevine|drm|license" out/jadx out/apktool
```

NOX:

```sh
rg -n "host2\.php|server\.php|receiver\.php|api\.xtream\.fr|player_api\.php|xmltv\.php|m3u" out/jadx/noxpro out/apktool/noxpro
```

IRON:

```sh
rg -n "apk2021|XC_HOST|ACTIVE_CODE_HOST|player_api\.php|xmltv\.php|timeshift|getValueString" out/jadx/ironmax out/apktool/ironmax
rg -n "apk2021|XC_HOST|ACTIVE_CODE_HOST|player_api\.php|xmltv\.php|timeshift|getValueString" out/jadx/irontv48 out/apktool/irontv48
nix shell nixpkgs#binutils -c strings -a out/apktool/ironmax/lib/arm64-v8a/libnative-lib.so
nix shell nixpkgs#binutils -c strings -a out/apktool/irontv48/lib/arm64-v8a/libnative-lib.so
```

MyTV:

```sh
rg -n "ServerType|XtcRetrofit|XtcApi|XtcServer|StkApi|SiptvJni|ModifyServerFragment|Playlist|m3u|xmltv\.php|player_api\.php" out/jadx/mytv out/apktool/mytv
```

## Live Bootstrap Probes

Used fake credentials only for panel probes.

NOX config:

```sh
nix shell nixpkgs#curl -c curl -sS --max-time 15 -D - http://nox.xtream.fr/Android/host2.php -o /tmp/teloche-host2.json
nix shell nixpkgs#curl -c curl -sS --max-time 15 -D - http://nox.xtream.fr/Android/server.php -o /tmp/teloche-server.json
```

`host2.php` returned:

```json
{"status":"true","su":"http:\/\/sv.nfcd.cc:8080,http:\/\/sv2.nxpv.cc:2095,http:\/\/vip.silkatv.cc:8000","ip_check":false}
```

`server.php` returned:

```json
{"status":"true","su":"http:\/\/51.91.151.44\/downloads\/servers.zip","sc":"7e5cefea513bf4c2c0194e7553b30ca3","ndd":""}
```

NOX panel candidate probes:

```text
http://sv.nfcd.cc:8080/player_api.php?username=__probe__&password=__probe__
http_code=404 remote_ip=188.114.96.2 size=0

http://sv2.nxpv.cc:2095/player_api.php?username=__probe__&password=__probe__
http_code=404 remote_ip=188.114.97.2 size=0

http://vip.silkatv.cc:8000/player_api.php?username=__probe__&password=__probe__
curl: (6) Could not resolve host: vip.silkatv.cc
http_code=000 remote_ip= size=0
```

IRON native bootstrap:

```sh
nix shell nixpkgs#curl -c curl -sS --max-time 10 -D - http://apk2021.xyz/api/host.php -o /tmp/teloche-apk2021-host.txt
nix shell nixpkgs#curl -c curl -sS --max-time 10 -D - https://apk2021.xyz/api/host.php -o /tmp/teloche-apk2021-host-https.txt
```

Both probes failed:

```text
curl: (6) Could not resolve host: apk2021.xyz
```

## Nix / Comma Notes

The project notes mention comma. In this non-interactive exec context, running
`,` failed with:

```text
Failed to open tty: No such device or address
```

When that happened, the equivalent `nix shell nixpkgs#... -c ...` form worked.

## Subagent Passes

Read-only subagent passes were used for parallel exploration.

- NOX explorers confirmed Xtream call chain, redirect retry behavior, login
  persistence, playback URL construction, M3U direct playback, and no Bearer/Auth
  headers for the Xtream path.
- IRON TV MAX explorer confirmed the native bootstrap URL, `su`/`ac` response
  parser, active-code flow, Xtream endpoints, local stream URL construction,
  and no app-level M3U mode.
- IRON TV PRO explorer confirmed it is a near-clone of IRON TV MAX with package
  and branding differences only for the mapped API surface.
- MyTV analysis was finished locally after a subagent returned too much output;
  Java plus smali were enough to map XTC, Stalker/MAG, and M3U/Playlist support.

## Report Files

- `notes/common-report.md`: cross-APK conclusions and shared protocol map.
- `notes/noxpro.md`: per-APK summary for NOX PRO.
- `notes/api-map.md`: detailed NOX PRO map from the first pass.
- `notes/ironmax.md`: per-APK report for IRON TV MAX.
- `notes/irontv48.md`: per-APK report for IRON TV PRO.
- `notes/mytv.md`: per-APK report for MyTVOnline3 / Formuler.
