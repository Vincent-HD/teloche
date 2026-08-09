# Teloche

Teloche is an alternative IPTV client, based on the behavior observed in the
reference APKs in this repository.

The application code has intentionally been reset. We are rebuilding it one
small decision at a time, starting with the meaning and validation of a single
Xtream source. The first design step is in
[`docs/00-xtream-source.md`](docs/00-xtream-source.md).

The retained discovery material is in [`notes/`](notes/), with the unofficial
Xtream API draft in [`openapi/xtream-compatible.yaml`](openapi/xtream-compatible.yaml).

## Development environment

The agreed Nix + direnv + Nub environment remains available:

```sh
direnv allow
nix develop ./.nix
```

No application dependency installation is needed yet. We will add it only when
the first implementation step has been agreed.
