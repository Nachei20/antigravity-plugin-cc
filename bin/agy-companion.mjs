#!/usr/bin/env node

/**
 * Antigravity Companion for Claude Code
 * Orchestrates cross-model code review, adversarial review, and rescue operations
 * using the Google Antigravity CLI (`agy`).
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import os from 'node:os';
import process from 'node:process';

const JOBS_DIR = join(process.cwd(), '.agy-jobs');
const STATE_FILE = join(JOBS_DIR, 'last-job.json');

// --- Helper Functions ---

function getAgyExecutable() {
  if (process.env.AGY_BIN_PATH && existsSync(process.env.AGY_BIN_PATH)) {
    return process.env.AGY_BIN_PATH;
  }

  // Windows default
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || join(os.homedir(), 'AppData', 'Local');
    const winPath = join(localAppData, 'agy', 'bin', 'agy.exe');
    if (existsSync(winPath)) return winPath;
  } else {
    // Unix default
    const unixPath = join(os.homedir(), '.local', 'bin', 'agy');
    if (existsSync(unixPath)) return unixPath;
  }

  // Fallback to checking PATH via where/which
  const lookupCmd = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(lookupCmd, ['agy'], { encoding: 'utf-8' });
  if (result.status === 0 && result.stdout.trim()) {
    const lines = result.stdout.trim().split(/\r?\n/);
    return lines[0].trim();
  }

  return 'agy';
}

function getGitDiff(baseRef = null) {
  try {
    let diffArgs = ['diff', 'HEAD'];
    if (baseRef) {
      diffArgs = ['diff', `${baseRef}...HEAD`];
    }
    const diffRes = spawnSync('git', diffArgs, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    const diff = diffRes.stdout || '';

    const statusRes = spawnSync('git', ['status', '--short'], { encoding: 'utf-8' });
    const status = statusRes.stdout || '';

    return { diff: diff.trim(), status: status.trim() };
  } catch {
    return { diff: '', status: '' };
  }
}

function ensureJobsDir() {
  if (!existsSync(JOBS_DIR)) {
    mkdirSync(JOBS_DIR, { recursive: true });
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// --- Subcommands ---

function cmdSetup() {
  console.log('\n=== Antigravity Companion Diagnostic ===\n');
  const agyPath = getAgyExecutable();
  console.log(`Detected Antigravity CLI binary: ${agyPath}`);

  const testRun = spawnSync(agyPath, ['--help'], { encoding: 'utf-8' });
  if (testRun.status === 0) {
    console.log('Antigravity CLI status: READY (Responsive)');
  } else {
    console.warn('Antigravity CLI warning: Binary found but exit code was', testRun.status);
  }

  const gitCheck = spawnSync('git', ['--version'], { encoding: 'utf-8' });
  if (gitCheck.status === 0) {
    console.log(`Git status: READY (${gitCheck.stdout.trim()})`);
  } else {
    console.error('Git status: NOT FOUND');
  }

  console.log('\nSetup verification complete. You can now use:\n');
  console.log('  /antigravity:review [--base <ref>] [--background]');
  console.log('  /antigravity:adversarial-review <focus-topic>');
  console.log('  /antigravity:rescue <task-or-bug>');
  console.log('  /antigravity:status | /antigravity:result | /antigravity:cancel\n');
}

function runAgyJob({ commandName, prompt, mode = 'plan', effort = 'high', background = false }) {
  const agyPath = getAgyExecutable();
  ensureJobsDir();

  const timestamp = Date.now();
  const logFile = join(JOBS_DIR, `job-${timestamp}.log`);

  const agyArgs = ['-p', prompt, '--mode', mode, '--effort', effort];

  if (background) {
    const outFd = openSync(logFile, 'a');
    const child = spawn(agyPath, agyArgs, {
      detached: true,
      stdio: ['ignore', outFd, outFd],
      windowsHide: true,
    });
    child.unref();

    const jobMeta = {
      id: `job-${timestamp}`,
      command: commandName,
      pid: child.pid,
      startTime: new Date().toISOString(),
      logFile,
      status: 'RUNNING',
    };
    writeFileSync(STATE_FILE, JSON.stringify(jobMeta, null, 2), 'utf-8');

    console.log(`\n[Antigravity] Started ${commandName} in background.`);
    console.log(`Job ID: ${jobMeta.id} (PID: ${jobMeta.pid})`);
    console.log(`Check status with:  /antigravity:status`);
    console.log(`View results with:  /antigravity:result\n`);
    return;
  }

  console.log(`\n[Antigravity] Running ${commandName} (effort: ${effort}, mode: ${mode})...\n`);
  const proc = spawnSync(agyPath, agyArgs, {
    encoding: 'utf-8',
    stdio: 'inherit',
    maxBuffer: 20 * 1024 * 1024,
  });

  if (proc.status !== 0) {
    console.error(`\n[Antigravity] Process exited with code ${proc.status}`);
    process.exit(proc.status || 1);
  }
}

async function cmdReview(args) {
  let baseRef = null;
  let background = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base' && args[i + 1]) {
      baseRef = args[++i];
    } else if (args[i] === '--background') {
      background = true;
    }
  }

  const { diff, status } = getGitDiff(baseRef);
  if (!diff && !status) {
    console.log('[Antigravity] No changes found to review.');
    return;
  }

  const prompt = [
    'Act as a Principal Software Engineer and Security Auditor.',
    'Conduct a rigorous, read-only code review on the following git changes.',
    'Inspect for bugs, security vulnerabilities, edge case oversights, regression risks, performance traps, and architectural consistency.',
    'Format your response with:',
    '1. Summary Verdict: (APPROVED | REVISE)',
    '2. Key Findings (categorized by severity: CRITICAL, HIGH, MEDIUM, LOW)',
    '3. Specific line-by-line recommendations or corrections.',
    '',
    baseRef ? `Comparing against base branch: ${baseRef}` : 'Reviewing uncommitted work against HEAD.',
    '',
    status ? `Git Status:\n${status}\n` : '',
    'Diff:',
    '```diff',
    diff.slice(0, 150000), // Protect against mega-diff overflows
    '```',
  ].join('\n');

  runAgyJob({ commandName: 'Code Review', prompt, mode: 'plan', effort: 'high', background });
}

async function cmdAdversarialReview(args) {
  let baseRef = null;
  let background = false;
  const focusWords = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base' && args[i + 1]) {
      baseRef = args[++i];
    } else if (args[i] === '--background') {
      background = true;
    } else {
      focusWords.push(args[i]);
    }
  }

  const focus = focusWords.join(' ').trim() || 'General design assumptions and potential failure modes';
  const { diff, status } = getGitDiff(baseRef);

  const prompt = [
    'Act as a skeptical, adversarial software auditor.',
    'Your goal is to actively challenge the chosen implementation, uncover hidden assumptions, test rollback strategies, detect race conditions, and identify failure modes.',
    `Specific Focus Area: "${focus}"`,
    'Be brutally honest, constructive, and uncompromising on engineering discipline.',
    'Format your response with:',
    '1. Architecture & Design Critique',
    '2. Potential Blind Spots and Hidden Failure Scenarios',
    '3. Alternatives that would be simpler, safer, or more resilient',
    '4. Critical questions the developer must answer before proceeding',
    '',
    baseRef ? `Comparing against base: ${baseRef}` : 'Auditing current changes against HEAD.',
    '',
    status ? `Git Status:\n${status}\n` : '',
    diff ? `Diff:\n\`\`\`diff\n${diff.slice(0, 150000)}\n\`\`\`` : '(No diff found; auditing stated architectural focus)',
  ].join('\n');

  runAgyJob({ commandName: 'Adversarial Review', prompt, mode: 'plan', effort: 'high', background });
}

async function cmdRescue(args) {
  const taskText = args.join(' ').trim();
  if (!taskText) {
    console.error('Error: Please specify the task or error description for /antigravity:rescue.');
    process.exit(1);
  }

  const { status } = getGitDiff();

  const prompt = [
    'Claude Code has handed over this task for rescue delegation.',
    'Investigate the problem thoroughly in this repository, identify the root cause, and implement or propose the definitive fix.',
    '',
    `Task / Error Description:\n${taskText}`,
    '',
    status ? `Current Git Status:\n${status}\n` : '',
  ].join('\n');

  runAgyJob({ commandName: 'Task Rescue', prompt, mode: 'accept-edits', effort: 'high', background: false });
}

function cmdStatus() {
  if (!existsSync(STATE_FILE)) {
    console.log('[Antigravity] No active or recorded background jobs.');
    return;
  }

  const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  const alive = state.pid && isProcessAlive(state.pid);

  console.log('\n=== Antigravity Background Job Status ===');
  console.log(`Command:     ${state.command}`);
  console.log(`Job ID:      ${state.id}`);
  console.log(`Process PID: ${state.pid}`);
  console.log(`Started:     ${state.startTime}`);
  console.log(`State:       ${alive ? 'RUNNING ⏳' : 'COMPLETED ✅'}`);
  console.log(`Log file:    ${state.logFile}\n`);

  if (!alive) {
    console.log('To view the final result, run: /antigravity:result\n');
  }
}

function cmdResult() {
  if (!existsSync(STATE_FILE)) {
    console.log('[Antigravity] No job records found.');
    return;
  }

  const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  if (!existsSync(state.logFile)) {
    console.log('[Antigravity] Log file does not exist yet.');
    return;
  }

  const content = readFileSync(state.logFile, 'utf-8');
  console.log(`\n=== Result for ${state.command} (${state.id}) ===\n`);
  console.log(content.trim() || '(No output recorded yet)');
  console.log('\n==================================================\n');
}

function cmdCancel() {
  if (!existsSync(STATE_FILE)) {
    console.log('[Antigravity] No background job to cancel.');
    return;
  }

  const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  if (state.pid && isProcessAlive(state.pid)) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/F', '/PID', state.pid.toString()]);
      } else {
        process.kill(state.pid, 'SIGTERM');
      }
      console.log(`[Antigravity] Successfully cancelled job ${state.id} (PID ${state.pid}).`);
    } catch (e) {
      console.error(`[Antigravity] Failed to terminate process: ${e.message}`);
    }
  } else {
    console.log(`[Antigravity] Job ${state.id} is not running.`);
  }
}

// --- Main CLI Router ---

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case 'review':
    await cmdReview(args);
    break;
  case 'adversarial-review':
    await cmdAdversarialReview(args);
    break;
  case 'rescue':
    await cmdRescue(args);
    break;
  case 'status':
    cmdStatus();
    break;
  case 'result':
    cmdResult();
    break;
  case 'cancel':
    cmdCancel();
    break;
  case 'setup':
    cmdSetup();
    break;
  default:
    console.log(`
Antigravity Plugin for Claude Code (CLI Companion)

Commands:
  review [--base <ref>] [--background]
  adversarial-review [--base <ref>] [--background] <focus>
  rescue <task>
  status
  result
  cancel
  setup
`);
    break;
}
