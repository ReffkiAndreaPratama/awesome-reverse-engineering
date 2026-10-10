<p align="center"><img src="assets/banner.svg" alt="Awesome Reverse Engineering: binaries, apps, firmware and smart contracts, with live data and a safety flag on every tool" width="100%"></p>

# Awesome Reverse Engineering [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

[![Refresh](https://img.shields.io/github/actions/workflow/status/edwardtay/awesome-reverse-engineering/refresh.yml?label=weekly%20refresh)](https://github.com/edwardtay/awesome-reverse-engineering/actions/workflows/refresh.yml)
[![Links](https://img.shields.io/github/actions/workflow/status/edwardtay/awesome-reverse-engineering/links.yml?label=links)](https://github.com/edwardtay/awesome-reverse-engineering/actions/workflows/links.yml)
[![Last Commit](https://img.shields.io/github/last-commit/edwardtay/awesome-reverse-engineering)](https://github.com/edwardtay/awesome-reverse-engineering/commits/main)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/edwardtay/awesome-reverse-engineering/pulls)
[![License: CC0](https://img.shields.io/badge/License-CC0-lightgrey.svg)](LICENSE)

> Reverse engineering tools and learning resources for binaries, apps, firmware and smart contracts, with live maintenance data, a safety flag on every entry, and the agent-era tooling (MCP servers, AI decompilers) alongside the classics.

**{{COUNT}} entries · refreshed {{DATE}} · {{STALE}} flagged for maintenance**

<p align="center"><img src="assets/stats.svg" alt="Entries per category, regenerated weekly" width="88%"></p>

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

{{TOC}}
