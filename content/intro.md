## 🧭 How to Choose

| I need to... | Start here |
|---|---|
| Learn reversing from zero | [Learn](#-learn), then [Practice Targets](#-practice-targets) |
| Identify an unknown file and what it can do | [Identify & Triage](#-identify--triage) |
| Read a file format or patch bytes | [Binary Formats & Hex Editors](#-binary-formats--hex-editors) |
| Read native code | [Disassemblers & Decompilers](#-disassemblers--decompilers) |
| Watch a program run | [Debuggers](#-debuggers), [Instrumentation & Emulation](#-instrumentation--emulation) |
| Handle Go, Flutter, Unity, React Native, Python, Electron or wasm | [Language Runtimes & Packagers](#-language-runtimes--packagers) |
| Look inside an APK or a .NET assembly | [Android & Java](#-android--java), [.NET](#-net) |
| Find what changed between two versions | [Binary Diffing](#-binary-diffing) |
| Extract and audit device firmware | [Firmware & Embedded](#-firmware--embedded) |
| Check a contract or token before using it | [Smart Contracts & EVM](#-smart-contracts--evm) |
| Let an AI agent drive the decompiler | [AI-Assisted RE & MCP Servers](#-ai-assisted-re--mcp-servers) |
| Set up a safe place to do all this | [Safety First](#-safety-first), [Lab & Isolation](#-lab--isolation) |

## 🚦 Flags

| Flag | Meaning |
|------|---------|
| ▶️ | Executes or emulates target code, or loads third-party plugins and scripts. Use inside an isolated VM. |
| ☁️ | Sends your binary or code to a third party when used as documented (hosted service or remote model). |
| 🎭 | Lookalike download sites or trojanised builds have been reported. Use the linked official source only. |
| ⚠️ | Archived, no push in over a year, or the maintainers declare limited maintenance. |
| (none) | Reviewed on {{REVIEWED}}; none of the above known. Any parser of hostile input can have bugs, so the VM rule still applies. |

## 🔐 Safety First

The tools in this list parse hostile input, and analysts are targeted directly.

1. **Analyse in a full VM.** No network or a host-only network with no route out, no shared folders, clipboard or drag and drop, no keys, tokens or wallets, and a clean snapshot you revert after every session. WSL2 runs Linux in a lightweight VM that all your WSL distros share and that is wired into Windows (mounted drives, interop), so it is not a separate lab. Plain containers share the host kernel.
2. **Download from the official source only.** Documented cases: a trojanised cracked IDA Pro 7.5 (ESET, 2021), fake dnSpy repositories (2022), and 100+ lookalike sites for Ghidra, dnSpy and ILSpy pushing a wallet-stealing payload ([Check Point, 2026](https://research.checkpoint.com/2026/impersonation-click-hijacking-and-tds-inside-a-malware-distribution-ecosystem/)). Known fakes: `ghidralite.com`, `dnspy.org`, `dnspy.net`, `ilspy.org`.
3. **Treat project files and proof-of-concept repos as code.** Researchers were compromised by shared Visual Studio projects ([Google TAG, 2021](https://blog.google/threat-analysis-group/new-campaign-targeting-security-researchers/)), a crafted IDA database could run code until IDA 9.3sp2 ([Calif, 2026](https://calif.io/research/ida-pro)), and fake CVE PoCs pulled a malicious PyPI dependency ([ChocoPoC, 2026](https://www.yeswehack.com/news/chocopocs-vulnerability-researchers-trojanised-exploits)).
4. **Look up hashes; do not upload.** Public scanners share uploaded files with paying customers. Hash locally and search by hash.
5. **Agents read hostile text.** Strings inside a binary can carry instructions aimed at an AI analyst ([Check Point, 2025](https://research.checkpoint.com/2025/ai-evasion-prompt-injection/)). Keep approval prompts on, run MCP servers inside the VM, and verify every model claim against the disassembly.

Only analyse what you own, open-source code, CTF and crackme binaries released for analysis, or targets under written authorisation. Decompilation law varies by country; see the EU Software Directive Art. 6, US 17 USC 1201(f) and your local copyright and computer-crime laws.

## ⚡ Triage by Runtime

The language runtime decides the toolchain. Check this before opening a disassembler.

| If `file`, strings or Detect It Easy show... | It is probably | Reach for |
|---|---|---|
| `Go build ID`, `runtime.gopanic` | Go | [GoReSym](https://github.com/mandiant/GoReSym), then Ghidra or IDA |
| `libapp.so` + `libflutter.so` | Flutter (Dart AOT) | [blutter](https://github.com/worawit/blutter) |
| `global-metadata.dat`, `GameAssembly` | Unity IL2CPP | [Il2CppDumper](https://github.com/Perfare/Il2CppDumper), [Cpp2IL](https://github.com/SamboyCoding/Cpp2IL) |
| `index.android.bundle` with Hermes magic | React Native Hermes | [hermes-dec](https://github.com/P1sec/hermes-dec) |
| `PYZ`, `_MEIPASS` | PyInstaller | [pyinstxtractor](https://github.com/extremecoders-re/pyinstxtractor), [pycdc](https://github.com/zrax/pycdc) |
| `resources/app.asar` | Electron | [@electron/asar](https://github.com/electron/asar) extract, then read JS |
| magic `\0asm` | WebAssembly | [WABT](https://github.com/WebAssembly/wabt) |
| CLR header, `mscorlib` | .NET | [ILSpy](https://github.com/icsharpcode/ILSpy) |
| `classes.dex` | Android | [JADX](https://github.com/skylot/jadx) |
| `.pck`, Godot strings | Godot | [GDRE Tools](https://github.com/GDRETools/gdsdecomp) |
| `.js.map` next to a bundle | Shipped source maps | Read the original source in DevTools |
| Rust panic strings, `core::fmt` | Rust | Ghidra or IDA with Rust demangling |
| None of the above | Native C or C++ | [Disassemblers & Decompilers](#-disassemblers--decompilers) |
