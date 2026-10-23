# Changelog

Editorial changes only. Weekly star and activity refreshes are not listed.

## 2026-10-22

- Added a static JSON API under `api/`, an MCP server (`scripts/mcp.mjs`), a static triage CLI (`scripts/triage.mjs`) and a page per tool.
- Added `schema/data.schema.json` and a `node:test` suite covering the dataset, API, triage and MCP handshake.
- Added a read-only health report for graveyard and maintenance candidates, and made the site identity configurable for forks (`SITE_BASE`, `SITE_REPO`, `SITE_AUTHOR`, `SITE_AUTHOR_URL`); see `docs/PUBLISHING.md`.
- Builds are now byte-stable on Windows checkouts: generated files use LF and content line endings are normalised.

## 2026-10-10

- Initial release: 135 entries across 19 categories, each reviewed for execution and disclosure risk.
- Added Binary Formats & Hex Editors and Memory & Process Analysis categories.
- Flagged RetDec (limited maintenance mode, per its README) and moved Cloudflare har-sanitizer (archived April 2026), de4dot, class-dump and dex2jar to the Graveyard.
- MCP comparison table with transport and high-impact capabilities.
