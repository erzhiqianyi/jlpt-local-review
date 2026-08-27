import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['server/api.mjs'], { stdio: 'inherit' }),
  spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '5191', '--strictPort'], { stdio: 'inherit' }),
];

function shutdown(signal) {
  for (const child of children) {
    child.kill(signal);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

for (const child of children) {
  child.on('exit', (code) => {
    if (code && code !== 0) {
      shutdown('SIGTERM');
      process.exit(code);
    }
  });
}
