# Deadshot.io Client

A desktop Electron wrapper for `deadshot.io` with built-in runtime overlays, a custom settings panel, and packaging helpers.

## Features

- Launches the Deadshot.io web client in a fullscreen Electron window
- Displays a local loading screen while the game page loads
- Injects a custom renderer settings overlay for VSync and overlay controls
- Adds an FPS display and keeps telemetry visible while the game runs
- Supports a native app icon fallback to a bundled SVG if no custom icon is found
- Includes menu shortcuts for ping/FPS overlays and settings
- Saves VSync preferences to a local settings file in `cookies/settings.json`

## Files

- `index.js` - Electron main process, window setup, command-line switches, and menu handling
- `preload.js` - Renderer preload script that injects overlays, settings UI, and custom input behavior
- `package.json` - Project metadata, scripts, and dependencies
- `scripts/package.js` - CLI packaging wrapper for `electron-packager`

## Requirements

- Node.js installed
- `npm` available

## Installation

Open a terminal in the project folder and install dependencies:

```bash
npm install
```

## Run the app

```bash
npm start
```

## Controls

- `Backspace` — toggle the ping overlay
- `Enter` — toggle the FPS overlay
- `F12` — open DevTools
- `CmdOrCtrl+,` — open the custom settings overlay
- `CmdOrCtrl+P` — toggle ping overlay from the View menu
- `CmdOrCtrl+F` — toggle FPS overlay from the View menu

## Settings

- VSync settings are persisted locally in `cookies/settings.json`.
- The built-in settings overlay can be opened from the app menu and saves preferences automatically.

## Custom icon

At runtime, the app prefers a custom icon inside an `ico/` folder at the project root:

- `ico/app.ico`
- `ico/icon.png`

If no icon is found, the app falls back to a built-in SVG.

## Packaging

Use the built-in packaging scripts to create a Windows executable.

```bash
npm run package:win
```

Or use the CLI wrapper with custom options:

```bash
npm run package:cli -- --icon="icon/app.ico" --out=dist
```

Supported CLI flags:

- `--dir` — source directory to package
- `--out` / `--output` — output folder for the packaged app
- `--platform` — target platform (default `win32`)
- `--arch` — target architecture (default `x64`)
- `--name` — application name
- `--icon` — path to a custom icon file

## Notes

- The Electron wrapper applies GPU and WebGL compatibility switches for better game performance.
- The app stores local session/settings data in a `cookies/` directory under the project.
- The packaging CLI will also check `icon/app.ico` and `icon/icon.png` if no explicit `--icon` is provided.
