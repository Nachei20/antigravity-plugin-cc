import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

test('package.json exists and is valid', () => {
  const pkgPath = join(ROOT, 'package.json');
  assert.ok(existsSync(pkgPath), 'package.json must exist');

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  assert.equal(pkg.name, 'antigravity-plugin-cc');
  assert.ok(pkg.version, 'package must have a version');
  assert.equal(pkg.type, 'module', 'package must be ESM');
  assert.ok(pkg.bin['antigravity-companion'], 'package must declare binary');
});

test('.claude-plugin/plugin.json is valid and all command files exist', () => {
  const pluginPath = join(ROOT, '.claude-plugin', 'plugin.json');
  assert.ok(existsSync(pluginPath), 'plugin.json must exist');

  const plugin = JSON.parse(readFileSync(pluginPath, 'utf-8'));
  assert.equal(plugin.name, 'antigravity');
  assert.ok(plugin.commands, 'plugin must define commands');

  // Verify each command target file exists
  for (const [cmdName, cmdRelPath] of Object.entries(plugin.commands)) {
    const fullCmdPath = join(ROOT, cmdRelPath);
    assert.ok(
      existsSync(fullCmdPath),
      `Command '${cmdName}' points to non-existent file: ${cmdRelPath}`
    );
  }

  assert.ok(plugin.commands.transfer, 'plugin must include transfer command');
  assert.ok(plugin.agents, 'plugin must define agents');

  for (const [agentName, agentRelPath] of Object.entries(plugin.agents)) {
    const fullAgentPath = join(ROOT, agentRelPath);
    assert.ok(
      existsSync(fullAgentPath),
      `Agent '${agentName}' points to non-existent file: ${agentRelPath}`
    );
  }
});

test('.claude-plugin/marketplace.json is valid', () => {
  const mktPath = join(ROOT, '.claude-plugin', 'marketplace.json');
  assert.ok(existsSync(mktPath), 'marketplace.json must exist');

  const mkt = JSON.parse(readFileSync(mktPath, 'utf-8'));
  assert.equal(mkt.name, 'antigravity');
  assert.ok(Array.isArray(mkt.plugins), 'marketplace must have plugins array');
  assert.ok(mkt.plugins.length > 0, 'marketplace must declare at least one plugin');
  assert.equal(mkt.plugins[0].name, 'antigravity');
});
