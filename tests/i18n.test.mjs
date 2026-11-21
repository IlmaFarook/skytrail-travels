// Checks that all UI text lives in client/src/i18n/en.json. Run: npm run test:i18n
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client', 'src');
const en = JSON.parse(fs.readFileSync(path.join(src, 'i18n', 'en.json'), 'utf8'));

function flatten(obj, prefix = '') {
  const out = [];
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix + key;
    if (value && typeof value === 'object') out.push(...flatten(value, full + '.'));
    else out.push(full);
  }
  return out;
}

const keys = flatten(en);
const keySet = new Set(keys);
const pluralEnd = /_(zero|one|two|few|many|other)$/;
const baseKey = (k) => k.replace(pluralEnd, '');

const files = fs.readdirSync(src, { recursive: true })
  .filter(f => /\.(js|jsx)$/.test(f))
  .map(f => ({ name: f, text: fs.readFileSync(path.join(src, f), 'utf8') }));

// ---- which keys do the source files use? ----
const literalKeys = new Set();
const dynamicKeys = []; // regexes for keys built with a template string
for (const file of files) {
  for (const m of file.text.matchAll(/\bt\(\s*(['"])([^'"`]+)\1/g)) literalKeys.add(m[2]);
  for (const m of file.text.matchAll(/i18nKey=(['"])([^'"]+)\1/g)) literalKeys.add(m[2]);
  for (const m of file.text.matchAll(/\bt\(\s*`([^`]+)`/g)) {
    const pattern = m[1].split(/\$\{[^}]*\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^.]+');
    dynamicKeys.push({ file: file.name, template: m[1], regex: new RegExp('^' + pattern + '$') });
  }
}

test('every key used in the code exists in en.json', () => {
  const missing = [];
  for (const k of literalKeys) {
    if (!keySet.has(k) && ![...keySet].some(x => baseKey(x) === k)) missing.push(k);
  }
  for (const d of dynamicKeys) {
    if (!keys.some(k => d.regex.test(baseKey(k)))) missing.push(`${d.file}: ${d.template}`);
  }
  assert.deepEqual(missing, []);
});

test('every key in en.json is used somewhere', () => {
  const unused = keys.filter(k => {
    const base = baseKey(k);
    return !literalKeys.has(k) && !literalKeys.has(base) && !dynamicKeys.some(d => d.regex.test(base));
  });
  assert.deepEqual(unused, []);
});

test('plural keys come in pairs', () => {
  const bases = new Set(keys.filter(k => pluralEnd.test(k)).map(baseKey));
  for (const b of bases) {
    assert.ok(keySet.has(b + '_one') && keySet.has(b + '_other'), `${b} needs _one and _other`);
  }
});

// ---- hard-coded text in JSX ----
const hasLetter = (s) => /\p{L}/u.test(s);
const keywordLines = new Set(['else', 'try', 'finally', 'return', 'break', 'continue', 'default']);

function removeStrings(line) {
  return line.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");
}

function removeBraces(line) {
  let depth = 0;
  let out = '';
  for (const ch of line) {
    if (ch === '{') depth++;
    else if (ch === '}') depth = Math.max(0, depth - 1);
    else if (depth === 0) out += ch;
  }
  return out;
}

export function findHardCodedText(text) {
  const found = [];
  const lines = text.split('\n');
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*') || line.startsWith('import ')) return;

    // string props that show up on screen or to screen readers
    for (const m of raw.matchAll(/\b(placeholder|aria-label|title|alt|label)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      if (hasLetter(m[2] ?? m[3])) found.push(`${i + 1}: ${m[1]}="${m[2] ?? m[3]}"`);
    }

    // text between tags on one line, e.g. <p>Hello</p>
    const flat = removeBraces(removeStrings(raw));
    for (const m of flat.matchAll(/(?:<\/?[A-Za-z][^<>]*|\/)>([^<>]*)(?=<)/g)) {
      if (hasLetter(m[1])) found.push(`${i + 1}: text "${m[1].trim()}"`);
    }

    // text on its own line between two tags, e.g. <p> / Some words / </p>
    if (/^[\p{L}][\p{L}\p{N} ,.'’!?&;:-]*$/u.test(line) && !keywordLines.has(line)) {
      const before = lines.slice(0, i).map(l => l.trim()).filter(Boolean).pop() || '';
      const after = lines.slice(i + 1).map(l => l.trim()).find(Boolean) || '';
      if (/[^=]>$/.test(before) && after.startsWith('<')) found.push(`${i + 1}: text "${line}"`);
    }
  });
  return found;
}

test('the scanner catches hard-coded text and ignores t() calls', () => {
  assert.equal(findHardCodedText('<p className="x">Hello there</p>').length, 1);
  assert.equal(findHardCodedText('<input placeholder="Search here" />').length, 1);
  assert.equal(findHardCodedText('<p>\n  Some words\n</p>').length, 1);
  assert.equal(findHardCodedText("<p>{t('a.b')}</p>").length, 0);
  assert.equal(findHardCodedText("<input placeholder={t('a.b')} aria-label={t('c')} />").length, 0);
  assert.equal(findHardCodedText('<button>×</button> <span>·</span> <b>→</b>').length, 0);
  assert.equal(findHardCodedText('if (a > b && c < d) { return 1; }').length, 0);
});

test('no hard-coded UI text in the React components', () => {
  const problems = [];
  for (const file of files.filter(f => f.name.endsWith('.jsx'))) {
    for (const hit of findHardCodedText(file.text)) problems.push(`${file.name} line ${hit}`);
  }
  assert.deepEqual(problems, []);
});
