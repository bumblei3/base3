import { existsSync, readFileSync } from 'node:fs';

const PIDS = [
  '/tmp/e2e-setup/schach9x9.pid',
  '/tmp/e2e-setup/trischach.pid',
];

export default async function globalTeardown() {
  for (const pidFile of PIDS) {
    try {
      if (!existsSync(pidFile)) continue;
      const pid = parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
      if (!pid) continue;
      try {
        process.kill(pid, 'SIGTERM');
        console.log(`Stopped E2E server (PID: ${pid})`);
      } catch (err: any) {
        // ESRCH = process already exited (e.g. killed when globalSetup's process group ended)
        if (err?.code !== 'ESRCH') {
          console.warn(`Could not stop E2E server (PID: ${pid}):`, err);
        }
      }
    } catch (err) {
      console.warn(`Could not read E2E pid file ${pidFile}:`, err);
    }
  }
}
