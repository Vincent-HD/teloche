# TODO

This is the active implementation queue. Keep it current when work starts,
changes scope, or completes.

## Next

- [ ] Replace the trusted development user header with real authentication and
  TV device pairing.
- [ ] Add household invitations, roles, and device registration.
- [ ] Add controlled source synchronization triggers, then scheduling, retry,
  backoff, and observability.
- [ ] Build the first TV vertical slice: authenticate or pair, browse a source,
  select a channel, and play the returned descriptor.

## Catalog And Playback

- [ ] Synchronize EPG/XMLTV data with a separate retention and refresh policy.
- [ ] Add VOD, series, seasons, and episodes to the adapter and catalog model.
- [ ] Define canonical cross-source matching using guide IDs, metadata, and
  explicit overrides.
- [ ] Add favorites, watch history, profile preferences, and parental controls.
- [ ] Add proxy playback as an optional mode for sources whose credentials must
  not reach TV clients.
- [ ] Extend playback descriptors for subtitles, audio tracks, DRM, timeshift,
  stream headers, and diagnostics.

## Operations And Security

- [ ] Define master-key rotation and re-encryption operations using credential
  envelope key IDs.
- [ ] Choose production authentication/session storage and rate limits.
- [ ] Add audit events for source changes and credential access operations.
- [ ] Add production dashboards and alerts for failed source validation and
  synchronization.

## Provider Support

- [ ] Add M3U plus XMLTV as a provider adapter.
- [ ] Assess Stalker/MAG as a later adapter.
- [ ] Add provider capability discovery so the TV app can adapt without
  depending on provider-specific names.
