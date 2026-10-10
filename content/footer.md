## 🗺️ A 12-Week Path

| Weeks | Goal | Do |
|-------|------|----|
| 1-2 | Lab built; C to assembly | Build an isolated VM. Compile your own small C programs at -O0 and -O2 and read them in [Compiler Explorer](https://godbolt.org/) and Ghidra. pwn.college Computing 101. |
| 3-4 | x86-64, the ABI, ELF and PE | OST2 Arch1001 and Dbg1102. The SysV and Microsoft x64 calling conventions. *Practical Binary Analysis* chapters 2-3. |
| 5-6 | First challenges | OverTheWire Leviathan, picoGym reversing, Microcorruption, then crackmes.one level 1 in the VM. |
| 7-8 | A domain you care about | EVM bytecode with heimdall and EVMole, Android with JADX, or firmware with unblob. |
| 9-10 | Audit your own software | Unpack your own APK, Electron app or firmware the way an outsider would, then fix what leaks. |
| 11-12 | AI-assisted, verified | Re-solve earlier challenges with an MCP server inside the VM and check every claim against disassembly and a debugger run. |

## 💡 Craft

**Rookie mistakes:** treating decompiler output as truth; reading from `main` line by line; hand-reversing statically linked libraries (label them with Function ID, FLIRT or BSim); default names everywhere; no notes; missing the easy way in (source maps, symbols, plain JS in an asar); wrong firmware load address; running targets on the host; believing AI summaries unchecked.

**Pro moves:** fifteen minutes of triage by runtime; start from an anchor (string, import, constant) and walk cross-references backwards; use the debugger to answer one question; diff two builds; fix types and structs first; identify crypto by constants with capa; compile your own code to learn compiler idioms; script early; capture traffic first; recompile your reconstruction and test it against the original.

## 🧰 Recipes

**Look up a file by hash without uploading it**
```bash
sha256sum sample.bin
curl -s -H "x-apikey: $VT_API_KEY" https://www.virustotal.com/api/v3/files/<sha256>
```

**Sanitize a HAR before sharing it or giving it to an agent**
```bash
jq '(.log.entries[] | .request.headers, .response.headers) |= map(select(.name | test("^(cookie|set-cookie|authorization|proxy-authorization|x-api-key|x-auth-token)$"; "i") | not)) | (.log.entries[] | .request.cookies, .response.cookies) |= []' in.har > clean.har
```
Then search `clean.har` for tokens left in URLs, query strings or bodies.

**Find a proxy's implementation from raw storage (ERC-1967, read-only)**
```bash
cast storage $ADDR 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc --rpc-url $RPC
```

**Build your own first targets**
```bash
gcc -O0 -g -o prog-O0 prog.c && gcc -O2 -o prog-O2 prog.c && strip prog-O2
```
Reverse the stripped -O2 build, then check your answer against the source.

## 🔗 Related Awesome Lists

| List | Description |
|------|-------------|
| [awesome-OSINT](https://github.com/edwardtay/awesome-OSINT) | Open-source intelligence tools, including threat intel and malware OSINT. |
| [awesome-prompt-injection](https://github.com/edwardtay/awesome-prompt-injection) | Attacks and defences for LLM agents, relevant once agents read hostile binaries. |
| [awesome-crypto-investigation](https://github.com/edwardtay/awesome-crypto-investigation) | On-chain tracing and exploit analysis. |
| [awesome-drones](https://github.com/edwardtay/awesome-drones) | Drone firmware, flight controllers and security. |
| [awesome-scrapers](https://github.com/edwardtay/awesome-scrapers) | Collection tooling for web data. |

## Contributing

Contributions welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Add entries to [`data.json`](data.json), not the README; `node scripts/build.mjs` regenerates it.

- One sentence per entry, ending with a period, saying when the tool is the right choice.
- Link the official repository or site, never a mirror.
- Set the safety flags honestly: `runs`, `cloud`, `impersonated`.
- No tools whose main purpose is cracking licences, bypassing DRM or cheating in online games.

## License

[CC0 1.0](LICENSE). Listed projects keep their own licences.
