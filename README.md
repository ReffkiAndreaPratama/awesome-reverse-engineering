# Awesome Reverse Engineering [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

[![Refresh](https://img.shields.io/github/actions/workflow/status/edwardtay/awesome-reverse-engineering/refresh.yml?label=weekly%20refresh)](https://github.com/edwardtay/awesome-reverse-engineering/actions/workflows/refresh.yml)
[![Links](https://img.shields.io/github/actions/workflow/status/edwardtay/awesome-reverse-engineering/links.yml?label=links)](https://github.com/edwardtay/awesome-reverse-engineering/actions/workflows/links.yml)
[![Last Commit](https://img.shields.io/github/last-commit/edwardtay/awesome-reverse-engineering)](https://github.com/edwardtay/awesome-reverse-engineering/commits/main)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/edwardtay/awesome-reverse-engineering/pulls)
[![License: CC0](https://img.shields.io/badge/License-CC0-lightgrey.svg)](LICENSE)

> Reverse engineering tools and learning resources for binaries, apps, firmware and smart contracts, with live maintenance data, a safety flag on every entry, and the agent-era tooling (MCP servers, AI decompilers) alongside the classics.

**110 entries · refreshed 2026-10-10 · 5 flagged for maintenance**

## What makes this list different

- **Live data.** Stars, last push and archive status refresh weekly from the GitHub API ([`data.json`](data.json) is the source; the README is generated). Stale or archived projects get ⚠️ automatically, and dead ones move to the [Graveyard](#-graveyard).
- **A safety flag on every entry.** Reverse engineers are a target: fake tool download sites, trojanised cracked disassemblers and booby-trapped project files are all documented. Each row says whether the tool runs code, uploads your binary to a third party, or is commonly impersonated.
- **Agent era included.** MCP servers for every major engine, AI-assisted plugins and open decompilation models, each with the caveat that matters.
- **Best in class first.** Each category leads with the tool most practitioners reach for, then the strongest free option. Fewer links, each one checked.
- **Machine-readable.** [`data.json`](data.json) and [`llms.txt`](llms.txt) for scripts and AI assistants.

### Legend

| Flag | Meaning |
|------|---------|
| ▶️ | Runs the target or third-party code (plugins, scripts, emulation). Use inside an isolated VM. |
| ☁️ | Sends your binary or code to a third-party service. Keep confidential code out. |
| 🎭 | Commonly impersonated by malicious download sites. Use the linked official source only. |
| ⚠️ | Archived, or no push in over a year. |

## How to Choose

| I need to... | Start here |
|---|---|
| Learn reversing from zero | [Learn](#-learn), then [Practice Targets](#-practice-targets) |
| Identify an unknown file and what it can do | [Identify & Triage](#-identify--triage) |
| Read native code | [Disassemblers & Decompilers](#-disassemblers--decompilers) |
| Watch a program run | [Debuggers](#-debuggers) or [Instrumentation & Emulation](#-instrumentation--emulation) |
| Handle Go, Flutter, Unity, React Native, Python, Electron or wasm | [Language Runtimes & Packagers](#-language-runtimes--packagers) |
| Look inside an APK or a .NET assembly | [Android & Java](#-android--java), [.NET](#-net) |
| Find what changed between two versions | [Binary Diffing](#️-binary-diffing) |
| Extract and audit device firmware | [Firmware & Embedded](#-firmware--embedded) |
| Check a contract or token before using it | [Smart Contracts & EVM](#️-smart-contracts--evm) |
| Let an AI agent drive the decompiler | [AI-Assisted RE & MCP Servers](#-ai-assisted-re--mcp-servers) |
| Set up a safe place to do all this | [Safety First](#️-safety-first) and [Lab & Isolation](#-lab--isolation) |

## 🛡️ Safety First

The tools in this list parse hostile input, and analysts are targeted directly. Five rules:

1. **Analyse in a full VM.** No network (or host-only), no shared folders, clipboard or drag and drop, no keys, tokens or wallets, and a clean snapshot you revert after every session. WSL2 and plain containers share a kernel with other workloads and are weak isolation.
2. **Download from the official source only.** Documented cases: a trojanised cracked IDA Pro 7.5 (ESET, 2021), fake dnSpy repositories (2022), and 100+ lookalike sites for Ghidra, dnSpy and ILSpy pushing a wallet-stealing payload ([Check Point, 2026](https://research.checkpoint.com/2026/impersonation-click-hijacking-and-tds-inside-a-malware-distribution-ecosystem/)). Known fakes: `ghidralite.com`, `dnspy.org`, `dnspy.net`, `ilspy.org`.
3. **Treat project files and proof-of-concept repos as code.** Researchers were compromised by shared Visual Studio projects ([Google TAG, 2021](https://blog.google/threat-analysis-group/new-campaign-targeting-security-researchers/)), a crafted IDA database could run code until IDA 9.3sp2 ([Calif, 2026](https://calif.io/research/ida-pro)), and fake CVE PoCs pulled a malicious PyPI dependency ([ChocoPoC, 2026](https://www.yeswehack.com/news/chocopocs-vulnerability-researchers-trojanised-exploits)).
4. **Look up hashes; do not upload.** Public scanners share uploaded files with paying customers. Hash locally and search by hash.
5. **Agents read hostile text.** Strings inside a binary can carry instructions aimed at an AI analyst ([Check Point, 2025](https://research.checkpoint.com/2025/ai-evasion-prompt-injection/)). Keep approval prompts on, run MCP servers inside the VM, and verify every model claim against the disassembly.

Only analyse what you own, open-source code, CTF and crackme binaries released for analysis, or targets under written authorisation. Decompilation law varies by country; see the EU Software Directive Art. 6, US 17 USC 1201(f) and your local copyright and computer-crime laws.

## ⚡ Triage by Runtime

The language runtime decides the toolchain. Check this before opening a disassembler.

| If `file`, strings or DIE show... | It is probably | Reach for |
|---|---|---|
| `Go build ID`, `runtime.gopanic` | Go | [GoReSym](https://github.com/mandiant/GoReSym), then Ghidra or IDA |
| `libapp.so` + `libflutter.so` | Flutter (Dart AOT) | [blutter](https://github.com/worawit/blutter) |
| `global-metadata.dat`, `GameAssembly` | Unity IL2CPP | [Il2CppDumper](https://github.com/Perfare/Il2CppDumper) |
| `index.android.bundle` starting with Hermes magic | React Native Hermes | [hermes-dec](https://github.com/P1sec/hermes-dec) |
| `PYZ`, `_MEIPASS` | PyInstaller | [pyinstxtractor](https://github.com/extremecoders-re/pyinstxtractor), [pycdc](https://github.com/zrax/pycdc) |
| `resources/app.asar` | Electron | [@electron/asar](https://github.com/electron/asar) extract, then read JS |
| `.wasm` magic `\0asm` | WebAssembly | [WABT](https://github.com/WebAssembly/wabt) |
| CLR header, `mscorlib` | .NET | [ILSpy](https://github.com/icsharpcode/ILSpy) |
| `classes.dex` | Android | [JADX](https://github.com/skylot/jadx) |
| `.pck`, Godot strings | Godot | [GDRE Tools](https://github.com/GDRETools/gdsdecomp) |
| `.js.map` next to a bundle | Shipped source maps | Read the original source in DevTools |
| Rust panic strings, `core::fmt` | Rust | Ghidra or IDA with Rust demangling |
| None of the above | Native C or C++ | [Disassemblers & Decompilers](#-disassemblers--decompilers) |

## Contents

- [🛡️ Safety First](#️-safety-first)
- [⚡ Triage by Runtime](#-triage-by-runtime)
- [🔎 Identify & Triage](#-identify--triage)
- [🧠 Disassemblers & Decompilers](#-disassemblers--decompilers)
- [🐞 Debuggers](#-debuggers)
- [🪝 Instrumentation & Emulation](#-instrumentation--emulation)
- [🧮 Analysis Frameworks & Libraries](#-analysis-frameworks--libraries)
- [↔️ Binary Diffing](#️-binary-diffing)
- [📱 Android & Java](#-android--java)
- [🟪 .NET](#-net)
- [🍎 iOS & macOS](#-ios--macos)
- [📦 Language Runtimes & Packagers](#-language-runtimes--packagers)
- [🌐 Web, JS & Protocols](#-web-js--protocols)
- [📟 Firmware & Embedded](#-firmware--embedded)
- [⛓️ Smart Contracts & EVM](#️-smart-contracts--evm)
- [🦾 AI-Assisted RE & MCP Servers](#-ai-assisted-re--mcp-servers)
- [🧪 Lab & Isolation](#-lab--isolation)
- [📚 Learn](#-learn)
- [🎯 Practice Targets](#-practice-targets)
- [🪦 Graveyard](#-graveyard)
- [🗺️ A 12-Week Path](#️-a-12-week-path)
- [💡 Craft](#-craft)
- [🧰 Recipes](#-recipes)

## 🔎 Identify & Triage

First fifteen minutes on any file: what is it, what built it, is it packed, what can it do.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [Detect It Easy](https://github.com/horsicq/Detect-It-Easy) | 12k | 2026-10 | Free |  | Identifies compiler, linker, packer and protector for PE, ELF and Mach-O files. |
| [capa](https://github.com/mandiant/capa) | 6.2k | 2026-10 | Free |  | Names what a binary can do (encrypt, network, persist) from rules; points you to the functions that do it. |
| [FLOSS](https://github.com/mandiant/flare-floss) | 4.2k | 2026-10 | Free |  | Extracts obfuscated and stack-built strings that plain `strings` misses. |
| [YARA-X](https://github.com/VirusTotal/yara-x) | 1.3k | 2026-10 | Free |  | Rust successor to YARA for pattern-matching rules; turn findings into reusable detections. |
| [PE-bear](https://github.com/hasherezade/pe-bear) | 3.8k | 2026-10 | Free |  | Fast PE header and section viewer for first looks at Windows binaries. |
| [XELFViewer](https://github.com/horsicq/XELFViewer) | 1.6k | 2026-10 | Free |  | ELF header, section and segment viewer. |
| [checksec](https://github.com/slimm609/checksec) | 2.4k | 2026-09 | Free |  | Reports RELRO, canaries, NX, PIE and FORTIFY; now written in Go (`checksec file <bin>`). |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🧠 Disassemblers & Decompilers

The engines everything else plugs into.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [Ghidra](https://github.com/NationalSecurityAgency/ghidra) | 82k | 2026-10 | Free | 🎭 | NSA's decompiler with scripting, BSim similarity search and a team server. Many 2026 advisories: stay on the latest release. |
| [IDA Pro](https://hex-rays.com/) |  | site | Paid · Free tier | ☁️ 🎭 | Industry standard. Free, Home and Pro Essential decompile in the cloud; never use cracked builds. |
| [Binary Ninja](https://binary.ninja/) |  | site | Paid · Free tier |  | Layered intermediate languages that suit scripting; the free edition includes a local MCP server and debugger. |
| [radare2](https://github.com/radareorg/radare2) | 25k | 2026-10 | Free | ▶️ | Scriptable command-line framework for quick triage and automation. |
| [Rizin](https://github.com/rizinorg/rizin) | 3.9k | 2026-10 | Free |  | radare2 fork focused on usability and a stable API. |
| [Cutter](https://github.com/rizinorg/cutter) | 20k | 2026-09 | Free |  | Rizin GUI with the Ghidra decompiler built in. |
| [Hopper](https://www.hopperapp.com/) |  | site | Paid |  | Affordable disassembler for macOS and Linux with strong Mach-O and Objective-C support. |
| [RetDec](https://github.com/avast/retdec) | 8.6k | 2026-05 | Free |  | LLVM-based retargetable decompiler. |
| [Decompiler Explorer](https://github.com/decompiler-explorer/decompiler-explorer) | 2.7k | 2026-10 | Free | ☁️ | Runs one small binary through many decompilers side by side (dogbolt.org). Uploads are kept and shared with tool authors. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🐞 Debuggers

Answer one question at a time by watching the program run, inside a VM.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [x64dbg](https://github.com/x64dbg/x64dbg) | 50k | 2026-10 | Free | ▶️ | Open-source Windows user-mode debugger; plugins are native DLLs. |
| [WinDbg](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/) |  | site | Free | ▶️ | Microsoft's debugger with Time Travel Debugging: record once, step backwards. |
| [pwndbg](https://github.com/pwndbg/pwndbg) | 11k | 2026-10 | Free | ▶️ | GDB and LLDB plugin with heap, memory and context views; keep GDB auto-load safe-path at its default. |
| [GEF](https://github.com/hugsy/gef) | 8.4k | 2026-08 | Free | ▶️ | Single-file GDB enhancement, handy for remote and embedded targets. |
| [rr](https://github.com/rr-debugger/rr) | 11k | 2026-10 | Free | ▶️ | Record and replay for Linux: debug the same execution as many times as you need. |
| [Pernosco](https://pernos.co/) |  | site | Paid | ☁️ | Omniscient debugging built on rr recordings; query any value at any point in time. |
| [edb](https://github.com/eteran/edb-debugger) | 3k | 2026-10 | Free | ▶️ | x64dbg-style GUI debugger for Linux. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🪝 Instrumentation & Emulation

Hook, trace or emulate code without a full debugger session.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [Frida](https://github.com/frida/frida) | 22k | 2026-10 | Free | ▶️ | Inject JavaScript into running processes on every major platform. frida-server listens on the device: test devices only. |
| [Unicorn](https://github.com/unicorn-engine/unicorn) | 9.4k | 2026-08 | Free |  | CPU emulator for running a snippet (a decode loop) without running the program. |
| [Qiling](https://github.com/qilingframework/qiling) | 6.1k | 2026-09 | Free | ▶️ | Whole-binary emulation with OS-level hooks; PyPI lags GitHub releases. |
| [DynamoRIO](https://github.com/DynamoRIO/dynamorio) | 3.2k | 2026-10 | Free | ▶️ | Dynamic binary instrumentation for tracing and coverage. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🧮 Analysis Frameworks & Libraries

Build your own analysis: parsing, disassembly, symbolic execution.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [angr](https://github.com/angr/angr) | 9.1k | 2026-10 | Free |  | Symbolic execution and CFG recovery in Python; the standard for solving crackmes programmatically. |
| [angr management](https://github.com/angr/angr-management) | 1.2k | 2026-10 | Free |  | GUI for angr. |
| [Triton](https://github.com/JonathanSalwan/Triton) | 4.3k | 2026-09 | Free |  | Dynamic symbolic execution and taint analysis library. |
| [Miasm](https://github.com/cea-sec/miasm) | 4k | 2026-09 | Free |  | Reverse engineering framework with IR, emulation and deobfuscation helpers. |
| [LIEF](https://github.com/lief-project/LIEF) | 5.6k | 2026-10 | Free |  | Parse and modify ELF, PE, Mach-O, DEX and OAT from Python, C++ or Rust. |
| [Capstone](https://github.com/capstone-engine/capstone) | 9.1k | 2026-10 | Free |  | Multi-architecture disassembly library; prefer the stable 5.x line. |
| [Keystone](https://github.com/keystone-engine/keystone) | 2.6k | 2026-07 | Free |  | Multi-architecture assembler library, Capstone's counterpart. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## ↔️ Binary Diffing

Compare two builds to find a feature or a fix fast.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [BinDiff](https://github.com/google/bindiff) | 3.2k | 2026-09 | Free |  | Google's open-source binary diffing for IDA, Binary Ninja and Ghidra. |
| [BinExport](https://github.com/google/binexport) | 1.2k | 2026-10 | Free |  | Exports disassembly for BinDiff from IDA, Binary Ninja and Ghidra. |
| [Diaphora](https://github.com/joxeankoret/diaphora) | 4.4k | 2026-09 | Free |  | Advanced diffing inside IDA, including decompiler-level comparison. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 📱 Android & Java

APK, DEX and JVM bytecode.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [JADX](https://github.com/skylot/jadx) | 51k | 2026-10 | Free |  | DEX to Java decompiler with GUI; static and safe to read. |
| [Apktool](https://github.com/iBotPeaches/Apktool) | 26k | 2026-10 | Free |  | Decode and rebuild APK resources and smali; install rebuilt APKs only on an emulator. |
| [JEB](https://www.pnfsoftware.com/) |  | site | Paid |  | Commercial decompiler that copes best with obfuscated Android code. |
| [Bytecode Viewer](https://github.com/Konloch/bytecode-viewer) | 16k | 2026-07 | Free |  | Java and Android bytecode viewer with several decompilers side by side. |
| [objection](https://github.com/sensepost/objection) | 9.4k | 2026-09 | Free | ▶️ | Frida-powered runtime exploration for mobile apps you are authorised to test. |
| [MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF) | 22k | 2026-09 | Free |  | Automated static and dynamic mobile app audit; run the Docker image bound to localhost. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🟪 .NET

Managed code decompiles close to source.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [ILSpy](https://github.com/icsharpcode/ILSpy) | 26k | 2026-10 | Free | 🎭 | Static .NET decompiler; the safest way to read managed code. ilspy.org is not official. |
| [dnSpyEx](https://github.com/dnSpyEx/dnSpy) | 11k | 2026-08 | Free | ▶️ 🎭 | Maintained dnSpy continuation with a debugger. dnspy.org and dnspy.net have served malware: GitHub releases only. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🍎 iOS & macOS

Mach-O, IPSW and Apple firmware.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [ipsw](https://github.com/blacktop/ipsw) | 3.8k | 2026-10 | Free |  | Swiss-army tool for IPSW, kernelcache, dyld_shared_cache and Mach-O analysis. |
| [Corellium](https://www.corellium.com/) |  | site | Paid | ☁️ | Virtual Arm iOS and Android devices for research; owned by Cellebrite since Dec 2025. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 📦 Language Runtimes & Packagers

The runtime decides the tool. Check this table before opening a disassembler.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [GoReSym](https://github.com/mandiant/GoReSym) | 1.1k | 2026-09 | Free |  | Go: recovers function names, types and build info from stripped binaries. |
| [blutter](https://github.com/worawit/blutter) | 2.7k | 2026-08 | Free |  | Flutter: analyses Dart AOT snapshots in libapp.so. |
| [Il2CppDumper](https://github.com/Perfare/Il2CppDumper) | 9.5k | 2024-08 | Free | ⚠️ | Unity IL2CPP: restores class and method metadata. |
| [hermes-dec](https://github.com/P1sec/hermes-dec) | 1.2k | 2026-08 | Free |  | React Native Hermes bytecode disassembler and decompiler. |
| [pyinstxtractor](https://github.com/extremecoders-re/pyinstxtractor) | 4.5k | 2026-07 | Free |  | PyInstaller: extracts the bundled .pyc files. |
| [pycdc](https://github.com/zrax/pycdc) | 4.6k | 2026-04 | Free |  | Python bytecode decompiler. |
| [GDRE Tools](https://github.com/GDRETools/gdsdecomp) | 4.3k | 2026-10 | Free |  | Godot: recovers projects and decompiles GDScript. |
| [@electron/asar](https://github.com/electron/asar) | 2.9k | 2026-10 | Free |  | Electron: extract app.asar to read the app's JavaScript; pin the version. |
| [WABT](https://github.com/WebAssembly/wabt) | 8.1k | 2026-10 | Free |  | WebAssembly: wasm2wat, wasm-objdump and wasm-decompile to C-like pseudocode. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🌐 Web, JS & Protocols

Bundles, source maps, traffic and undocumented APIs of services you use.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [webcrack](https://github.com/j4k0xb/webcrack) | 3k | 2026-07 | Free | ▶️ | Deobfuscates obfuscator.io output and unpacks webpack and browserify bundles. |
| [mitmproxy](https://github.com/mitmproxy/mitmproxy) | 45k | 2026-10 | Free |  | Intercepting HTTPS proxy for your own apps' traffic; keep its CA on test devices only. |
| [mitmproxy2swagger](https://github.com/alufers/mitmproxy2swagger) | 9.6k | 2026-10 | Free |  | Turns captures into an OpenAPI spec; sanitize tokens first. |
| [Wireshark](https://www.wireshark.org/) |  | site | Free |  | Packet analysis; never run the GUI as root. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 📟 Firmware & Embedded

Extraction, emulation and audit of device images you own.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [unblob](https://github.com/onekey-sec/unblob) | 2.6k | 2026-10 | Free |  | Recursive extraction of 78+ formats; runs as a normal user with traversal guards and a Landlock sandbox. |
| [binwalk](https://github.com/ReFirmLabs/binwalk) | 14k | 2026-08 | Free |  | Signature scanning and entropy analysis (v3 is a Rust rewrite); never extract as root. |
| [EMBA](https://github.com/e-m-b-a/emba) | 3.7k | 2026-10 | Free | ▶️ | Full firmware audit with emulation, SBOM and CVE report; uses sudo, dedicated VM only. |
| [FACT](https://github.com/fkie-cad/FACT_core) | 1.5k | 2026-10 | Free |  | Fraunhofer's firmware analysis and comparison platform. |
| [FirmAE](https://github.com/pr0v3rbs/FirmAE) | 945 | 2026-06 | Free | ▶️ | Emulates router and IoT firmware for dynamic analysis. |
| [dji-firmware-tools](https://github.com/o-gs/dji-firmware-tools) | 2.2k | 2026-07 | Free |  | Parses DJI firmware packages; do not flash modified images to aircraft you fly. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## ⛓️ Smart Contracts & EVM

Read unverified bytecode before you interact with it. Read-only, no wallet needed.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [heimdall-rs](https://github.com/Jon-Becker/heimdall-rs) | 1.6k | 2026-10 | Free |  | Decompile, disassemble and decode unverified contracts. Use release binaries; the default installer is curl to bash over HTTP. |
| [EVMole](https://github.com/cdump/evmole) | 467 | 2026-09 | Free |  | Selectors, arguments, mutability and storage layout from bytecode; has an MCP server (pin its version). |
| [WhatsABI](https://github.com/shazow/whatsabi) | 1.2k | 2026-09 | Free |  | Recovers ABIs and follows proxies to implementations. |
| [Panoramix](https://github.com/palkeo/panoramix) | 954 | 2024-08 | Free | ⚠️ | Python EVM decompiler; a second opinion. |
| [Dedaub](https://dedaub.com/) |  | site | Free tier · Paid | ☁️ | The most readable hosted decompilation; keep unreleased contracts out. |
| [Foundry cast](https://github.com/foundry-rs/foundry) | 11k | 2026-10 | Free |  | `cast code`, `cast storage` on ERC-1967 slots and `cast 4byte` for read-only checks. |
| [evm.codes](https://www.evm.codes/) |  | site | Free |  | Interactive opcode reference and playground. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🦾 AI-Assisted RE & MCP Servers

Agents driving the engines above. Treat every model claim as a hypothesis, keep approvals on, and run them inside the lab VM.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [REA](https://github.com/morluto/rea) | 49k | 2026-10 | Free | ▶️ | One MCP server over twelve target types (Ghidra, IDA, Hopper, JADX, Binwalk, browser, processes). Runtime capture runs targets as you with no sandbox; pin the version. |
| [IDA MCP (official)](https://github.com/HexRaysSA/ida-mcp) | 895 | 2026-10 | Needs IDA Pro |  | Hex-Rays' own MCP server; attaches to a GUI database or a headless idalib worker. |
| [IDA Pro MCP](https://github.com/mrexodia/ida-pro-mcp) | 13k | 2026-09 | Needs IDA Pro | ▶️ | Popular community server; py_eval, patch and debugger tools are high impact, leave them off. |
| [ida-mcp-rs](https://github.com/blacktop/ida-mcp-rs) | 857 | 2026-10 | Needs IDA Pro |  | Headless IDA MCP server in Rust. |
| [Ghidra MCP Server](https://github.com/bethington/ghidra-mcp) | 5.2k | 2026-10 | Free | ▶️ | Actively maintained Ghidra server with 200+ tools including debugging. |
| [GhidraMCP](https://github.com/LaurieWired/GhidraMCP) | 11k | 2025-06 | Free | ⚠️ | The original Ghidra MCP bridge; unauthenticated localhost HTTP. |
| [ReVa](https://github.com/cyberkaida/reverse-engineering-assistant) | 859 | 2026-10 | Free | ▶️ | Ghidra MCP server with small, context-efficient tools; PyGhidra scripting is on by default. |
| [Binary Ninja MCP](https://docs.binary.ninja/guide/mcp.html) |  | site | Free tier · Paid |  | Built into Binary Ninja, including the free edition. |
| [JADX AI MCP](https://github.com/zinja-coder/jadx-ai-mcp) | 2.9k | 2026-09 | Free |  | JADX plugin exposing Android analysis to MCP clients. |
| [radare2 MCP](https://github.com/radareorg/radare2-mcp) | 318 | 2026-10 | Free |  | stdio MCP server for radare2. |
| [r2ai](https://github.com/radareorg/r2ai) | 486 | 2026-10 | Free | ☁️ | LLM-assisted decompilation (decai) and agent mode inside radare2. |
| [Gepetto](https://github.com/JusticeRage/Gepetto) | 3.5k | 2026-08 | Free | ☁️ | IDA plugin that explains functions and renames variables; works with local models too. |
| [GhidrAssist](https://github.com/symgraph/GhidrAssist) | 753 | 2026-09 | Free | ☁️ | LLM chat, RAG and agent mode inside Ghidra with local or hosted models. |
| [LLM4Decompile](https://github.com/albertan017/LLM4Decompile) | 7.1k | 2026-02 | Free |  | Open decompilation models that run locally; 27 to 65% of functions re-execute correctly on its benchmark. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🧪 Lab & Isolation

Where all of the above should run.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [FLARE-VM](https://github.com/mandiant/flare-vm) | 9.1k | 2026-10 | Free |  | Windows analysis VM build scripts; install only in a VM and switch to host-only after setup. |
| [REMnux](https://remnux.org/) |  | site | Free |  | Ubuntu-based analysis distro and appliance; check the published SHA-256. |
| [VMware Workstation Pro](https://blogs.vmware.com/cloud-foundation/2024/11/11/vmware-fusion-and-workstation-are-now-free-for-all-users/) |  | site | Free |  | Free for all users since Nov 2024; patch it and the guest tools. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 📚 Learn

Courses, books and references, in roughly the order to use them.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [Compiler Explorer](https://github.com/compiler-explorer/compiler-explorer) | 19k | 2026-10 | Free |  | See C and C++ become assembly across compilers and -O levels (godbolt.org). |
| [pwn.college](https://pwn.college/) |  | site | Free |  | ASU's hands-on dojos from Computing 101 to a full reversing course. |
| [OpenSecurityTraining2](https://p.ost2.fyi/) |  | site | Free |  | Arch1001 x86-64, Dbg1012 GDB, Dbg1102 Ghidra, RE3011 C++ binaries. |
| [Dive Into Systems](https://diveintosystems.org/) |  | site | Free |  | C, gdb, optimisation and assembly for x86-64 and ARM64 in one free book. |
| [Reverse-Engineering tutorial](https://github.com/mytechnotalent/Reverse-Engineering) | 14k | 2026-10 | Free |  | Free tutorial covering x86, x64, ARM and AVR with worked examples. |
| [Nightmare](https://github.com/guyinatuxedo/nightmare) | 3.2k | 2026-02 | Free |  | Course built from annotated past CTF binaries using Ghidra, GEF and angr. |
| [Practical Binary Analysis](https://nostarch.com/binaryanalysis) |  | site | Paid |  | Formats, disassembly, instrumentation, taint and symbolic execution; concepts current, bundled VM dated (2018). |
| [The Ghidra Book, 2nd ed](https://nostarch.com/node/831) |  | site | Paid |  | March 2026 edition with BSim, PyGhidra and the debugger. |
| [The Art of ARM Assembly, Vol 1](https://nostarch.com/art-arm-assembly-volume-1) |  | site | Paid |  | Deep 64-bit ARM programming text (2025). |
| [Reverse Engineering for Beginners](https://beginners.re/) |  | site | About $1 (Patreon) |  | Large catalogue of compiled C patterns; leans on 32-bit x86 and older compilers. |
| [RPISEC MBE](https://github.com/RPISEC/MBE) | 6.1k | 2021-12 | Free | ⚠️ | Modern Binary Exploitation course; labs need older toolchains. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🎯 Practice Targets

Legal targets, ranked from nothing-runs-locally to Windows VM required.

| Tool | Stars | Updated | Cost | Flags | When to use it |
|------|-------|---------|------|-------|----------------|
| [picoGym](https://picoctf.org/) |  | site | Free |  | CMU's year-round challenges with a gentle reversing category; nothing runs locally. |
| [Microcorruption](https://microcorruption.com/) |  | site | Free |  | MSP430 lock puzzles in a browser emulator. |
| [OverTheWire](https://overthewire.org/wargames/) |  | site | Free |  | Bandit, then Leviathan for reversing, over SSH. |
| [crackmes.one](https://crackmes.one/) |  | site | Free | ▶️ | Large reviewed crackme library with no-malware rules; VM only. |
| [challenges.re](https://challenges.re/) |  | site | Free |  | Short multi-architecture exercises; no public write-ups. |
| [Root-Me Cracking](https://www.root-me.org/en/Challenges/Cracking) |  | site | Free · Premium | ▶️ | About 70 challenges across ELF, PE, .NET, APK, wasm and game engines. |
| [Ethernaut](https://github.com/OpenZeppelin/ethernaut) | 2.3k | 2026-10 | Free |  | EVM wargame including storage and bytecode levels; testnet-only key. |
| [Damn Vulnerable DeFi](https://github.com/theredguild/damn-vulnerable-defi) | 1.4k | 2025-03 | Free | ⚠️ | 18 local DeFi challenges on Foundry; run locally. |
| [Flare-On](https://flare-on.com/) |  | site | Free | ▶️ | Annual Windows reversing contest with official solutions back to 2014; Windows VM. |

<p align="right">(<a href="#readme">back to top</a>)</p>

## 🪦 Graveyard

| Tool | Why | Use instead |
|------|-----|-------------|
| [de4dot](https://github.com/de4dot/de4dot) | Archived Aug 2020 | ILSpy for reading; dnSpyEx for debugging. |
| [class-dump](https://github.com/nygard/class-dump) | No commits since 2022 | `ipsw class-dump`, or Hopper. |
| [Cloudflare har-sanitizer](https://github.com/cloudflare/har-sanitizer) | Archived Apr 2026 | The `jq` filter in [Recipes](#-recipes). |
| [dex2jar](https://github.com/pxb1988/dex2jar) | No commits since Jul 2024 | JADX. |

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
| [awesome-scrapers](https://github.com/edwardtay/awesome-scrapers) | Collection tooling for web data. |

## Contributing

Contributions welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Add entries to [`data.json`](data.json), not the README; `node scripts/build.mjs` regenerates it.

- One sentence per entry, ending with a period, saying when the tool is the right choice.
- Link the official repository or site, never a mirror.
- Set the safety flags honestly: `runs`, `cloud`, `impersonated`.
- No tools whose main purpose is cracking licences, bypassing DRM or cheating in online games.

## License

[CC0 1.0](LICENSE). Listed projects keep their own licences.
