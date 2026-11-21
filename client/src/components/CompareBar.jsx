import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCompare } from '../context/CompareContext';

export default function CompareBar() {
  const { t } = useTranslation();
  const { items, remove, clear, max } = useCompare();
  if (items.length === 0) return null;

  return (
    <div className="compare-bar" role="region" aria-label={t('compare.barLabel')}>
      <div className="container compare-bar-inner">
        <ul className="compare-chips">
          {items.map(p => (
            <li key={p.id}>
              <span>{p.title}</span>
              <button type="button" onClick={() => remove(p.id)} aria-label={t('compare.remove', { title: p.title })}>×</button>
            </li>
          ))}
        </ul>
        <p className="compare-count" aria-live="polite">{t('compare.selected', { n: items.length, max: max ?? '' })}</p>
        <div className="compare-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={clear}>{t('common.clear')}</button>
          {items.length >= 2
            ? <Link to="/compare" className="btn btn-primary btn-sm">{t('compare.now')}</Link>
            : <span className="compare-hint">{t('compare.pickOne')}</span>}
        </div>
      </div>
    </div>
  );
}
