# Deadshot.io Client

A custom Electron wrapper for `deadshot.io` with built-in ping and FPS overlay controls.

## Features

- Launches the Deadshot.io web client in a fullscreen Electron window
- Shows a local loading screen while the game page loads
- Uses a preload script to inject overlays and keyboard controls into the page
- Press `Backspace` to toggle the realtime ping overlay on/off
- Repeats ping measurements every 500ms while the ping overlay is enabled
- Press `Enter` to toggle the FPS overlay on/off
- Use `F12` to open DevTools
- Both overlays can also be enabled/disabled from the app menu

## Files

- `index.js` - Electron main process configuration, window creation, and menu handling
- `preload.js` - Renderer preload script that injects ping/FPS overlays and key listeners
- `package.json` - Project metadata and startup script

## Requirements

- Node.js installed
- `npm` available

## Installation

1. Open a terminal in the project folder.
2. Install dependencies:

```bash
npm install
```

## Run the app

```bash
npm start
```

Controls:

- `Backspace` — toggle ping overlay and refresh latency every 500ms
- `Enter` — toggle FPS overlay
- `F12` — open DevTools
- View menu:
  - `Toggle Ping Overlay`
  - `Toggle FPS Overlay`

## Notes

- The app loads `https://deadshot.io` and uses a Chrome user agent.
- Settings and overlay state are handled by the Electron preload script and IPC messages.
- The app stores session data in a local `cookies/` folder.
 - To use a custom application icon, place `app.ico` (preferred on Windows) or `icon.png` inside an `ico/` folder at the project root. The app will load that icon at runtime and fall back to a bundled SVG if none is present.

## Packaging (build EXE)

You can package the app into a Windows executable using `electron-packager`. A small CLI wrapper is provided to make packaging easier and to select an icon.

Examples:

```bash
# Use the packaged CLI with defaults (prefers ico/app.ico if present)
npm run package:win

# Use the CLI and explicitly specify an icon path
npm run package:cli -- --icon="ico/app.ico" --out=dist
```

The script accepts these flags: `--dir`, `--out`, `--platform`, `--arch`, `--name`, `--icon`.
