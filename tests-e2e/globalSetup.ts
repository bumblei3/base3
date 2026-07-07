import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const ROOT = '/home/tobber/base3';
const HS = 'node_modules/http-server/bin/http-server';

interface ServerSpec {
  name: string;
  dir: string;
  port: number;
  pidFile: string;
}

const SERVERS: ServerSpec[] = [
  { name: 'schach9x9', dir: 'dist/schach9x9', port: 3000, pidFile: '/tmp/e2e-setup/schach9x9.pid' },
  { name: 'trischach', dir: 'dist/trischach', port: 3001, pidFile: '/tmp/e2e-setup/trischach.pid' },
];

function waitForServer(_proc: ReturnType<typeof spawn>, port: number, name: string): Promise<void> {
  const url = `http://localhost:${port}/`;
  const deadline = Date.now() + 30000;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 404) {
          // Server is up (404 is fine — means http-server responds)
          resolve();
          return;
        }
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) {
        reject(new Error(`Server "${name}" on port ${port} did not start in time`));
        return;
      }
      setTimeout(tick, 300);
    };
    tick();
  });
}

export default async function globalSetup() {
  mkdirSync('/tmp/e2e-setup', { recursive: true });

  // Clean up any stale pid files from a previous (crashed) run
  for (const spec of SERVERS) {
    try {
      if (existsSync(spec.pidFile)) {
        const pid = parseInt(readFileSync(spec.pidFile, 'utf8').trim(), 10);
        if (pid) {
          try {
            process.kill(pid, 'SIGTERM');
          } catch {
            // already gone
          }
        }
        const { unlinkSync } = await import('node:fs');
        unlinkSync(spec.pidFile);
      }
    } catch {
      // ignore
    }
  }

  // Ensure index.html exists for http-server (builds emit variant-specific names)
  const copies: Array<[string, string]> = [
    ['dist/trischach/index.trischach.html', 'dist/trischach/index.html'],
    ['dist/schach9x9/index.schach9x9.html', 'dist/schach9x9/index.html'],
  ];
  const { execSync } = await import('child_process');
  for (const [src, dst] of copies) {
    if (!existsSync(`${ROOT}/${dst}`) && existsSync(`${ROOT}/${src}`)) {
      execSync(`cp ${src} ${dst}`, { cwd: ROOT });
    }
  }

  const procs: Array<{ spec: ServerSpec; proc: ReturnType<typeof spawn> }> = [];

  for (const spec of SERVERS) {
    const proc = spawn(HS, [spec.dir, '-p', String(spec.port), '-s', '-c-1'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    procs.push({ spec, proc });
    writeFileSync(spec.pidFile, String(proc.pid ?? ''));
    console.log(`E2E server "${spec.name}" starting on port ${spec.port} (PID: ${proc.pid})`);
  }

  // Wait for all servers to be ready
  await Promise.all(procs.map(({ spec, proc }) => waitForServer(proc, spec.port, spec.name)));
  // Give them a moment to fully stabilize
  await new Promise((r) => setTimeout(r, 1000));

  console.log('All E2E servers ready.');
}

// Allow manual teardown helpers (used by globalTeardown)
export function killAll() {
  for (const spec of SERVERS) {
    try {
      if (existsSync(spec.pidFile)) {
        const pid = parseInt(readFileSync(spec.pidFile, 'utf8').trim(), 10);
        if (pid) process.kill(pid, 'SIGTERM');
      }
    } catch {
      // ignore
    }
  }
}
