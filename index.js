const fs = require('fs');
const os = require('os');
const path = require('path');
const regedit = require('regedit');

const reg = regedit.promisified;

const HID_ROOT = 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\HID';

const MODES = {
  invert: 1,
  normal: 0,
};

// When bundled into a single .exe with pkg, regedit's .wsf/.vbs scripts live
// inside the snapshot filesystem, which cscript.exe cannot read. Copy them to
// a real temp folder and point regedit there.
function prepareBundledVbs() {
  if (!process.pkg) return;
  const source = path.join(path.dirname(require.resolve('regedit')), 'vbs');
  const target = path.join(os.tmpdir(), 'easy-mouse-inverter-vbs');
  fs.mkdirSync(target, { recursive: true });
  for (const file of fs.readdirSync(source)) {
    fs.copyFileSync(path.join(source, file), path.join(target, file));
  }
  regedit.setExternalVBSLocation(target);
}

function parseMode(argv) {
  const flag = argv.find((a) => a.startsWith('--'));
  if (!flag) return 'invert';
  const mode = flag.replace(/^--/, '');
  if (mode === 'status' || mode === 'toggle' || mode in MODES) return mode;
  console.error(`Unknown option: ${flag}`);
  console.error('Usage: easy-mouse-inverter [--invert|--normal|--toggle|--status]');
  process.exit(2);
}

async function listOne(key) {
  const result = await reg.list(key);
  return result[key];
}

async function findMice() {
  const root = await listOne(HID_ROOT);
  if (!root.exists || root.keys.length === 0) return [];

  const hidKeys = root.keys.map((k) => `${HID_ROOT}\\${k}`);
  const hidResult = await reg.list(hidKeys);

  const instanceKeys = [];
  for (const k of hidKeys) {
    const entry = hidResult[k];
    if (!entry || !entry.exists) continue;
    for (const inst of entry.keys) instanceKeys.push(`${k}\\${inst}`);
  }
  if (instanceKeys.length === 0) return [];

  const paramKeys = instanceKeys.map((k) => `${k}\\Device Parameters`);
  const paramResult = await reg.list(paramKeys);

  const mice = [];
  for (const k of paramKeys) {
    const entry = paramResult[k];
    if (!entry || !entry.exists) continue;
    const flip = entry.values && entry.values.FlipFlopWheel;
    if (flip && flip.type === 'REG_DWORD') {
      mice.push({ path: k, current: Number(flip.value) });
    }
  }
  return mice;
}

function label(value) {
  return value === 1 ? 'inverted' : 'normal';
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  prepareBundledVbs();

  console.log('Scanning HID devices for mice with a scroll wheel...');
  let mice;
  try {
    mice = await findMice();
  } catch (err) {
    console.error('Failed to read the registry:', err.message || err);
    console.error('Make sure you run this terminal as Administrator.');
    process.exit(1);
  }

  if (mice.length === 0) {
    console.log('No mouse devices with FlipFlopWheel found.');
    return;
  }

  console.log(`Found ${mice.length} mouse device(s).`);

  if (mode === 'status') {
    for (const m of mice) console.log(`  [${label(m.current)}] ${m.path}`);
    return;
  }

  let changed = 0;
  let skipped = 0;
  for (const m of mice) {
    const target = mode === 'toggle' ? (m.current === 1 ? 0 : 1) : MODES[mode];
    if (m.current === target) {
      skipped++;
      console.log(`  [skip] ${m.path} already ${label(target)}`);
      continue;
    }
    try {
      await reg.putValue({
        [m.path]: {
          FlipFlopWheel: { value: target, type: 'REG_DWORD' },
        },
      });
      changed++;
      console.log(`  [set ${label(target)}] ${m.path}`);
    } catch (err) {
      console.error(`  [fail] ${m.path}: ${err.message || err}`);
    }
  }

  console.log('');
  console.log(`Done. Updated ${changed}, already correct ${skipped}.`);
  if (changed > 0) {
    console.log('Unplug and replug your mouse (or reboot) for the change to take effect.');
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
