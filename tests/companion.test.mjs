import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const COMPANION_PATH = join(ROOT, 'plugins', 'antigravity', 'bin', 'agy-companion.mjs');
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
  assert.match(res.stdout, /transfer/);
  assert.match(res.stdout, /--model/);
  assert.match(res.stdout, /--effort/);
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

  // The recorded PID is alive (this very process), as when Windows hands a finished job's PID to another
  // process: the exit record, not the PID, must decide that the job is done.
  const mockState = {
    id: 'job-test-123',
    command: 'Code Review',
    pid: process.pid,
    startTime: new Date().toISOString(),
    logFile: mockLog,
  };
  const mockExit = join(JOBS_DIR, 'job-test-123.exit.json');
  writeFileSync(STATE_FILE, JSON.stringify(mockState, null, 2), 'utf-8');
  writeFileSync(mockExit, JSON.stringify({ code: 0, endTime: new Date().toISOString() }), 'utf-8');

  try {
    const statusRes = spawnSync('node', [COMPANION_PATH, 'status'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    assert.equal(statusRes.status, 0);
    assert.match(statusRes.stdout, /job-test-123/);
    assert.match(statusRes.stdout, /COMPLETED/);
    assert.doesNotMatch(statusRes.stdout, /RUNNING/);

    const resultRes = spawnSync('node', [COMPANION_PATH, 'result'], {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    assert.equal(resultRes.status, 0);
    assert.match(resultRes.stdout, /VERDICT: APPROVED/);
  } finally {
    rmSync(mockLog, { force: true });
    rmSync(mockExit, { force: true });
    rmSync(STATE_FILE, { force: true });
  }
});

// --- Background jobs, transfer and results (a stand-in "agy": node itself rejects the flags and exits) ---

function tempProject(withGit = false) {
  // realpath: on macOS the temp dir is a symlink (/var -> /private/var) and the companion sees the resolved cwd.
  const dir = realpathSync(mkdtempSync(join(os.tmpdir(), 'agy-companion-')));
  if (withGit) {
    spawnSync('git', ['init', '-q'], { cwd: dir });
    writeFileSync(join(dir, 'app.js'), 'console.log(1);\n', 'utf-8');
  }
  return dir;
}

// `!` command injection passes "$ARGUMENTS" as a single string, so every call below does the same.
function runCompanion(cwd, command, rawArgs) {
  const argv = [COMPANION_PATH, command];
  if (rawArgs !== undefined) argv.push(rawArgs);
  return spawnSync('node', argv, { cwd, encoding: 'utf-8', env: { ...process.env, AGY_BIN_PATH: process.execPath } });
}

function readJobState(cwd) {
  return JSON.parse(readFileSync(join(cwd, '.agy-jobs', 'last-job.json'), 'utf-8'));
}

// The detached job ran with the temp dir as cwd; Windows keeps that dir locked for a moment after the process exits.
function cleanup(dir) {
  for (let i = 0; ; i++) {
    try {
      return rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      if (!['EBUSY', 'EPERM'].includes(e.code) || i >= 50) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    }
  }
}

test('rescue starts a background job with the prompt on stdin, an explicit timeout and the repo as workspace', () => {
  const dir = tempProject();
  try {
    const res = runCompanion(dir, 'rescue', '--effort low fix the flaky login test');
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.match(res.stdout, /Job ID: job-\d+/);

    const state = readJobState(dir);
    assert.ok(!state.args.includes('-p'), 'the prompt must not travel in argv (Windows command-line limit)');
    assert.deepEqual(state.args.slice(0, 4), ['--mode', 'accept-edits', '--effort', 'low']);
    assert.ok(state.args.includes('--print-timeout'), 'background jobs need an explicit timeout');
    assert.equal(state.args[state.args.indexOf('--add-dir') + 1], dir);
    assert.equal(state.cwd, dir, 'rescue must run inside the repository it fixes');

    const prompt = readFileSync(state.promptFile, 'utf-8');
    assert.match(prompt, /fix the flaky login test/);
    assert.ok(prompt.includes(dir), 'rescue prompt must name the absolute repository path');
    assert.equal(readFileSync(join(dir, '.agy-jobs', '.gitignore'), 'utf-8').trim(), '*');
  } finally {
    cleanup(dir);
  }
});

test('review always runs in the background, read-only', () => {
  const dir = tempProject(true);
  try {
    const res = runCompanion(dir, 'review', '');
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const state = readJobState(dir);
    assert.deepEqual(state.args.slice(0, 2), ['--mode', 'plan']);
    assert.ok(!state.args.includes('--add-dir'));
    // agy's --mode plan has executed its own plan in a real run: reviews get an empty workspace outside the repo.
    assert.ok(!resolve(state.cwd).startsWith(resolve(dir)), 'a review must not run inside the repository');
    const prompt = readFileSync(state.promptFile, 'utf-8');
    assert.match(prompt, /app\.js/);
    assert.match(prompt, /Do not create, modify or delete any file/);

    for (let i = 0; i < 100 && existsSync(state.cwd); i++) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
    assert.ok(!existsSync(state.cwd), 'an empty review workspace must be removed when the job ends');
  } finally {
    cleanup(dir);
  }
});

test('an invalid --effort is rejected before any job starts', () => {
  const dir = tempProject();
  try {
    const res = runCompanion(dir, 'rescue', '--effort extreme fix it');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /--effort/);
    assert.ok(!existsSync(join(dir, '.agy-jobs', 'last-job.json')));
  } finally {
    cleanup(dir);
  }
});

test('transfer writes a handoff file and prints the agy -i command instead of launching it', () => {
  const dir = tempProject();
  try {
    const res = runCompanion(dir, 'transfer', '--model gemini-test keep going with the parser');
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.match(res.stdout, /agy -i /);
    assert.match(res.stdout, /--model gemini-test/);
    const handoff = res.stdout.match(/(\S+transfer-\d+\.md)/)[1];
    assert.match(readFileSync(handoff, 'utf-8'), /keep going with the parser/);
  } finally {
    cleanup(dir);
  }
});

test('result says a finished job with no output is not an approval', () => {
  const dir = tempProject();
  try {
    mkdirSync(join(dir, '.agy-jobs'));
    const logFile = join(dir, '.agy-jobs', 'job-1.log');
    writeFileSync(logFile, '', 'utf-8');
    writeFileSync(
      join(dir, '.agy-jobs', 'last-job.json'),
      JSON.stringify({ id: 'job-1', command: 'Code Review', pid: 9999999, startTime: new Date().toISOString(), logFile }),
      'utf-8'
    );
    const res = runCompanion(dir, 'result');
    assert.equal(res.status, 0);
    assert.match(res.stdout, /NOT an approval/);
  } finally {
    cleanup(dir);
  }
});

test('status reports the exit code once a job fails', () => {
  const dir = tempProject();
  try {
    assert.equal(runCompanion(dir, 'rescue', 'fix it').status, 0);
    const exitFile = join(dir, '.agy-jobs', `${readJobState(dir).id}.exit.json`);
    for (let i = 0; i < 100 && !existsSync(exitFile); i++) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
    assert.ok(existsSync(exitFile), 'the job runner must write an exit record');

    const res = runCompanion(dir, 'status');
    assert.match(res.stdout, /FAILED/);
    assert.match(res.stdout, /exit 9/); // node rejects agy's flags with exit code 9
  } finally {
    cleanup(dir);
  }
});
