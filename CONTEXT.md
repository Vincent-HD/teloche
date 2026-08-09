# Teloche Domain Vocabulary

This file contains only domain language. It is intentionally free of framework,
database, and deployment details.

## Source

A source is a connection configured by a Teloche user to obtain television
content from one provider. A source has a human-readable name and identifies
the provider protocol it uses.

## Xtream source

An Xtream source is a source that communicates with an Xtream-compatible
provider using the provider's API and stream conventions.

## Provider

A provider is the external service that supplies content and access to it.
Teloche treats the provider's protocol as an external boundary rather than as
the application's domain model.

## Source credentials

Source credentials are the private information required by a provider to
authorize a source. They are part of the source's access configuration, but the
domain does not define how they are stored or transported.

## Source validation

Source validation is the act of checking that a source's endpoint and access
configuration can successfully communicate with the claimed provider.

Validation produces a safe result about the source. It never makes the source's
private credentials part of that result.
