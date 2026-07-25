# Catalog Synchronization

## Scope

The first synchronization feature imports provider collections and live
channels into a provider-neutral catalog. Xtream is the first adapter, not the
domain model.

An authorized probe used during design returned 66 live collections and 4,110
live channels. It confirmed that remote identifiers can be strings or numbers,
category and guide identifiers can be null, and archive durations can change
type between responses. Those inconsistencies are normalized only inside the
Xtream adapter.

## Tables

- `sources`: one configured remote catalog and its adapter key. The endpoint is
  credential-free; credentials belong in a future encrypted secret service.
- `sync_runs`: durable success/failure history and observed record counts.
- `collections`: provider collections such as channel groups. Parent
  collections and source order are preserved.
- `catalog_items`: internal canonical records. They do not contain provider
  identifiers and may later be shared by multiple source records.
- `source_items`: the mapping from a remote identifier to a canonical item,
  including the provider's current name, artwork, order, and availability.
- `source_channel_details`: normalized channel-only capabilities such as guide
  identity, adult classification, and catch-up window.
- `collection_items`: many-to-many membership between collections and source
  items.

The schema is ready for another adapter to emit the same catalog snapshot.
Movie and series kinds are reserved in the domain, but they are not synchronized
yet because their detailed metadata and episode lifecycle need a separate design.

## Reconciliation

Each run records its start before contacting the provider. The adapter returns a
complete snapshot for one or more content kinds. The repository then:

1. Upserts collections, canonical items, source mappings, and channel details.
2. Replaces collection membership for only the synchronized content kinds.
3. Marks records not observed during the successful snapshot inactive.
4. Records counts and advances the source's last successful synchronization.

Missing records are not deleted. This preserves stable identifiers for future
favorites, history, and cross-provider matching. A failed or partial run never
deactivates unseen records and stores only a sanitized error classification.

Kysely generates all bulk upsert SQL. Statements are kept below D1's bound
parameter limit and submitted through D1 `batch()` to avoid one Worker
subrequest per channel.

## Intentionally Not Stored

- Usernames, passwords, activation codes, or URLs containing credentials.
- Constructed playback URLs or provider `direct_source` values.
- Entire raw provider responses.
- EPG programs, because their update cadence and retention differ from catalog
  synchronization.
- VOD details, series seasons, and episodes.

The next backend step is encrypted source credentials plus a controlled command
or scheduled trigger that calls `synchronizeXtreamSource`. User/source access
can be added with the authentication model without changing catalog ownership.
