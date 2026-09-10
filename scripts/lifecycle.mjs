#!/usr/bin/env node

/**
 * Lifecycle hook runner for Claude Code.
 * Handles SessionStart (preflight checks) and SessionEnd (zombie process cleanup).
 * Designed to be non-blocking and safe on Windows and Unix.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const JOBS_DIR = join(process.cwd(), '.agy-jobs');
const STATE_FILE = join(JOBS_DIR, 'last-job.json');

const [action] = process.argv.slice(2);

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

switch (action) {
  case 'start':
    // Quick, non-blocking check on session start
    // Do not block on stdin or perform network calls
    process.exit(0);
    break;

  case 'end':
    // Gracefully clean up any running background tasks when Claude Code exits
    if (existsSync(STATE_FILE)) {
      try {
        const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
        if (state.pid && isProcessAlive(state.pid) && state.status === 'RUNNING') {
          console.error(`[Antigravity] Cleaning up background task PID ${state.pid} on session exit...`);
          if (process.platform === 'win32') {
            spawnSync('taskkill', ['/F', '/PID', state.pid.toString()], { stdio: 'ignore' });
          } else {
            process.kill(state.pid, 'SIGTERM');
          }
          state.status = 'TERMINATED_ON_EXIT';
          writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
        }
      } catch {
        // Silently ignore errors during exit cleanup
      }
    }
    process.exit(0);
    break;

  default:
    process.exit(0);
}
