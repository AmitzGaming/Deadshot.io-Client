#!/usr/bin/env node
const packager = require('electron-packager');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(a => {
    if (!a.startsWith('--')) return;
    const [k,v] = a.includes('=') ? a.slice(2).split('=') : [a.slice(2), true];
    out[k] = v;
  });
  return out;
}

async function main() {
  const argv = parseArgs();
  const dir = argv.dir || '.';
  const out = argv.out || argv.output || 'dist';
  const platform = argv.platform || 'win32';
  const arch = argv.arch || 'x64';
  const name = argv.name || 'Deadshot.io_Client';

  let icon = argv.icon;
  if (!icon) {
    const icoPath = path.join(__dirname, '..', 'icon', 'app.ico');
    const pngPath = path.join(__dirname, '..', 'icon', 'icon.png');
    if (fs.existsSync(icoPath)) icon = icoPath;
    else if (fs.existsSync(pngPath)) icon = pngPath;
  }

  const opts = {
    dir,
    out,
    platform,
    arch,
    overwrite: true,
    asar: true,
    name,
  };

  if (icon) opts.icon = icon;

  console.log('Packaging with options:', Object.assign({}, opts));

  try {
    const appPaths = await packager(opts);
    console.log('Packaging complete:', appPaths);
  } catch (err) {
    console.error('Packaging failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

if (require.main === module) main();
