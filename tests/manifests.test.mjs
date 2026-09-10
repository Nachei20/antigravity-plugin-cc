import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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

  // Verify hooks declaration and targets
  assert.ok(plugin.hooks, 'plugin must define hooks file');
  const fullHooksPath = join(ROOT, plugin.hooks);
  assert.ok(existsSync(fullHooksPath), `Hooks file does not exist: ${plugin.hooks}`);
  const hooksData = JSON.parse(readFileSync(fullHooksPath, 'utf-8'));
  assert.ok(hooksData.hooks, 'hooks.json must contain hooks object');
  assert.ok(hooksData.hooks.SessionStart, 'hooks must define SessionStart');
  assert.ok(hooksData.hooks.SessionEnd, 'hooks must define SessionEnd');

  // Verify skills declaration and targets
  assert.ok(plugin.skills, 'plugin must define skills');
  for (const [skillName, skillRelPath] of Object.entries(plugin.skills)) {
    const fullSkillPath = join(ROOT, skillRelPath);
    assert.ok(
      existsSync(fullSkillPath),
      `Skill '${skillName}' points to non-existent file: ${skillRelPath}`
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

test('lifecycle script executes cleanly on start and end', () => {
  const lifecyclePath = join(ROOT, 'scripts', 'lifecycle.mjs');
  assert.ok(existsSync(lifecyclePath), 'scripts/lifecycle.mjs must exist');

  const startRes = spawnSync('node', [lifecyclePath, 'start'], { cwd: ROOT, encoding: 'utf-8' });
  assert.equal(startRes.status, 0);

  const endRes = spawnSync('node', [lifecyclePath, 'end'], { cwd: ROOT, encoding: 'utf-8' });
  assert.equal(endRes.status, 0);
});

