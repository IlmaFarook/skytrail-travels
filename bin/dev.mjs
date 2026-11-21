// Development with live updates: the PHP site on port 3000 plus the Vite dev server,
// which reloads the browser as soon as a file in client/src changes.
import './env.mjs';
import { spawn } from 'node:child_process';

const port = process.env.PORT || '3000';
const running = await fetch(`http://localhost:${port}/api/config`).then(r => r.ok, () => false);

const children = [];
if (running) {
  console.log(`The site is already running on port ${port}, so only the live-reload server is started.`);
} else {
  children.push(spawn('node', ['bin/start.mjs'], { stdio: 'inherit' }));
}
children.push(spawn('npm', ['--prefix', 'client', 'run', 'dev'], { stdio: 'inherit' }));

const stop = () => { children.forEach(c => c.kill()); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
children.forEach(c => c.on('exit', stop));
