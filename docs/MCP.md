# MCP server

`scripts/mcp.mjs` serves the catalogue over the Model Context Protocol on stdio.
It has no dependencies, makes no network requests and never writes to disk. It
does not read the binary you are analysing: the client passes a runtime or a
query, and the server returns entries.

## Configure a client

Claude Desktop, Cursor, VS Code and other MCP clients accept a command and args.
Replace `<repo>` with the absolute path to this repository.

```json
{
  "mcpServers": {
    "awesome-reverse-engineering": {
      "command": "node",
      "args": ["<repo>/scripts/mcp.mjs"]
    }
  }
}
```

On Windows, use the absolute path with forward slashes or escaped backslashes,
for example `D:/projects/awesome-reverse-engineering/scripts/mcp.mjs`.

Run it by hand to check the handshake:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node scripts/mcp.mjs
```

## Tools

| Tool | Arguments | Returns |
|---|---|---|
| `search_tools` | `query`, `category`, `cost`, `flag`, `tag`, `free`, `warning`, `limit` | Matching entries with official URLs |
| `get_tool` | `name` (name or slug) | One entry: cost, flags, maintenance, tags, alternatives |
| `list_categories` | none | 19 categories with ids and counts |
| `recommend_toolchain` | `runtime` | Tools for a detected runtime, following "Triage by Runtime" |
| `list_alternatives` | `name`, `limit` | Other entries in the same category |
| `get_safety_guidance` | none | The five safety rules and the legal note |
| `get_stats` | none | Entries, categories, flagged, stale and free counts |

`runtime` accepts detector ids: `wasm`, `dex`, `android`, `ios`, `java`, `jar`,
`hermes`, `react-native`, `pyinstaller`, `python`, `unity`, `flutter`, `dotnet`,
`electron`, `go`, `rust`, `godot`, `lua`, `firmware`, `archive`, `packed`, `elf`,
`pe`, `macho`, `javascript`, `har`, `evm`, `text`, `unknown`.

## Resources

| URI | Content |
|---|---|
| `awesome-re://catalog` | Every entry as JSON |
| `awesome-re://safety` | Safety rules and legal note |
| `awesome-re://category/<id>` | One category, for example `android` |
| `awesome-re://tool/<slug>` | One tool, for example `ghidra` |

## Example prompts

- "Which free tools can inspect an Android APK without running it?"
- "I have a Go binary; what should I open first, and which flags mean I need a VM?"
- "Compare Ghidra, IDA Pro and Binary Ninja for a team with no budget."
- "Find a maintained alternative to RetDec."
- "What are the safety rules for analysing a hostile sample?"

## Safety posture

- Runs inside the same trust boundary as the client. Put the repository and the
  client inside the lab VM when you analyse hostile files.
- Returns catalogue data only; it does not execute tools.
- Prompt injection is still possible through the client's other tools. Keep
  approvals on and verify model claims against the disassembly.
- The server writes one startup line to stderr. stdout carries JSON-RPC only.

## Exit codes and logs

The process exits when stdin closes. Protocol errors are returned as JSON-RPC
errors (`-32601` for an unknown method, `-32602` for bad arguments). No log file
is written.
