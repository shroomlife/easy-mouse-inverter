# Easy Mouse Inverter

Tiny Node.js tool that inverts the scroll-wheel direction of every mouse
attached to a Windows 10 or 11 machine — also known as "natural scrolling",
the way scrolling works on macOS and on touchpads.

It does this by flipping the `FlipFlopWheel` flag on each mouse under
`HKLM\SYSTEM\CurrentControlSet\Enum\HID\…\Device Parameters`. No drivers,
no background process, no tray icon — just a one-shot registry edit.

## Why this exists

On macOS and on every touchpad, pushing your fingers up moves the page up.
Windows still defaults to the opposite — push the wheel up, page goes down.

Since **Windows 11 24H2** there is a native toggle under
*Settings → Bluetooth & devices → Mouse → Scrolling direction*, so on
recent builds you may not need this tool at all. It is still useful when:

- you are on Windows 10 or an older Windows 11 build, or
- you have several mice and want to flip all of them at once without
  clicking through the Settings app.

Either way, the underlying mechanism is the same `FlipFlopWheel` registry
flag that Microsoft's own input stack reads — see
[Microsoft Q&A: Reverse Mouse Wheel scroll](https://learn.microsoft.com/en-us/answers/questions/3809133/reverse-mouse-wheel-scroll).

## Requirements

- Windows 10 or Windows 11
- Node.js 18 or newer (only needed if you run it from source)
- An **Administrator** terminal (writing to `HKLM` requires elevation)

## Usage

### Option A — run from source

```powershell
# 1. open PowerShell or Windows Terminal as Administrator
# 2. clone and install
git clone https://github.com/shroomlife/easy-mouse-inverter.git
cd easy-mouse-inverter
npm install

# 3. invert all mice
npm start
```

### Option B — download the prebuilt executable

Grab the latest `.exe` from the
[Releases page](https://github.com/shroomlife/easy-mouse-inverter/releases)
and run it as Administrator.

## Commands

| Command          | What it does                                         |
| ---------------- | ---------------------------------------------------- |
| `npm start`      | Invert every mouse (same as `--invert`)              |
| `npm run invert` | Set inverted (natural) scrolling on every mouse      |
| `npm run normal` | Restore Windows default scrolling on every mouse     |
| `npm run toggle` | Flip whatever each mouse is currently set to         |
| `npm run status` | List every detected mouse and its current direction  |

You can also call the script directly:

```powershell
node index.js --invert
node index.js --normal
node index.js --toggle
node index.js --status
```

## How it works

1. Enumerate `HKLM\SYSTEM\CurrentControlSet\Enum\HID`.
2. For each device instance, look at its `Device Parameters` subkey.
3. If a `FlipFlopWheel` (`REG_DWORD`) value is present, the device is a mouse
   with a scroll wheel.
4. Write `1` to invert, `0` for normal, or flip it for toggle.

After the script finishes, **unplug and replug the mouse** — or reboot — for
Windows to pick up the new setting. A replug is enough in most cases; only a
reboot is needed if the device cannot be physically reconnected.

This is the same approach that the well-known
[PowerShell one-liner](https://gist.github.com/arbourd/f200bcdf79913d2189cf125c30da3eb8)
uses (`Get-ItemProperty HKLM:\SYSTEM\CurrentControlSet\Enum\HID\*\*\Device Parameters`
filtered by `FlipFlopWheel`) — this tool just wraps it with safer error
handling and a nicer CLI.

## Troubleshooting

- **"Failed to read the registry"** — you forgot to run the terminal as
  Administrator. Right-click PowerShell or Windows Terminal and choose
  *Run as administrator*.
- **"No mouse devices with FlipFlopWheel found"** — your mouse doesn't expose
  a scroll wheel through the standard HID class. Some gaming mice with
  vendor drivers (Logitech G HUB, Razer Synapse) bypass this setting; use the
  vendor app instead.
- **The change doesn't apply** — Windows caches the setting until the device
  is re-enumerated. Replug the mouse or reboot.
- **Windows 11 24H2 or newer** — the native *Scrolling direction* setting in
  the Settings app may overwrite this registry value when toggled. If you use
  this tool, leave the GUI option at its default afterwards.

## License

Apache-2.0
