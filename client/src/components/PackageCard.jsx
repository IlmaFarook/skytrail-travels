import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DestinationImage from './DestinationImage';
import { useCompare } from '../context/CompareContext';
import { useCurrency } from '../context/CurrencyContext';

export default function PackageCard({ pkg }) {
  const { t } = useTranslation();
  const { has, full, toggle, max } = useCompare();
  const { money } = useCurrency();
  const picked = has(pkg.id);

  return (
    <article className="card">
      <Link to={`/packages/${pkg.id}`} className="card-media" aria-hidden="true" tabIndex={-1}>
        <DestinationImage photo={pkg.photo} place={pkg.destination_name} category={pkg.category} flip={pkg.id % 2 === 0} decorative />
        <span className="card-tag">{pkg.category}</span>
      </Link>
      <div className="card-body">
        <div className="meta">{pkg.destination_name}, {pkg.destination_country}</div>
        <h3><Link to={`/packages/${pkg.id}`}>{pkg.title}</Link></h3>
        <p className="desc">{pkg.description}</p>
        <div className="card-footer">
          <div className="price">
            <span className="price-label">{t('package.from')}</span>
            <span className="price-value">{money(pkg.price_converted, pkg.currency)}</span>
          </div>
          <div className="duration"><strong>{pkg.duration_days}</strong> {t('common.day', { count: pkg.duration_days })}</div>
        </div>
        <label className="compare-toggle">
          <input type="checkbox" checked={picked} disabled={!picked && full} onChange={() => toggle(pkg)} />
          {!picked && full ? t('compare.toggleFull', { max: max ?? '' }) : t('compare.toggle')}
        </label>
      </div>
    </article>
  );
}
