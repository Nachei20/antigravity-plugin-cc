import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PLUGIN_DIR = join(ROOT, 'plugins', 'antigravity');

test('package.json exists and is valid', () => {
  const pkgPath = join(ROOT, 'package.json');
  assert.ok(existsSync(pkgPath), 'package.json must exist');

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  assert.equal(pkg.name, 'antigravity-plugin-cc');
  assert.ok(pkg.version, 'package must have a version');
  assert.equal(pkg.type, 'module', 'package must be ESM');
  assert.ok(pkg.bin['antigravity-companion'], 'package must declare binary');
});

test('plugins/antigravity/.claude-plugin/plugin.json is valid and all command files exist', () => {
  const pluginPath = join(PLUGIN_DIR, '.claude-plugin', 'plugin.json');
  assert.ok(existsSync(pluginPath), 'plugin.json must exist');

  const plugin = JSON.parse(readFileSync(pluginPath, 'utf-8'));
  assert.equal(plugin.name, 'antigravity');
  assert.equal(typeof plugin.author?.name, 'string', 'author must be an object with a name');

  // Claude Code auto-discovers commands/, agents/, skills/ and hooks/hooks.json; name->file maps are not valid manifest values.
  for (const key of ['commands', 'agents', 'skills', 'hooks']) {
    assert.equal(plugin[key], undefined, `plugin.json must not declare '${key}': rely on the default ${key}/ directory`);
  }

  for (const cmd of ['review', 'adversarial-review', 'rescue', 'transfer', 'status', 'result', 'cancel', 'setup', 'loop']) {
    assert.ok(existsSync(join(PLUGIN_DIR, 'commands', `${cmd}.md`)), `missing commands/${cmd}.md`);
  }
  // One subagent per agy model. CLAUDE_PLUGIN_ROOT is unset in a subagent's Bash tool, but Claude Code substitutes the
  // literal ${CLAUDE_PLUGIN_ROOT} in agent bodies; the `${CLAUDE_PLUGIN_ROOT:-.}` shell form is not substituted.
  const agents = readdirSync(join(PLUGIN_DIR, 'agents'));
  assert.ok(agents.length >= 1, 'plugins/antigravity must ship its agy-* subagents');
  for (const file of agents) {
    const body = readFileSync(join(PLUGIN_DIR, 'agents', file), 'utf-8');
    const name = file.replace(/\.md$/, '');
    assert.match(name, /^agy-/, `${file}: subagents are named agy-<alias>`);
    assert.match(body, new RegExp(`^name: ${name}$`, 'm'), `${file}: name must match the file name`);
    const command = body.match(/```bash\n([\s\S]*?)```/)?.[1] ?? '';
    assert.ok(command.includes('node "${CLAUDE_PLUGIN_ROOT}/bin/agy-companion.mjs" rescue --wait --model '), `${file}: must call the companion synchronously with a fixed model`);
    assert.doesNotMatch(command, /dangerously|yolo|bypass|--effort/, `${file}: no permission bypass, and no --effort next to a model slug`);
    assert.ok(!body.includes('CLAUDE_PLUGIN_ROOT:-'), `${file}: must not use the unsubstituted shell fallback`);
    assert.doesNotMatch(body, /^permissionMode:/m, `${file}: must not set a permission mode`);
  }
  assert.ok(existsSync(join(PLUGIN_DIR, 'skills', 'antigravity-code-review', 'SKILL.md')), 'missing skills/antigravity-code-review/SKILL.md');

  // The loop lives only in the claudegravity-loop plugin; /antigravity:loop must delegate, not bundle a copy.
  assert.ok(!existsSync(join(PLUGIN_DIR, 'skills', 'claudegravity-loop')), 'skills/claudegravity-loop must not be bundled');
  const loopCmd = readFileSync(join(PLUGIN_DIR, 'commands', 'loop.md'), 'utf-8');
  assert.ok(loopCmd.includes('claudegravity-loop:claudegravity-loop'), 'commands/loop.md must delegate to the claudegravity-loop plugin skill');

  const hooksData = JSON.parse(readFileSync(join(PLUGIN_DIR, 'hooks', 'hooks.json'), 'utf-8'));
  assert.ok(hooksData.hooks, 'hooks.json must contain hooks object');
  assert.ok(hooksData.hooks.SessionStart, 'hooks must define SessionStart');
  assert.ok(hooksData.hooks.SessionEnd, 'hooks must define SessionEnd');
});

test('companion commands run through `!` injection so ${CLAUDE_PLUGIN_ROOT} resolves', () => {
  // A fenced bash block is run by the model through the Bash tool, where CLAUDE_PLUGIN_ROOT is not set.
  for (const cmd of ['review', 'adversarial-review', 'rescue', 'transfer', 'status', 'result', 'cancel', 'setup']) {
    const body = readFileSync(join(PLUGIN_DIR, 'commands', `${cmd}.md`), 'utf-8');
    assert.ok(
      body.includes('!`node "${CLAUDE_PLUGIN_ROOT}/bin/agy-companion.mjs" ' + cmd),
      `commands/${cmd}.md must inject the companion call with !\`...\``
    );
    assert.match(body, /^allowed-tools: Bash\(node:\*\)$/m, `commands/${cmd}.md must allow Bash(node:*)`);
    assert.ok(!body.includes('CLAUDE_PLUGIN_ROOT:-'), `commands/${cmd}.md must not fall back to the current directory`);
  }
});

test('.claude-plugin/marketplace.json is valid', () => {
  const mktPath = join(ROOT, '.claude-plugin', 'marketplace.json');
  assert.ok(existsSync(mktPath), 'marketplace.json must exist');

  const mkt = JSON.parse(readFileSync(mktPath, 'utf-8'));
  assert.equal(mkt.name, 'antigravity');
  assert.equal(typeof mkt.owner?.name, 'string', 'marketplace must declare owner.name');
  assert.ok(Array.isArray(mkt.plugins), 'marketplace must have plugins array');
  assert.ok(mkt.plugins.length > 0, 'marketplace must declare at least one plugin');
  assert.equal(mkt.plugins[0].name, 'antigravity');
  assert.equal(mkt.plugins[0].source, './plugins/antigravity', 'marketplace must declare source as ./plugins/antigravity');
});

test('lifecycle script executes cleanly on start and end', () => {
  const lifecyclePath = join(PLUGIN_DIR, 'scripts', 'lifecycle.mjs');
  assert.ok(existsSync(lifecyclePath), 'plugins/antigravity/scripts/lifecycle.mjs must exist');

  const startRes = spawnSync('node', [lifecyclePath, 'start'], { cwd: ROOT, encoding: 'utf-8' });
  assert.equal(startRes.status, 0);

  const endRes = spawnSync('node', [lifecyclePath, 'end'], { cwd: ROOT, encoding: 'utf-8' });
  assert.equal(endRes.status, 0);
});

