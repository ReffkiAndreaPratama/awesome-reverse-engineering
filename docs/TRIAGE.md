# Triage CLI

`scripts/triage.mjs` identifies an unknown file from its bytes and strings, then
prints the toolchain this list recommends. It is static: the sample is never
executed or uploaded.

```bash
node scripts/triage.mjs sample.bin
node scripts/triage.mjs sample.apk --json
node scripts/triage.mjs --stdin < sample.bin
```

## Output

```
Triage: sample.bin
  Size       1,234,567 bytes
  SHA-256    9f2c...
  Detected   Go binary  (high confidence)
  Evidence   Go runtime marker

Recommended toolchain
  - GoReSym (Free)
    Go: recovers function names, types and build info from stripped binaries.
    https://github.com/mandiant/GoReSym
  ...
```

`--json` prints the same report as one object, suitable for a pipeline. Fields:
`file`, `size`, `sha256`, `truncated`, `runtime`, `label`, `confidence`,
`evidence`, `matches`, `tools`, `steps`, `needsVm`, `sendsCode`.

Exit codes: `0` when a runtime was identified, `1` when the result is `unknown`,
`2` for a usage or read error. The triage result is a heuristic, not a verdict.

## What it looks for

| Group | Markers |
|---|---|
| Containers | ELF, PE, Mach-O, WebAssembly, DEX, Java class, Lua, Hermes bytecode |
| Archives | ZIP, gzip, xz, zstd, 7z, RAR, tar |
| Runtimes | Go, Rust, .NET/CLR, Python, PyInstaller, Flutter/Dart, Unity IL2CPP, Electron, Godot, React Native Hermes |
| Mobile | APK (`AndroidManifest.xml` + `classes.dex`), IPA (`Payload/*.app/`) |
| Embedded | squashfs, UBI, Android boot image, device tree blob, uImage, cramfs |
| Packers | UPX, VMProtect, Themida |
| Web and EVM | JavaScript bundles, HAR captures, Solidity/ABI, EVM init bytecode |

Specific runtime markers outrank the container: a Go binary is reported as Go,
not just ELF, because the runtime decides the toolchain. `.exe`, `.apk` and
similar extensions are weak hints and only used when the content is inconclusive.

## Limits

- Reads at most 8 MiB by default (`--max=N` to change). Strings after that point
  are not seen, and `truncated` is set in the JSON.
- Hashes the whole file for `sha256`; `--stdin` hashes only the bytes it read.
- Does not unpack archives; use unblob or binwalk, then re-run triage on the
  extracted files.
- No detection is authoritative. Confirm with Detect It Easy and a debugger run
  inside the VM.
- The CLI never sends the hash or the sample anywhere. Look hashes up locally
  before sharing them.
