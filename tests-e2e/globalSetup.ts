import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

let serverProcess: ReturnType<typeof spawn> | null = null;

export default async function globalSetup() {
  // Copy index.html for http-server
  mkdirSync('/tmp/trischach-e2e', { recursive: true });

  // Build first
  const { execSync } = await import('child_process');
  execSync('cp dist/trischach/index.trischach.html dist/trischach/index.html', { cwd: '/home/tobber/base3' });

  // Start http-server
  serverProcess = spawn('npx', ['http-server', 'dist/trischach', '-p', '4173', '-s', '-c-1'], {
    cwd: '/home/tobber/base3',
    stdio: 'pipe',
    detached: true,
  });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 30000);
    serverProcess!.stdout!.on('data', (data: Buffer) => {
      if (data.toString().includes('available on') || data.toString().includes('Serving')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    serverProcess!.stderr!.on('data', (data: Buffer) => {
      console.error(data.toString());
    });
    serverProcess!.on('error', reject);
  });

  // Give it extra time to stabilize
  await new Promise((r) => setTimeout(r, 2000));

  // Store PID for teardown
  if (serverProcess!.pid) {
    mkdirSync('/tmp/e2e-setup', { recursive: true });
    const { writeFileSync } = await import('fs');
    writeFileSync('/tmp/e2e-setup/server.pid', String(serverProcess!.pid));
  }

  console.log(`E2E server started on port 4173 (PID: ${serverProcess!.pid})`);
}
