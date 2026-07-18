# Batch D1 catalog writes within statement limits

Catalog synchronization can involve thousands of provider records. We compile
Kysely bulk upserts into multi-row statements that stay within D1's bound
parameter limit, then submit those statements through the native D1 `batch()`
API. This avoids both an oversized SQL statement and one Worker/D1 call per
record while preserving Kysely's typed query construction.

## Considered Options

- Execute one Kysely upsert per record: simple, but creates thousands of D1
  calls for a full catalog snapshot.
- Execute one multi-row upsert per table: minimizes calls, but exceeds D1's
  bound parameter limit for realistic catalogs.
- Compile parameter-safe Kysely chunks and use D1 `batch()`: keeps statements
  valid and reduces database round trips.

## Consequences

Chunk sizes must account for the number of bound columns in each statement.
The repository owns this D1-specific execution optimization; catalog providers
and domain models remain unaware of it.
