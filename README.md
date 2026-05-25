# Deadshot.io Client

A custom Electron wrapper for `deadshot.io` with a built-in realtime ping viewer.

## Features

- Launches the Deadshot.io web client in a fullscreen Electron window
- Applies browser and performance flags for a better in-app experience
- Uses a preload script to add a ping overlay to the game page
- Press `Backspace` to start realtime latency measurements
- Displays live ping updates every ~800ms for 5 seconds
- Shows ping results in an overlay at the bottom-right of the screen
- At last it works and its updated
## Files

- `index.js` - Electron main process configuration and window creation
- `preload.js` - Renderer preload script that injects the ping viewer and key listener
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

Then press `Backspace` inside the game window to show realtime ping latency.

## Notes

- The app currently loads `https://deadshot.io` and uses a Chrome user agent.
- The overlay is injected through Electron preload so it appears inside the rendered page.
