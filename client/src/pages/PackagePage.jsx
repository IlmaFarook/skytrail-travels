import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import DestinationImage from '../components/DestinationImage';
import CurrencyNote from '../components/CurrencyNote';
import { useCurrency } from '../context/CurrencyContext';
import usePageMeta from '../hooks/usePageMeta';

export default function PackagePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { money, currency } = useCurrency();
  const [pkg, setPkg] = useState(null);
  const [error, setError] = useState('');

  usePageMeta(
    pkg ? t('meta.package.title', { title: pkg.title, destination: pkg.destination_name }) : t('meta.package.fallback'),
    pkg ? pkg.description.slice(0, 155) : undefined,
  );

  useEffect(() => {
    setPkg(null);
  }, [id]);

  useEffect(() => {
    setError('');
    api.getPackage(id).then(setPkg).catch(() => setError(t('package.notFound')));
  }, [id, currency, t]);

  if (error) {
    return (
      <section className="container section-top">
        <p>{error} <Link to="/destinations">{t('package.browseAll')}</Link>.</p>
      </section>
    );
  }
  if (!pkg) {
    return (
      <section className="container section-top">
        <p>{t('package.loading')}</p>
      </section>
    );
  }

  return (
    <section className="container section-top">
      <div className="two-col">
        <div>
          <div className="detail-art"><DestinationImage photo={pkg.photo} place={pkg.destination_name} category={pkg.category} flip={pkg.id % 2 === 0} eager sizes="(max-width: 900px) 100vw, 700px" /></div>
          {pkg.photo && (
            <p className="photo-credit">
              {t('credits.photoLine', { author: pkg.photo.author, license: pkg.photo.license })}{' '}
              <Link to="/credits">{t('credits.seeAll')}</Link>
            </p>
          )}
          <p className="eyebrow detail-eyebrow">{pkg.category} · {pkg.destination_name}, {pkg.destination_country}</p>
          <h1 className="detail-title">{pkg.title}</h1>
          <p className="detail-meta">{t('common.daysCount', { count: pkg.duration_days })}</p>
          <p>{pkg.description}</p>
          <h2>{t('package.about', { name: pkg.destination_name })}</h2>
          <p>{pkg.destination_description}</p>
        </div>
        <div>
          <div className="form-card summary-card">
            <h2>{t('package.summaryTitle')}</h2>
            <p className="summary-price">{money(pkg.price_converted, pkg.currency)}<small> {t('common.perPerson')}</small></p>
            <dl className="summary-list">
              <div><dt>{t('package.duration')}</dt><dd>{t('common.daysCount', { count: pkg.duration_days })}</dd></div>
              <div><dt>{t('package.category')}</dt><dd>{pkg.category}</dd></div>
              <div><dt>{t('package.destination')}</dt><dd>{pkg.destination_name}</dd></div>
            </dl>
            <CurrencyNote />
            <Link to={`/booking?package=${pkg.id}`} className="btn btn-primary btn-block">{t('package.book')}</Link>
            <Link to="/destinations" className="btn btn-outline btn-block btn-stacked">{t('package.back')}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
