#!/usr/bin/env node

/**
 * Antigravity Companion for Claude Code
 * Orchestrates cross-model code review, adversarial review, task rescue,
 * and session transfer using the Google Antigravity CLI (`agy`).
 */

import { spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import process from 'node:process';

const JOBS_DIR = join(process.cwd(), '.agy-jobs');
const STATE_FILE = join(JOBS_DIR, 'last-job.json');
// ponytail: one fixed cap for every job; make it a flag if reviews routinely need longer.
const PRINT_TIMEOUT = '30m';
const EFFORTS = ['low', 'medium', 'high', 'max'];

// --- Helper Functions ---

export function getAgyExecutable() {
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

export function getGitDiff(baseRef = null) {
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
  mkdirSync(JOBS_DIR, { recursive: true });
  // Jobs live inside the user's project: keep them out of its git status (and out of the next review).
  const ignoreFile = join(JOBS_DIR, '.gitignore');
  if (!existsSync(ignoreFile)) writeFileSync(ignoreFile, '*\n', 'utf-8');
}

// `!` command injection hands over "$ARGUMENTS" as one string; split it back into words.
export function splitArgs(argv) {
  return argv.length === 1 ? argv[0].split(/\s+/).filter(Boolean) : argv;
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

export function cmdSetup() {
  console.log('\n=== Antigravity Companion Diagnostic ===\n');
  const agyPath = getAgyExecutable();
  console.log(`Detected Antigravity CLI binary: ${agyPath}`);

  const testRun = spawnSync(agyPath, ['--help'], { encoding: 'utf-8', timeout: 30_000 });
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

  console.log('\nSetup verification complete. Available commands:\n');
  console.log('  /antigravity:review [--base <ref>] [--model <m>] [--effort <e>]');
  console.log('  /antigravity:adversarial-review [--base <ref>] [--model <m>] <focus>');
  console.log('  /antigravity:rescue [--model <m>] [--effort <e>] <task-or-bug>');
  console.log('  /antigravity:transfer [--model <m>] [--effort <e>] [notes]');
  console.log('  /antigravity:status | /antigravity:result | /antigravity:cancel\n');
}

export function agyArgs({ mode, effort, model = null, addDir = null }) {
  const args = ['--mode', mode, '--effort', effort, '--print-timeout', PRINT_TIMEOUT];
  if (model) args.push('--model', model);
  if (addDir) args.push('--add-dir', addDir);
  return args;
}

/**
 * Starts agy detached and returns at once; /antigravity:status and /antigravity:result follow it up.
 * The prompt goes in on stdin from a file: a diff in argv overflows the Windows command-line limit.
 */
export function startAgyJob({ commandName, prompt, mode = 'plan', effort = 'high', model = null, addDir = null }) {
  if (!EFFORTS.includes(effort)) {
    console.error(`Error: --effort must be one of ${EFFORTS.join(', ')} (got "${effort}").`);
    process.exit(1);
  }

  ensureJobsDir();
  const id = `job-${Date.now()}`;
  const promptFile = join(JOBS_DIR, `${id}.prompt.md`);
  const logFile = join(JOBS_DIR, `${id}.log`);
  writeFileSync(promptFile, prompt, 'utf-8');

  const agyPath = getAgyExecutable();
  const args = agyArgs({ mode, effort, model, addDir });
  const inFd = openSync(promptFile, 'r');
  const outFd = openSync(logFile, 'a');
  let child;
  try {
    child = spawn(agyPath, args, { detached: true, stdio: [inFd, outFd, outFd], windowsHide: true });
  } finally {
    closeSync(inFd);
    closeSync(outFd);
  }
  if (!child.pid) {
    console.error(`[Antigravity] Could not start agy (${agyPath}). Run /antigravity:setup.`);
    process.exit(1);
  }
  child.unref();

  const jobMeta = { id, command: commandName, pid: child.pid, startTime: new Date().toISOString(), args, promptFile, logFile };
  writeFileSync(STATE_FILE, JSON.stringify(jobMeta, null, 2), 'utf-8');

  console.log(`\n[Antigravity] Started ${commandName} in the background (mode: ${mode}, effort: ${effort}${model ? `, model: ${model}` : ''}).`);
  console.log(`Job ID: ${id} (PID: ${child.pid}, time limit: ${PRINT_TIMEOUT})`);
  console.log('Check progress with: /antigravity:status');
  console.log('Read the answer with: /antigravity:result\n');
}

export async function cmdReview(args) {
  let baseRef = null;
  let model = null;
  let effort = 'high';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base' && args[i + 1]) {
      baseRef = args[++i];
    } else if (args[i] === '--background') {
      // Accepted for compatibility: every job already runs in the background.
    } else if (args[i] === '--model' && args[i + 1]) {
      model = args[++i];
    } else if (args[i] === '--effort' && args[i + 1]) {
      effort = args[++i];
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
    diff.slice(0, 150000),
    '```',
  ].join('\n');

  startAgyJob({ commandName: 'Code Review', prompt, mode: 'plan', effort, model });
}

export async function cmdAdversarialReview(args) {
  let baseRef = null;
  let model = null;
  let effort = 'high';
  const focusWords = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--base' && args[i + 1]) {
      baseRef = args[++i];
    } else if (args[i] === '--background') {
      // Accepted for compatibility: every job already runs in the background.
    } else if (args[i] === '--model' && args[i + 1]) {
      model = args[++i];
    } else if (args[i] === '--effort' && args[i + 1]) {
      effort = args[++i];
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

  startAgyJob({ commandName: 'Adversarial Review', prompt, mode: 'plan', effort, model });
}

export async function cmdRescue(args) {
  let model = null;
  let effort = 'high';
  const taskWords = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[++i];
    } else if (args[i] === '--effort' && args[i + 1]) {
      effort = args[++i];
    } else {
      taskWords.push(args[i]);
    }
  }

  const taskText = taskWords.join(' ').trim();
  if (!taskText) {
    console.error('Error: Please specify the task or error description for /antigravity:rescue.');
    process.exit(1);
  }

  const { status } = getGitDiff();

  const prompt = [
    'Claude Code has handed over this task for rescue delegation.',
    'Investigate the problem thoroughly in this repository, identify the root cause, and implement or propose the definitive fix.',
    `Repository root (absolute path): ${process.cwd()}. Read and edit files only inside that directory.`,
    '',
    `Task / Error Description:\n${taskText}`,
    '',
    status ? `Current Git Status:\n${status}\n` : '',
  ].join('\n');

  startAgyJob({ commandName: 'Task Rescue', prompt, mode: 'accept-edits', effort, model, addDir: process.cwd() });
}

export async function cmdTransfer(args) {
  let model = null;
  let effort = 'high';
  const notesWords = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[++i];
    } else if (args[i] === '--effort' && args[i + 1]) {
      effort = args[++i];
    } else {
      notesWords.push(args[i]);
    }
  }

  const userNotes = notesWords.join(' ').trim();
  const { diff, status } = getGitDiff();

  let branch = 'main';
  try {
    const branchRes = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf-8' });
    if (branchRes.status === 0 && branchRes.stdout.trim()) {
      branch = branchRes.stdout.trim();
    }
  } catch {}

  const prompt = [
    'Session transferred from Claude Code to Google Antigravity.',
    `Active Git Branch: ${branch}`,
    status ? `Git Status:\n${status}\n` : '',
    diff ? `Uncommitted Changes:\n\`\`\`diff\n${diff.slice(0, 50000)}\n\`\`\`\n` : '',
    userNotes ? `User instructions / Context:\n${userNotes}` : 'Please assist the user with continuing their development work.',
  ].join('\n');

  // agy -i needs an interactive terminal, which a slash command does not have: hand the user the command instead.
  ensureJobsDir();
  const handoffFile = join(JOBS_DIR, `transfer-${Date.now()}.md`);
  writeFileSync(handoffFile, prompt, 'utf-8');

  const flags = [`--effort ${effort}`, model ? `--model ${model}` : ''].filter(Boolean).join(' ');
  console.log(`\n[Antigravity] Handoff written to ${handoffFile} (branch: ${branch}).`);
  console.log('Run this in your own terminal to continue in an interactive Antigravity session:\n');
  console.log(`  agy -i "Read the handoff file ${handoffFile} and continue the work it describes." --mode accept-edits --add-dir "${process.cwd()}" ${flags}\n`);
}

export function cmdStatus() {
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

export function cmdResult() {
  if (!existsSync(STATE_FILE)) {
    console.log('[Antigravity] No job records found.');
    return;
  }

  const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  if (!existsSync(state.logFile)) {
    console.log('[Antigravity] Log file does not exist yet.');
    return;
  }

  const content = readFileSync(state.logFile, 'utf-8').trim();
  const running = state.pid && isProcessAlive(state.pid);
  console.log(`\n=== Result for ${state.command} (${state.id}) ===\n`);
  if (content) {
    console.log(content);
  } else if (running) {
    console.log('(Still running: no output yet. Check again with /antigravity:status.)');
  } else {
    // Headless agy auto-denies tool use and still exits 0 with no output.
    console.log('(agy finished without any output. This is NOT an approval: rerun the job or check /antigravity:setup.)');
  }
  console.log('\n==================================================\n');
}

export function cmdCancel() {
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

const [command, ...rawArgs] = process.argv.slice(2);
const args = splitArgs(rawArgs);

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
  case 'transfer':
    await cmdTransfer(args);
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
  review [--base <ref>] [--model <m>] [--effort <e>]                     background job, read-only
  adversarial-review [--base <ref>] [--model <m>] [--effort <e>] <focus>  background job, read-only
  rescue [--model <m>] [--effort <e>] <task>                              background job, edits the repo
  transfer [--model <m>] [--effort <e>] [notes]                           prints an agy -i command
  status
  result
  cancel
  setup
`);
    break;
}
