// Safety guidance, kept in one place so the MCP server, the triage CLI and the
// site cannot drift from the README. Wording follows README.md "Safety First".

export const SAFETY_RULES = [
  {
    id: 'vm',
    title: 'Analyse in a full VM',
    body:
      'No network, or a host-only network with no route out. No shared folders, clipboard or drag and drop, no keys, tokens or wallets. Use a clean snapshot you revert after every session. WSL2 and plain containers are not a separate lab.',
  },
  {
    id: 'source',
    title: 'Download from the official source only',
    body:
      'Lookalike sites for Ghidra, dnSpy and ILSpy have pushed a wallet-stealing payload. Known fakes include ghidralite.com, dnspy.org, dnspy.net and ilspy.org. Follow the link in this list, never a mirror or a search ad.',
  },
  {
    id: 'project-files',
    title: 'Treat project files and proof-of-concept repos as code',
    body:
      'Researchers were compromised by shared Visual Studio projects, a crafted IDA database could run code until IDA 9.3sp2, and fake CVE PoCs pulled a malicious PyPI dependency. Open unknown project files in the VM.',
  },
  {
    id: 'hashes',
    title: 'Look up hashes; do not upload',
    body:
      'Public scanners share uploaded files with paying customers. Hash the file locally and search by hash instead of uploading the sample.',
  },
  {
    id: 'agents',
    title: 'Agents read hostile text',
    body:
      'Strings inside a binary can carry instructions aimed at an AI analyst. Keep approval prompts on, run MCP servers inside the VM, and verify every model claim against the disassembly and a debugger run.',
  },
];

export const LEGAL_NOTE =
  'Only analyse what you own, open-source code, CTF and crackme binaries released for analysis, or targets under written authorisation. Decompilation law varies by country; see the EU Software Directive Art. 6, US 17 USC 1201(f) and your local copyright and computer-crime laws. This is not legal advice.';

export function safetyText() {
  return [
    'Safety first. The tools in this list parse hostile input, and analysts are targeted directly.',
    ...SAFETY_RULES.map((r, i) => `${i + 1}. ${r.title}. ${r.body}`),
    '',
    LEGAL_NOTE,
  ].join('\n');
}
