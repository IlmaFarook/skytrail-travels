import isEmail from 'validator/lib/isEmail';

export function emailValid(value, max = 120) {
  return value.length <= max && isEmail(value, { allow_utf8_local_part: false });
}

// the server sends the pattern as text, so the browser and the server use the same rule
export function nameValid(value, config) {
  const name = value.trim();
  return name.length >= config.nameMin && name.length <= config.nameMax
    && new RegExp(config.namePattern, 'u').test(name);
}

// drops characters a name cannot have while the visitor types, like most production forms
export function cleanName(value, config) {
  if (!config) return value;
  return value
    .replace(new RegExp(`[^${config.nameChars}]`, 'gu'), '')
    .replace(/ {2,}/g, ' ')
    .replace(new RegExp(`^[^\\p{L}\\p{M}]+`, 'u'), '')
    .slice(0, config.nameMax);
}

export function toIsoDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromIsoDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text || '')) return undefined;
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// attributes that make browsers and phones offer the right keyboard and autofill
export const emailAttrs = {
  type: 'email', inputMode: 'email', autoComplete: 'email', autoCapitalize: 'none', spellCheck: false,
};
