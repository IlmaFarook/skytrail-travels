// Checks that the PHP side keeps its text in lang/en.php.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const langFile = fs.readFileSync(path.join(root, 'lang/en.php'), 'utf8');
const keys = [...langFile.matchAll(/^\s*'([a-z_.]+)' =>/gm)].map(m => m[1]);

function phpFiles(dir) {
  return fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.php')).map(f => path.join(root, dir, f));
}
const sources = [...phpFiles('routes'), ...phpFiles('lib'), path.join(root, 'router.php')];
const code = sources.map(f => ({ file: path.relative(root, f), text: fs.readFileSync(f, 'utf8') }));

test('lang/en.php has no duplicate keys', () => {
  assert.equal(new Set(keys).size, keys.length);
});

test('every key used with t() exists in lang/en.php', () => {
  const missing = [];
  for (const { file, text } of code) {
    for (const m of text.matchAll(/\bt\('([a-z_.]+)'/g)) {
      const key = m[1];
      if (key.endsWith('.')) continue; // half of a key built in code, like 'meta.' . $name
      if (!keys.includes(key) && !keys.includes(key + '_one')) missing.push(`${file}: ${key}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every key in lang/en.php is used somewhere', () => {
  const all = code.map(c => c.text).join('\n');
  const unused = keys.filter(key => {
    const base = key.replace(/_(one|other)$/, '');
    if (all.includes(`'${key}'`) || all.includes(`'${base}'`)) return false;
    // keys built in code, like 'meta.' . $name . '.title' or 'site.' . $field
    const parts = key.split('.');
    if (parts.some((_, i) => i > 0 && all.includes("'" + parts.slice(0, i).join('.') + ".' ."))) return false;
    return true;
  });
  assert.deepEqual(unused, []);
});

test('no message is typed directly into a route or helper', () => {
  const typed = [];
  for (const { file, text } of code) {
    if (file === 'lib/lang.php') continue;
    text.split('\n').forEach((line, i) => {
      if (/json_response\(\['(error|message)' => '/.test(line)) typed.push(`${file}:${i + 1}`);
      if (/^\s*return '[A-Za-z]/.test(line)) typed.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(typed, []);
});
