# Developer docs

| Document | Purpose |
|---|---|
| [API.md](API.md) | Static JSON API, entry shape and `jq` examples |
| [MCP.md](MCP.md) | MCP server configuration, tools and resources |
| [TRIAGE.md](TRIAGE.md) | Static triage CLI, detections and limits |
| [PUBLISHING.md](PUBLISHING.md) | Publish a fork or your own copy, Pages, custom domain and upstream sync |
| [../schema/data.schema.json](../schema/data.schema.json) | JSON Schema for `data.json` |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | How to add an entry |

## Commands

```bash
node scripts/build.mjs --offline   # regenerate README, llms.txt, report.json, SVGs
node scripts/build.mjs --check     # validate data and generated files (CI)
node scripts/site.mjs              # build _site/, including the JSON API
node scripts/triage.mjs <file>     # static runtime triage
node scripts/mcp.mjs               # MCP server over stdio
node scripts/health.mjs            # graveyard and maintenance candidates
node --test scripts/test.mjs       # schema, API, triage, MCP and site tests
npm run verify                     # check, tests and a full site build
```

No dependencies and no package install are required. Node 22 or newer.

## Layout

```
data.json                 editorial source of truth
data/meta.json            weekly GitHub metadata
schema/data.schema.json   JSON Schema for data.json
lib/                      shared model, search, triage, health, safety and site identity
scripts/build.mjs         Markdown, llms.txt, report and SVG renderer
scripts/site.mjs          static site and JSON API renderer
scripts/api.mjs           API payload builder
scripts/triage.mjs        triage CLI
scripts/health.mjs        graveyard and maintenance report
scripts/mcp.mjs           MCP server
scripts/test.mjs          node:test suite
docs/                     developer and integration docs
```
