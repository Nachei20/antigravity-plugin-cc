import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const COMPANION_PATH = join(ROOT, 'bin', 'agy-companion.mjs');
const JOBS_DIR = join(ROOT, '.agy-jobs');
const STATE_FILE = join(JOBS_DIR, 'last-job.json');

test('companion setup command exits with code 0', () => {
  const res = spawnSync('node', [COMPANION_PATH, 'setup'], {
    cwd: ROOT,
    encoding: 'utf-8',
  });

  assert.equal(res.status, 0, `Expected 0, got ${res.status}. Output: ${res.stderr || res.stdout}`);
  assert.match(res.stdout, /Antigravity Companion Diagnostic/);
  assert.match(res.stdout, /Detected Antigravity CLI binary/);
});

test('companion prints usage on unknown command or empty arguments', () => {
  const res = spawnSync('node', [COMPANION_PATH, '--help'], {
    cwd: ROOT,
    encoding: 'utf-8',
  });

  assert.equal(res.status, 0);
  assert.match(res.stdout, /Antigravity Plugin for Claude Code/);
  assert.match(res.stdout, /review/);
  assert.match(res.stdout, /adversarial-review/);
  assert.match(res.stdout, /rescue/);
});

test('status, result, and cancel handle empty jobs gracefully', () => {
  // Back up existing state if any
  let backup = null;
  if (existsSync(STATE_FILE)) {
    backup = readFileSync(STATE_FILE, 'utf-8');
    rmSync(STATE_FILE, { force: true });
  }

  try {
    const statusRes = spawnSync('node', [COMPANION_PATH, 'status'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    assert.equal(statusRes.status, 0);
    assert.match(statusRes.stdout, /No active or recorded background jobs/);

    const resultRes = spawnSync('node', [COMPANION_PATH, 'result'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    assert.equal(resultRes.status, 0);
    assert.match(resultRes.stdout, /No job records found/);

    const cancelRes = spawnSync('node', [COMPANION_PATH, 'cancel'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    assert.equal(cancelRes.status, 0);
    assert.match(cancelRes.stdout, /No background job to cancel/);
  } finally {
    if (backup !== null) {
      writeFileSync(STATE_FILE, backup, 'utf-8');
    }
  }
});

test('mock background job state tracking lifecycle', () => {
  if (!existsSync(JOBS_DIR)) {
    mkdirSync(JOBS_DIR, { recursive: true });
  }

  const mockLog = join(JOBS_DIR, 'mock-test.log');
  writeFileSync(mockLog, 'Mock review output: VERDICT: APPROVED\nAll checks passed.\n', 'utf-8');

  const mockState = {
    id: 'job-test-123',
    command: 'Code Review',
    pid: 9999999, // Unlikely to be alive
    startTime: new Date().toISOString(),
    logFile: mockLog,
    status: 'COMPLETED',
  };
  writeFileSync(STATE_FILE, JSON.stringify(mockState, null, 2), 'utf-8');

  try {
    const statusRes = spawnSync('node', [COMPANION_PATH, 'status'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    assert.equal(statusRes.status, 0);
    assert.match(statusRes.stdout, /job-test-123/);
    assert.match(statusRes.stdout, /COMPLETED/);

    const resultRes = spawnSync('node', [COMPANION_PATH, 'result'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    assert.equal(resultRes.status, 0);
    assert.match(resultRes.stdout, /VERDICT: APPROVED/);
  } finally {
    rmSync(mockLog, { force: true });
    rmSync(STATE_FILE, { force: true });
  }
});
