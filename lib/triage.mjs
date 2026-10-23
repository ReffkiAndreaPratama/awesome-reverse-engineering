// Content-first runtime detection and toolchain recommendation.
//
// The rule engine follows README.md "Triage by Runtime": the runtime decides the
// toolchain, so specific runtime markers outrank the container format. Detection
// reads bytes already in memory; it never executes or uploads the sample.

export const RUNTIME_LABELS = {
  wasm: 'WebAssembly',
  dex: 'Android DEX',
  android: 'Android APK',
  ios: 'iOS app (IPA)',
  java: 'Java class or JAR',
  jar: 'Java archive',
  hermes: 'React Native Hermes bytecode',
  'react-native': 'React Native',
  pyinstaller: 'PyInstaller bundle',
  python: 'Python bytecode',
  unity: 'Unity IL2CPP',
  flutter: 'Flutter (Dart AOT)',
  dotnet: '.NET assembly',
  electron: 'Electron app',
  go: 'Go binary',
  rust: 'Rust binary',
  godot: 'Godot package',
  lua: 'Lua bytecode',
  firmware: 'Firmware or embedded image',
  archive: 'Archive or compressed container',
  packed: 'Packed or protected binary',
  elf: 'ELF binary',
  pe: 'PE binary',
  macho: 'Mach-O binary',
  javascript: 'JavaScript bundle',
  har: 'HAR capture',
  evm: 'EVM bytecode',
  text: 'Text or script',
  unknown: 'Unrecognised',
};

// Names must match data.json entries; unknown names are dropped from output.
export const TOOLCHAIN = {
  wasm: ['WABT'],
  dex: ['JADX', 'Apktool', 'Androguard'],
  android: ['JADX', 'Apktool', 'Androguard', 'MobSF'],
  ios: ['ipsw', 'Corellium'],
  java: ['JADX', 'Bytecode Viewer', 'Recaf'],
  jar: ['JADX', 'Bytecode Viewer', 'Recaf'],
  hermes: ['hermes-dec'],
  'react-native': ['hermes-dec'],
  pyinstaller: ['pyinstxtractor', 'pycdc'],
  python: ['pycdc'],
  unity: ['Il2CppDumper', 'Cpp2IL'],
  flutter: ['blutter'],
  dotnet: ['ILSpy', 'dnSpyEx'],
  electron: ['@electron/asar', 'webcrack'],
  go: ['GoReSym', 'Ghidra'],
  rust: ['Ghidra', 'capa', 'FLOSS'],
  godot: ['GDRE Tools'],
  lua: [],
  firmware: ['unblob', 'binwalk', 'EMBA', 'FACT'],
  archive: ['unblob', 'binwalk'],
  packed: ['Detect It Easy', 'capa', 'FLOSS'],
  elf: ['Detect It Easy', 'capa', 'Ghidra', 'checksec', 'XELFViewer'],
  pe: ['Detect It Easy', 'capa', 'PE-bear', 'Ghidra', 'x64dbg'],
  macho: ['Detect It Easy', 'Ghidra', 'Hopper', 'ipsw'],
  javascript: ['webcrack', 'Chrome DevTools'],
  har: ['mitmproxy', 'mitmproxy2swagger'],
  evm: ['heimdall-rs', 'EVMole', 'WhatsABI'],
  text: [],
  unknown: ['Detect It Easy', 'capa', 'FLOSS', 'Ghidra'],
};

const STEPS = {
  wasm: ['Convert the module to readable text with WABT (wasm2wat, wasm-objdump, wasm-decompile) before reaching for a native decompiler.'],
  dex: ['Decompile the DEX with JADX, then use Apktool or Androguard when you need resources or scripting.'],
  android: ['Open the APK in JADX for Java, Apktool for resources and smali, and Androguard for scripts. Run MobSF for an automated first pass.'],
  ios: ['Use ipsw for Mach-O and IPSW work; Corellium only if you have an authorised device or licence.'],
  java: ['Decompile the class or JAR with Bytecode Viewer or Recaf; JADX also reads JARs.'],
  jar: ['Decompile the archive with JADX, Bytecode Viewer or Recaf. Check META-INF for the real entry point.'],
  hermes: ['Disassemble the Hermes bytecode with hermes-dec; the original JavaScript is not present.'],
  'react-native': ['Check for index.android.bundle and a Hermes magic before decompiling with hermes-dec.'],
  pyinstaller: ['Extract the archive with pyinstxtractor, then decompile the recovered .pyc files with pycdc.'],
  python: ['Match the .pyc magic to the Python version that produced it, then decompile with pycdc.'],
  unity: ['Dump global-metadata.dat and GameAssembly with Il2CppDumper, then compare with Cpp2IL if some types are missing.'],
  flutter: ['Run blutter on libapp.so to recover Dart classes and functions; libflutter.so is the engine, not your target.'],
  dotnet: ['Open the assembly in ILSpy for reading; use dnSpyEx only for debugging inside the VM.'],
  electron: ['Extract app.asar with @electron/asar and read the JavaScript; run webcrack if the bundle is minified.'],
  go: ['Start with GoReSym to recover function names, types and build info, then load the result in Ghidra.'],
  rust: ['Use Ghidra or IDA with Rust demangling; capa and FLOSS help name behaviour and hidden strings.'],
  godot: ['Recover the project with GDRE Tools before reading the engine binary.'],
  lua: ['Lua bytecode is not covered by an entry in this list; treat the sample as hostile and decompile in the VM.'],
  firmware: ['Identify the container with unblob or binwalk, then extract with EMBA, FACT or the vendor tools in Firmware & Embedded.'],
  archive: ['Unpack with unblob or binwalk, then re-run triage on the extracted files instead of the archive.'],
  packed: ['Confirm the packer with Detect It Easy, then unpack statically in the VM; capa and FLOSS work on the unpacked image.'],
  elf: ['Check mitigations with checksec, then read the binary in Ghidra; XELFViewer is enough for headers and sections.'],
  pe: ['Inspect headers with PE-bear, check mitigations with checksec, then decompile in Ghidra or debug in x64dbg.'],
  macho: ['Open the Mach-O in Ghidra or Hopper; use ipsw for dyld caches and IPSW images.'],
  javascript: ['Recover the original modules with webcrack, then use Chrome DevTools source maps when present.'],
  har: ['Sanitise the HAR before sharing it, then replay or document requests with mitmproxy and mitmproxy2swagger.'],
  evm: ['Read the bytecode with heimdall-rs and recover the ABI with EVMole or WhatsABI; no wallet is needed.'],
  text: ['This looks like source or a script, so read it directly rather than decompiling. Confirm it is not a polyglot before running it.'],
  unknown: ['No known runtime marker matched. Confirm the file type with Detect It Easy, then try capa and FLOSS before a full disassembler.'],
};

const CONFIDENCE_WEIGHT = { high: 3, medium: 2, low: 1 };

const startsWithBytes = (buf, bytes) =>
  buf.length >= bytes.length && bytes.every((b, i) => buf[i] === b);

const MAGIC = {
  elf: [0x7f, 0x45, 0x4c, 0x46],
  wasm: [0x00, 0x61, 0x73, 0x6d],
  hermes: [0xc6, 0x1f, 0xbc, 0x03],
  java: [0xca, 0xfe, 0xba, 0xbe],
  lua: [0x1b, 0x4c, 0x75, 0x61],
  gzip: [0x1f, 0x8b],
  xz: [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00],
  zstd: [0x28, 0xb5, 0x2f, 0xfd],
  sevenzip: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
  rar: [0x52, 0x61, 0x72, 0x21],
  squashfs: [0x68, 0x73, 0x71, 0x73],
  dtb: [0xd0, 0x0d, 0xfe, 0xed],
  uimage: [0x27, 0x05, 0x19, 0x56],
  cramfs: [0x45, 0x3d, 0xcd, 0x28],
};
const MACHO_MAGICS = [
  [0xfe, 0xed, 0xfa, 0xce],
  [0xce, 0xfa, 0xed, 0xfe],
  [0xfe, 0xed, 0xfa, 0xcf],
  [0xcf, 0xfa, 0xed, 0xfe],
  [0xca, 0xfe, 0xba, 0xbe],
  [0xbe, 0xba, 0xfe, 0xca],
];

const EXT_HINTS = {
  '.apk': ['android', 'Android package extension'],
  '.dex': ['dex', 'DEX extension'],
  '.ipa': ['ios', 'iOS app archive extension'],
  '.jar': ['jar', 'Java archive extension'],
  '.class': ['java', 'Java class extension'],
  '.wasm': ['wasm', 'WebAssembly extension'],
  '.pyc': ['python', 'Python bytecode extension'],
  '.asar': ['electron', 'Electron asar extension'],
  '.pck': ['godot', 'Godot pack extension'],
  '.dll': ['pe', 'Windows library extension'],
  '.exe': ['pe', 'Windows executable extension'],
  '.sys': ['pe', 'Windows driver extension'],
  '.so': ['elf', 'shared object extension'],
  '.elf': ['elf', 'ELF extension'],
  '.dylib': ['macho', 'Mach-O library extension'],
  '.bin': ['firmware', 'raw image extension'],
  '.img': ['firmware', 'disk image extension'],
  '.fw': ['firmware', 'firmware extension'],
  '.js': ['javascript', 'JavaScript extension'],
  '.har': ['har', 'HAR extension'],
  '.sol': ['evm', 'Solidity extension'],
  '.abi': ['evm', 'ABI extension'],
};

const ANY = (...needles) => text => needles.some(n => text.includes(n));

function markerHits(text, name) {
  const hits = [];
  const add = (id, rank, confidence, ...evidence) =>
    hits.push({ id, label: RUNTIME_LABELS[id], rank, confidence, evidence });

  if (text.includes('AndroidManifest.xml') && text.includes('classes.dex')) {
    add('android', 8, 'high', 'AndroidManifest.xml and classes.dex in an archive');
  } else if (/Payload\/[^\0]{1,120}\.app\//.test(text)) {
    add('ios', 9, 'high', 'Payload/*.app/ path inside an archive');
  }
  if (text.includes('PyInstaller') || text.includes('MEI\x0c\x0b\x0a\x0b\x0e') || text.includes('_MEIPASS')) {
    add('pyinstaller', 10, 'high', 'PyInstaller marker');
  }
  if (text.includes('global-metadata.dat') || text.includes('GameAssembly') || text.includes('il2cpp_init')) {
    add('unity', 12, 'high', 'Unity IL2CPP marker');
  }
  if (text.includes('libflutter.so') || text.includes('Dart VM version') || text.includes('Precompiled Dart')) {
    add('flutter', 13, 'high', 'Flutter or Dart AOT marker');
  } else if (text.includes('libapp.so') && text.includes('Dart')) {
    add('flutter', 13, 'medium', 'libapp.so with Dart strings');
  }
  if (text.includes('BSJB') || text.includes('mscorlib') || text.includes('System.Private.CoreLib')) {
    add('dotnet', 14, 'high', 'CLR metadata marker');
  }
  if (
    text.includes('Go build ID') ||
    text.includes('runtime.gopanic') ||
    (text.includes('runtime.main') && text.includes('go1.'))
  ) {
    add('go', 15, 'high', 'Go runtime marker');
  }
  if (text.includes('index.android.bundle') && text.includes('Hermes')) {
    add('react-native', 16, 'high', 'React Native bundle with Hermes');
  }
  if (text.includes('app.asar') || (text.includes('Electron') && text.includes('node_modules'))) {
    add('electron', 17, 'medium', 'Electron or asar marker');
  }
  if (text.includes('rustc') || text.includes('core::fmt') || text.includes('panicked at')) {
    add('rust', 18, 'medium', 'Rust runtime marker');
  }
  if (text.startsWith('GDPC') || (text.includes('res://') && text.includes('godot'))) {
    add('godot', 19, 'medium', 'Godot package marker');
  }
  if (text.includes('libpython') || /\bpython3\.\d+\b/.test(text)) {
    add('python', 20, 'medium', 'Python runtime marker');
  }
  if (text.includes('UPX!') || text.includes('VMProtect') || text.includes('Themida')) {
    add('packed', 35, 'medium', 'Packer or protector marker');
  }
  if (
    text.includes('sourceMappingURL') ||
    text.includes('webpack') ||
    (name.endsWith('.js') && text.includes('function '))
  ) {
    add('javascript', 22, 'medium', 'JavaScript bundle marker');
  }
  if ((text.includes('"log"') && text.includes('"entries"')) || name.endsWith('.har')) {
    add('har', 24, 'low', 'HAR capture structure or extension');
  }
  if (name.endsWith('.sol') || name.endsWith('.abi')) {
    add('evm', 26, 'low', 'Solidity source or ABI extension');
  }
  if (
    /^[0-9a-f\s]{64,}$/i.test(text.slice(0, 8192)) &&
    /^(60|61|63|6080604052)/.test(text.trimStart().slice(0, 10))
  ) {
    add('evm', 26, 'low', 'hex bytecode that starts with an EVM init sequence');
  }
  if (
    text.includes('UBI#') ||
    text.includes('ANDROID!') ||
    text.includes('hsqs') ||
    text.includes('sqsh') ||
    text.includes('JFFS2') ||
    text.includes('0x1985')
  ) {
    add('firmware', 27, 'medium', 'embedded filesystem or boot image marker');
  }
  return hits;
}

export function detect(buf, { name = '', text, truncated = false } = {}) {
  const t = text ?? buf.toString('latin1');
  const hits = [];

  if (startsWithBytes(buf, MAGIC.wasm)) hits.push({ id: 'wasm', label: RUNTIME_LABELS.wasm, rank: 5, confidence: 'high', evidence: ['magic 00 61 73 6d'] });
  if (startsWithBytes(buf, MAGIC.hermes)) hits.push({ id: 'hermes', label: RUNTIME_LABELS.hermes, rank: 6, confidence: 'high', evidence: ['magic c6 1f bc 03'] });
  if (t.startsWith('dex\n')) hits.push({ id: 'dex', label: RUNTIME_LABELS.dex, rank: 7, confidence: 'high', evidence: ['magic dex\\n'] });
  if (startsWithBytes(buf, MAGIC.java)) {
    if (t.includes('java/lang') || t.includes('java/')) {
      hits.push({ id: 'java', label: RUNTIME_LABELS.java, rank: 20, confidence: 'high', evidence: ['magic ca fe ba be with Java constant pool'] });
    } else {
      hits.push({ id: 'macho', label: RUNTIME_LABELS.macho, rank: 50, confidence: 'medium', evidence: ['magic ca fe ba be (fat Mach-O)'] });
    }
  }
  if (!hits.some(h => h.id === 'java') && startsWithBytes(buf, MAGIC.lua)) {
    hits.push({ id: 'lua', label: RUNTIME_LABELS.lua, rank: 20, confidence: 'high', evidence: ['magic 1b 4c 75 61'] });
  }
  if (startsWithBytes(buf, MAGIC.elf)) hits.push({ id: 'elf', label: RUNTIME_LABELS.elf, rank: 50, confidence: 'high', evidence: ['magic 7f 45 4c 46'] });
  if (buf.length > 64 && buf[0] === 0x4d && buf[1] === 0x5a) {
    const peOffset = buf.length >= 0x40 ? buf.readUInt32LE(0x3c) : -1;
    const hasPe = peOffset > 0 && peOffset + 4 <= buf.length && buf.toString('latin1', peOffset, peOffset + 4) === 'PE\0\0';
    hits.push({ id: 'pe', label: RUNTIME_LABELS.pe, rank: 50, confidence: hasPe ? 'high' : 'medium', evidence: [hasPe ? 'MZ header with PE signature' : 'MZ header only'] });
  }
  if (!hits.some(h => h.id === 'macho') && MACHO_MAGICS.some(m => startsWithBytes(buf, m))) {
    hits.push({ id: 'macho', label: RUNTIME_LABELS.macho, rank: 50, confidence: 'high', evidence: ['Mach-O magic'] });
  }
  if (startsWithBytes(buf, [0x50, 0x4b, 0x03, 0x04])) {
    hits.push({ id: 'archive', label: RUNTIME_LABELS.archive, rank: 40, confidence: 'high', evidence: ['ZIP magic 50 4b 03 04'] });
  }
  for (const [key, bytes] of Object.entries(MAGIC)) {
    if (['elf', 'wasm', 'hermes', 'java', 'lua'].includes(key)) continue;
    if (key === 'squashfs' || key === 'dtb' || key === 'uimage' || key === 'cramfs') continue;
    if (startsWithBytes(buf, bytes)) {
      hits.push({ id: 'archive', label: RUNTIME_LABELS.archive, rank: 40, confidence: 'high', evidence: [`compressed magic ${bytes.map(b => b.toString(16).padStart(2, '0')).join(' ')}`] });
      break;
    }
  }
  if (startsWithBytes(buf, MAGIC.squashfs) || startsWithBytes(buf, MAGIC.dtb) || startsWithBytes(buf, MAGIC.uimage) || startsWithBytes(buf, MAGIC.cramfs)) {
    hits.push({ id: 'firmware', label: RUNTIME_LABELS.firmware, rank: 27, confidence: 'high', evidence: ['embedded image magic'] });
  }

  hits.push(...markerHits(t, name));

  // Extension hints are deliberately weak: they only help when content is inconclusive.
  const ext = Object.keys(EXT_HINTS).find(x => name.toLowerCase().endsWith(x));
  if (ext) {
    const [id, why] = EXT_HINTS[ext];
    if (!hits.some(h => h.id === id)) {
      hits.push({ id, label: RUNTIME_LABELS[id], rank: 80, confidence: 'low', evidence: [why] });
    }
  }

  if (!hits.length) {
    const printable = t.length > 0 && (t.match(/[\x09\x0a\x0d\x20-\x7e]/g) || []).length / t.length > 0.9;
    if (printable) {
      hits.push({ id: 'text', label: RUNTIME_LABELS.text, rank: 90, confidence: 'low', evidence: ['mostly printable bytes'] });
    } else {
      hits.push({ id: 'unknown', label: RUNTIME_LABELS.unknown, rank: 100, confidence: 'low', evidence: ['no known magic or runtime marker'] });
    }
  }

  const seen = new Set();
  const matches = hits
    .sort((a, b) => a.rank - b.rank || CONFIDENCE_WEIGHT[b.confidence] - CONFIDENCE_WEIGHT[a.confidence])
    .filter(h => (seen.has(h.id) ? false : seen.add(h.id)));

  return {
    primary: matches[0],
    matches,
    size: buf.length,
    truncated,
  };
}

export function recommend(data, detection) {
  const byName = new Map(data.entries.map(e => [e.n.toLowerCase(), e]));
  const names = [];
  const push = n => {
    if (!names.some(x => x.toLowerCase() === n.toLowerCase())) names.push(n);
  };

  // Specific runtime tools first, then container tools, then the triage baseline.
  for (const hit of detection.matches.filter(h => h.rank < 50)) {
    for (const n of TOOLCHAIN[hit.id] || []) push(n);
  }
  for (const hit of detection.matches.filter(h => h.rank >= 50 && h.rank < 80)) {
    for (const n of TOOLCHAIN[hit.id] || []) push(n);
  }
  for (const n of ['Detect It Easy', 'capa', 'FLOSS']) push(n);

  const tools = names
    .map(n => byName.get(n.toLowerCase()))
    .filter(Boolean)
    .map(e => ({
      name: e.n,
      url: e.u,
      cost: e.cost,
      description: e.d,
      flags: e.f || [],
    }));

  const steps = [];
  const primary = detection.primary?.id;
  if (STEPS[primary]) steps.push(STEPS[primary]);
  for (const hit of detection.matches.slice(1, 4)) {
    if (STEPS[hit.id] && !steps.includes(STEPS[hit.id])) steps.push(STEPS[hit.id]);
  }
  steps.push('Confirm the format and any packer with Detect It Easy before trusting this guess.');
  steps.push('Work inside the isolated VM described in Safety First; never run the sample on the host.');

  return {
    runtime: primary || 'unknown',
    label: detection.primary?.label || RUNTIME_LABELS.unknown,
    confidence: detection.primary?.confidence || 'low',
    evidence: detection.primary?.evidence || [],
    matches: detection.matches.map(h => ({ id: h.id, label: h.label, confidence: h.confidence, evidence: h.evidence })),
    tools,
    steps,
    needsVm: tools.some(t => t.flags.includes('runs')),
    sendsCode: tools.some(t => t.flags.includes('cloud')),
  };
}
