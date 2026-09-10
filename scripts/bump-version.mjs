#!/usr/bin/env node

/**
 * Version synchronization utility for Antigravity Claude Code plugin.
 * Keeps package.json, .claude-plugin/plugin.json, and .claude-plugin/marketplace.json in sync.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const PKG_PATH = join(ROOT, 'package.json');
const PLUGIN_PATH = join(ROOT, '.claude-plugin', 'plugin.json');
const MARKETPLACE_PATH = join(ROOT, '.claude-plugin', 'marketplace.json');

const isCheck = process.argv.includes('--check');
const targetArg = process.argv.find((arg) => !arg.startsWith('-') && arg !== process.argv[0] && arg !== process.argv[1]);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

const pkg = readJson(PKG_PATH);
const plugin = readJson(PLUGIN_PATH);
const mkt = readJson(MARKETPLACE_PATH);

const pkgVer = pkg.version;
const pluginVer = plugin.version;
const mktVer = mkt.plugins?.[0]?.version || pluginVer;

if (isCheck) {
  console.log(`Checking version synchronization:`);
  console.log(`  package.json:               ${pkgVer}`);
  console.log(`  .claude-plugin/plugin.json: ${pluginVer}`);
  if (mkt.plugins?.[0]?.version) {
    console.log(`  .claude-plugin/marketplace: ${mkt.plugins[0].version}`);
  }

  if (pkgVer !== pluginVer || (mkt.plugins?.[0]?.version && mkt.plugins[0].version !== pkgVer)) {
    console.error(`\n❌ Version mismatch detected!`);
    console.error(`Run 'npm run bump-version <version>' to synchronize.\n`);
    process.exit(1);
  }

  console.log(`\n✅ All versions synchronized (${pkgVer}).\n`);
  process.exit(0);
}

// Bumping logic
if (!targetArg) {
  console.log(`Current version: ${pkgVer}`);
  console.log(`Usage: node scripts/bump-version.mjs <new-version | patch | minor | major>`);
  process.exit(0);
}

let newVersion = targetArg;

if (['patch', 'minor', 'major'].includes(targetArg)) {
  const parts = pkgVer.split('.').map(Number);
  if (targetArg === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (targetArg === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else if (targetArg === 'patch') {
    parts[2] += 1;
  }
  newVersion = parts.join('.');
}

pkg.version = newVersion;
plugin.version = newVersion;
if (mkt.plugins?.[0]) {
  mkt.plugins[0].version = newVersion;
}

writeJson(PKG_PATH, pkg);
writeJson(PLUGIN_PATH, plugin);
writeJson(MARKETPLACE_PATH, mkt);

console.log(`\n✅ Successfully bumped and synchronized version to ${newVersion} in:`);
console.log(`  - package.json`);
console.log(`  - .claude-plugin/plugin.json`);
console.log(`  - .claude-plugin/marketplace.json\n`);
