import { useEffect } from 'react';
import { useRules } from '../context/SiteContext';
import { cleanName } from '../lib/forms';

// A name field that drops characters a name cannot have. It also cleans text typed
// before the site rules arrived, which a fast typist or a slow browser can do.
export default function NameInput({ id, value, onChange }) {
  const { config } = useRules();

  useEffect(() => {
    if (!config) return;
    const clean = cleanName(value, config);
    if (clean !== value) onChange(clean);
  }, [config, value, onChange]);

  return (
    <input id={id} value={value} maxLength={config?.nameMax} autoComplete="name"
      onChange={(e) => onChange(cleanName(e.target.value, config))} />
  );
}
