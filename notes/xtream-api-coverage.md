# Xtream API Coverage

Date: 2026-07-12

This note focuses on the public Xtream / Xtream Codes / Xtream UI player-facing
API surface.

## Short Answer

I did not find a credible official OpenAPI/Swagger specification for the Xtream
player API.

What I did find:

- archived and mirrored human-written docs,
- current community documentation,
- multiple compatible client/server implementations,
- typed client libraries that effectively define a stable subset.

So the best practical result is a reconstructed endpoint catalog with confidence
levels.

## Best Sources

Closest things to documentation:

- Archived Xtream API mirror:
  <https://github.com/engenex/xtream-codes-api-v2>
- Current Xtream UI article:
  <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- Typed TypeScript docs:
  <https://ektotv.github.io/xtream-api/>

Implementation references:

- `py-xtream-codes`:
  <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- `go.xtream-codes`:
  <https://github.com/tellytv/go.xtream-codes>
- `xtreamcodeserver`:
  <https://github.com/o0Zz/xtreamcodeserver>
- Fermata endpoint discussion:
  <https://github.com/AndreyPavlenko/Fermata/discussions/434>

## Confidence Levels

`high`
- repeated in multiple public docs and implementations
- matches what we extracted from the APKs

`medium`
- repeated publicly, but with panel/provider variation

`low`
- seen only in some implementations or mentioned inconsistently

## Coverage Matrix

### 1. Authentication / Profile

#### `GET /player_api.php?username={u}&password={p}`

Purpose:

- authenticate user
- return account/profile data and server information

Typical response shape:

```text
user_info
server_info
```

Typical `user_info` fields:

```text
username
password
auth
status
exp_date
is_trial
active_cons
max_connections
allowed_output_formats
```

Typical `server_info` fields:

```text
url
port
https_port
rtmp_port
server_protocol
timezone
```

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/chazlarson/py-xtream-codes>
- <https://github.com/tellytv/go.xtream-codes>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES, matches NOX / IRON / MyTV XTC mode exactly.

### 2. Live TV Categories

#### `GET /player_api.php?...&action=get_live_categories`

Purpose:

- fetch live channel categories/groups

Typical fields:

```text
category_id
category_name
parent_id
```

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES

### 3. Live TV Streams

#### `GET /player_api.php?...&action=get_live_streams`

Purpose:

- fetch all live channels

Common optional filter:

```http
GET /player_api.php?...&action=get_live_streams&category_id={category_id}
```

Typical fields:

```text
num
name
stream_type
stream_id
stream_icon
epg_channel_id
category_id
added
direct_source
tv_archive
tv_archive_duration
```

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/AndreyPavlenko/Fermata/discussions/434>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES

Notes:

- field types are not perfectly stable across providers.
- public clients explicitly warn that Xtream responses are inconsistent.

### 4. VOD Categories

#### `GET /player_api.php?...&action=get_vod_categories`

Purpose:

- fetch movie/VOD categories

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES

### 5. VOD Streams

#### `GET /player_api.php?...&action=get_vod_streams`

Purpose:

- fetch all VOD/movie entries

Common optional filter:

```http
GET /player_api.php?...&action=get_vod_streams&category_id={category_id}
```

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES

### 6. VOD Details

#### `GET /player_api.php?...&action=get_vod_info&vod_id={vod_id}`

Purpose:

- fetch metadata for one movie/VOD item

Typical response areas:

```text
info
movie_data
```

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES

### 7. Series Categories

#### `GET /player_api.php?...&action=get_series_categories`

Purpose:

- fetch TV series categories

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES

### 8. Series Listing

#### `GET /player_api.php?...&action=get_series`

Purpose:

- fetch all series entries

Common optional filter:

```http
GET /player_api.php?...&action=get_series&category_id={category_id}
```

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES

### 9. Series Details

#### `GET /player_api.php?...&action=get_series_info&series_id={series_id}`

Purpose:

- fetch metadata, seasons, and episodes for one series

Public caution:

- some public examples use `series=` instead of `series_id=`
- client libraries and our APKs strongly point to `series_id=`

Confidence: `high`

Sources:

- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://ektotv.github.io/xtream-api/>
- <https://github.com/AndreyPavlenko/Fermata/discussions/434>

APK match:

- YES, with `series_id=`

### 10. Short EPG

#### `GET /player_api.php?...&action=get_short_epg&stream_id={stream_id}`

Purpose:

- fetch short guide slice for one live channel

Common optional param:

```http
GET /player_api.php?...&action=get_short_epg&stream_id={stream_id}&limit={n}
```

Notes:

- `limit` is commonly documented
- some providers reportedly ignore it

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/AndreyPavlenko/Fermata/discussions/434>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES in MyTV; not equally visible in every APK, but compatible.

### 11. Full EPG For One Channel

#### `GET /player_api.php?...&action=get_simple_data_table&stream_id={stream_id}`

Purpose:

- fetch full/simple EPG table for one live channel

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>
- <https://ektotv.github.io/xtream-api/>

APK match:

- YES

### 12. Full XMLTV Export

#### `GET /xmltv.php?username={u}&password={p}`

Purpose:

- fetch XMLTV guide for all channels

Confidence: `high`

Sources:

- <https://xtream-ui.org/api-xtreamui-xtreamcode/>
- <https://github.com/tellytv/go.xtream-codes>
- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>

APK match:

- YES

### 13. Playlist Export

#### `GET /get.php?username={u}&password={p}&type=m3u_plus&output=ts`

Purpose:

- export playlist in M3U Plus form

Common variants:

```text
output=ts
output=m3u8
output=hls
output=rtmp
```

Confidence: `high`

Sources:

- <https://support.formuler.tv/kb/article/91-how-to-convert-long-m3u-to-xc-api-portal/>
- <https://github.com/AndreyPavlenko/Fermata/discussions/434>
- <https://github.com/o0Zz/xtreamcodeserver>

APK match:

- MyTV parses `get.php` style Xtream links.
- NOX had M3U mode, but not necessarily this exact builder in code.

### 14. Live Stream URL

#### `GET /live/{username}/{password}/{stream_id}.{ext}`

Purpose:

- play live stream directly

Common extensions:

```text
ts
m3u8
```

Confidence: `high`

Sources:

- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>
- <https://github.com/qwertyuiop8899/mediaflow-proxy_exe>

APK match:

- YES

### 15. VOD Stream URL

#### `GET /movie/{username}/{password}/{vod_id}.{ext}`

Purpose:

- play movie/VOD directly

Confidence: `high`

Sources:

- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/o0Zz/xtreamcodeserver>
- <https://github.com/qwertyuiop8899/mediaflow-proxy_exe>

APK match:

- YES

### 16. Series Episode URL

#### `GET /series/{username}/{password}/{episode_id}.{ext}`

Purpose:

- play one series episode directly

Confidence: `high`

Sources:

- <https://github.com/chazlarson/py-xtream-codes/blob/master/xtream.py>
- <https://github.com/qwertyuiop8899/mediaflow-proxy_exe>

APK match:

- YES

### 17. Timeshift / Catchup URL

#### path style

```text
/timeshift/{username}/{password}/{duration}/{start}/{stream_id}.ts
```

#### query style

```text
/streaming/timeshift.php?username={u}&password={p}&stream={stream_id}&start={start}&duration={minutes}
```

Purpose:

- catchup / archive playback

Confidence: `medium`

Why only medium:

- both styles are publicly used
- provider support is inconsistent
- parameter formatting varies

Sources:

- <https://github.com/AndreyPavlenko/Fermata/discussions/434>
- <https://github.com/jvdillon/netv/blob/main/xtream.py>
- <https://github.com/Fredolx/open-tv/blob/main/src-tauri/src/xtream.rs>
- <https://github.com/qwertyuiop8899/mediaflow-proxy_exe>

APK match:

- YES
- MyTV matches path style
- IRON matches query style
- NOX builds path style

### 18. `panel_api.php`

#### `GET /panel_api.php?...`

Purpose:

- occasionally mentioned in public proxies and tools

Confidence: `low`

Why low:

- not part of the mapped APK behavior
- not consistently documented in the same way as `player_api.php`

Sources:

- <https://github.com/qwertyuiop8899/mediaflow-proxy_exe>

APK match:

- NO direct evidence in these APKs

## Typed Coverage From Public Libraries

The public TypeScript docs at <https://ektotv.github.io/xtream-api/> define this
practical high-level method set:

```text
getProfile()
getServerInfo()
getChannelCategories()
getMovieCategories()
getShowCategories()
getChannels()
getMovies()
getMovie()
getShows()
getShow()
getShortEPG()
getFullEPG()
generateStreamUrl()
```

This is useful because it represents a modern “usable subset” of the Xtream
surface rather than raw endpoint folklore.

## Conclusion

I do not see evidence of a formal public OpenAPI/Swagger definition for the
Xtream player API.

What I do see is enough repeated public behavior to treat the following as the
core stable surface for our alternative client:

- login/profile via `player_api.php`
- live/VOD/series categories and listings
- VOD and series detail lookups
- short and full EPG lookups
- XMLTV export
- M3U export through `get.php`
- locally constructed playback URLs for live/movie/series/timeshift

That is enough to model a replacement client confidently, as long as we keep
panel/provider quirks in mind.
