import { createContext, useContext, useState } from 'react';
import { useSite } from './SiteContext';

const CompareContext = createContext(null);

function loadSaved() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('compare') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }) {
  const { config } = useSite();
  const [items, setItems] = useState(loadSaved);
  const max = config ? config.compareMax : null;

  const save = (next) => {
    setItems(next);
    try {
      sessionStorage.setItem('compare', JSON.stringify(next));
    } catch {
      // private mode, ignore
    }
  };

  const has = (id) => items.some(p => p.id === id);
  const full = max !== null && items.length >= max;

  const toggle = (pkg) => {
    if (has(pkg.id)) {
      save(items.filter(p => p.id !== pkg.id));
    } else if (!full) {
      save([...items, { id: pkg.id, title: pkg.title }]);
    }
  };

  const remove = (id) => save(items.filter(p => p.id !== id));
  const clear = () => save([]);

  return (
    <CompareContext.Provider value={{ items, has, full, toggle, remove, clear, max }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider');
  return ctx;
}
