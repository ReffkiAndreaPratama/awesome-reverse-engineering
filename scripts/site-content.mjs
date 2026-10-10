// Hand-written site copy. The FAQ answers here are rendered visibly AND as FAQPage JSON-LD,
// so the structured data always matches what readers see. Keep claims to verified facts.
export const FAQ = [
  {
    q: 'What is the best free decompiler?',
    a: 'Ghidra is the most capable free decompiler: open source under Apache-2.0, with a decompiler for every supported architecture, scripting in Java and Python, BSim similarity search and a team server. Binary Ninja Free (non-commercial) decompiles x86, x86-64, ARMv7 and AArch64, and Cutter bundles the Ghidra decompiler in a lighter GUI. IDA Free decompiles in the cloud, so your code leaves your machine.',
  },
  {
    q: 'Is it legal to reverse engineer software?',
    a: 'It depends on the country, the licence and what you do with the result. The EU Software Directive (Art. 6) permits decompilation for interoperability, and US law (17 USC 1201(f)) permits circumvention for interoperability, while licence terms banning reverse engineering can still bind you. Your own code, open-source code, CTF and crackme binaries released for analysis, and targets under written authorisation are the safe ground. This is not legal advice.',
  },
  {
    q: 'How do I start learning reverse engineering?',
    a: 'Build an isolated VM first, then compile your own small C programs at -O0 and -O2 and read them in Compiler Explorer and Ghidra. Add x86-64 and the calling conventions (OpenSecurityTraining2 Arch1001, pwn.college), then practise on browser and SSH targets such as picoGym, Microcorruption and OverTheWire Leviathan before downloading crackmes into the VM. The list includes a 12-week path.',
  },
  {
    q: 'Is it safe to download reverse engineering tools?',
    a: 'Only from the official source. Lookalike sites for Ghidra, dnSpy and ILSpy (for example ghidralite.com, dnspy.org, dnspy.net and ilspy.org) have pushed wallet-stealing malware, a trojanised cracked IDA Pro was used against researchers, and fake proof-of-concept repositories have hidden payloads in dependencies. Every entry in this list links its official source and flags tools that are commonly impersonated.',
  },
  {
    q: 'Can AI agents reverse engineer binaries?',
    a: 'They can drive real tools through MCP servers for Ghidra, IDA, Binary Ninja, JADX and radare2, and REA wraps many of them behind one server. They are good at triage, naming and navigation, but research decompilers produce code that re-executes correctly on only about 20 to 65% of benchmark functions, so every model claim needs checking against the disassembly. Run agents inside an isolated VM with approvals on, because strings in a hostile binary can try to instruct the agent.',
  },
  {
    q: 'What should I use for Android apps?',
    a: 'Start with JADX for readable Java from DEX, Apktool for resources and smali, and Androguard for scripting. JEB is a commercial decompiler aimed at obfuscated Android code, and MobSF automates an audit. Use Frida-based tools such as objection only on apps you are authorised to test, on an emulator or a test device.',
  },
];

export const COMPARE = {
  slug: 'ghidra-vs-ida-pro-vs-binary-ninja',
  title: 'Ghidra vs IDA Pro vs Binary Ninja',
  lede: 'The three disassemblers most reverse engineers choose between, compared on price, decompilation, scripting, AI integration and security notes. Facts are from vendor pages and project repositories, checked on {{REVIEWED}}.',
  cols: ['Ghidra', 'IDA', 'Binary Ninja'],
  rows: [
    ['Price', 'Free, open source (Apache-2.0)', 'Free tier for non-commercial use; Home, Pro and higher tiers billed annually', 'Free tier for non-commercial use; Personal from US$199, plus Commercial and Ultimate'],
    ['Decompiler', 'Included for every supported architecture, runs locally', 'Free, Home and Pro Essential decompile in the cloud; Expert, Ultimate and Headless decompile locally', 'Free edition decompiles x86, x86-64, ARMv7 and AArch64 locally'],
    ['Scripting', 'Java and Python (PyGhidra)', 'IDAPython (not available in IDA Free)', 'Python API (not in the free edition)'],
    ['Debugger', 'Built in', 'Built in', 'Built in, including the free edition'],
    ['Similarity and signatures', 'BSim, Function ID', 'FLIRT, Lumina', 'See vendor documentation'],
    ['AI and MCP', 'Community servers: Ghidra MCP Server, GhidraMCP, ReVa; also driven by REA', 'Official Hex-Rays IDA MCP (IDA 9.4+ with idalib); community ida-pro-mcp', 'Built-in MCP server in every edition; headless use needs Commercial or Ultimate'],
    ['Security notes', 'About 30 advisories from Feb to Sep 2026; stay on 12.1.4 or later; lookalike download sites exist', 'Never use cracked builds (a trojanised IDA 7.5 targeted researchers); a crafted database could run code until 9.3sp2', 'Binary Ninja Cloud uploads binaries to the vendor'],
    ['Strong choice when', 'You want a capable free tool, are learning, or need a team server on a budget', 'You need the widest processor support and the largest plugin ecosystem for commercial work', 'You want to script analysis on clean intermediate languages'],
  ],
  verdict: 'Start with Ghidra: it costs nothing, decompiles locally and covers most work. Move to IDA when a job needs its processor coverage, plugins or a client expects it, and choose a tier that decompiles locally for confidential code. Pick Binary Ninja when you will write your own analysis on top of the tool.',
};
