import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('../', import.meta.url));
const farmCli = fileURLToPath(
  new URL('../node_modules/@farmfe/cli/bin/farm.mjs', import.meta.url)
);
const wranglerCli = fileURLToPath(
  new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url)
);

// Wrangler validates the configured assets directory even when API requests
// never read the production frontend bundle.
mkdirSync(join(rootDir, 'dist'), { recursive: true });

const processes = new Set();
let isStopping = false;
let exitCode = 0;
let forceExitTimer;

function terminate(child, signal) {
  if (!child.pid) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore'
    });
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function stop(code = 0) {
  if (isStopping) return;

  isStopping = true;
  exitCode = code;

  for (const child of processes) {
    terminate(child, 'SIGTERM');
  }

  forceExitTimer = setTimeout(() => {
    for (const child of processes) {
      terminate(child, 'SIGKILL');
    }
  }, 5000);
  forceExitTimer.unref();
}

function start(name, args) {
  const child = spawn(process.execPath, args, {
    cwd: rootDir,
    stdio: 'inherit',
    detached: process.platform !== 'win32'
  });

  processes.add(child);

  child.on('exit', (code, signal) => {
    processes.delete(child);

    if (processes.size === 0) {
      clearTimeout(forceExitTimer);
      process.exitCode = exitCode;
      return;
    }

    if (isStopping) return;

    console.error(`${name} exited (${signal ?? `code ${code ?? 0}`})`);
    stop(code ?? 1);
  });
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

start('Farm', [farmCli, 'start']);
start('Wrangler', [
  wranglerCli,
  'dev',
  '--config',
  join(rootDir, 'wrangler.jsonc'),
  '--ip',
  '127.0.0.1',
  '--port',
  '8787',
  '--live-reload'
]);
