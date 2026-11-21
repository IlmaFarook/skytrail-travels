// Vite does not empty ../public any more (OneDrive renamed the deleted folder),
// so remove old hashed files from earlier builds here.
import { readdirSync, readFileSync, rmSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('../public/.vite/manifest.json', 'utf8'));
const current = new Set();
for (const entry of Object.values(manifest)) {
  for (const file of [entry.file, ...(entry.css || []), ...(entry.assets || [])]) {
    current.add(file.replace('assets/', ''));
  }
}
for (const file of readdirSync('../public/assets')) {
  if (!current.has(file)) rmSync(`../public/assets/${file}`);
}
rmSync('../public/.vite', { recursive: true });
