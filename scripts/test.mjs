#!/usr/bin/env node

import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const testsDir = resolve(__dirname, '..', 'tests');
const files = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.mjs'))
  .map((f) => join(testsDir, f));

const res = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(res.status ?? 1);
