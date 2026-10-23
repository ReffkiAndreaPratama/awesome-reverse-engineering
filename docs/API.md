# JSON API

The website publishes a static, read-only API under `api/`. It is generated from
`data.json` and `data/meta.json` by `scripts/site.mjs`, so it cannot disagree with
the README. There is no server process, no authentication and no rate limit.

Base URL (GitHub Pages): `https://edwardtay.github.io/awesome-reverse-engineering/api/`

| Endpoint | Payload |
|---|---|
| `index.json` | Counts, flags, maintenance meaning, endpoints and categories with counts |
| `entries.json` | Every entry with cost model, flags, maintenance, tags and links |
| `search-index.json` | Compact index for client-side search and filters |
| `c/<id>.json` | One category and its entries, for example `c/android.json` |
| `tools/<slug>.json` | One tool plus related tools, for example `tools/ghidra.json` |
| `schema.json` | JSON Schema for a single entry object |

Slugs are lowercase, ASCII and derived from the tool name:
`@electron/asar` becomes `electron-asar`, `IDA MCP (official)` becomes
`ida-mcp-official`. Use `entries.json` or `search-index.json` to discover them.

## Entry shape

```json
{
  "slug": "ghidra",
  "name": "Ghidra",
  "url": "https://ghidra-sre.org/",
  "description": "NSA's decompiler with scripting, BSim similarity search and a team server. ...",
  "category": { "id": "disasm", "name": "Disassemblers & Decompilers" },
  "cost": { "label": "Free", "model": "free", "free": true, "freeTier": true },
  "flags": [{ "id": "runs", "label": "Runs code", "symbol": "▶", "meaning": "..." }],
  "maintenance": {
    "status": "ok",
    "warning": false,
    "note": "",
    "lastPush": "2026-10-19",
    "stars": 91263,
    "archived": false
  },
  "tags": ["disassembler", "decompiler", "debugger", "binary-diff"],
  "repo": "NationalSecurityAgency/ghidra",
  "reviewed": "2026-10-10",
  "refreshed": "2026-10-19",
  "links": {
    "page": "https://edwardtay.github.io/awesome-reverse-engineering/t/ghidra/",
    "api": "https://edwardtay.github.io/awesome-reverse-engineering/api/tools/ghidra.json",
    "source": "https://ghidra-sre.org/"
  }
}
```

`cost.model` is one of `free`, `freemium`, `paid`, `mixed` or `unknown`.
`maintenance.status` is one of `ok`, `stale`, `archived`, `declared` or `unknown`.
Tags are derived from the name, description and category; they are search aids,
not editorial claims.

## Search index keys

`search-index.json` is deliberately small:

| Key | Meaning |
|---|---|
| `s` | slug |
| `n` | name |
| `u` | official URL |
| `d` | description |
| `c` | category id |
| `t` | tags |
| `f` | flag ids |
| `w` | maintenance warning (`true` or `false`) |
| `p` | cost model |
| `free` | has a free tier |
| `stars` | GitHub stars, or `null` |

Example: list free Android tools that do not execute code.

```bash
curl -s https://edwardtay.github.io/awesome-reverse-engineering/api/search-index.json \
  | jq -r '.entries[] | select(.c == "android" and .free and (.f | index("runs") | not)) | "\(.n) — \(.u)"'
```

Example: every entry with a maintenance warning.

```bash
curl -s https://edwardtay.github.io/awesome-reverse-engineering/api/entries.json \
  | jq -r '.entries[] | select(.maintenance.warning) | "\(.name): \(.maintenance.note)"'
```

## Freshness

`generated` is the last GitHub metadata refresh date, not the time of the request.
Editorial fields (`description`, `cost`, `flags`) change only when a human edits
`data.json`; the reviewed date is in `reviewed`.

## Regenerate locally

```bash
node scripts/site.mjs     # writes _site/, including _site/api/
node --test scripts/test.mjs
```

The API is not written by `scripts/build.mjs`; that script owns the README,
`llms.txt`, `report.json` and the SVG assets.
