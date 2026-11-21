import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import usePageMeta from '../hooks/usePageMeta';

const facts = [
  { key: 'unescoSigiriya', url: 'https://whc.unesco.org/en/list/202' },
  { key: 'unescoGalle', url: 'https://whc.unesco.org/en/list/451' },
  { key: 'burj', url: 'https://www.burjkhalifa.ae/en/the-tower/facts-figures' },
];

function ExternalLink({ href, children }) {
  const { t } = useTranslation();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}<span className="sr-only"> {t('a11y.opensNewTab')}</span>
    </a>
  );
}

export default function CreditsPage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.credits.title'), t('meta.credits.description'));
  const [destinations, setDestinations] = useState(null);

  useEffect(() => {
    api.getDestinations().then(setDestinations).catch(() => setDestinations([]));
  }, []);

  const withPhoto = (destinations || []).filter(d => d.photo);

  return (
    <>
      <div className="page-header"><div className="container"><p className="eyebrow">{t('credits.eyebrow')}</p><h1>{t('credits.heading')}</h1><p>{t('credits.intro')}</p></div></div>

      <section className="container">
        <header className="section-head"><span className="section-num">•</span><div><h2 className="section-title">{t('credits.photosTitle')}</h2><p className="section-sub">{t('credits.photosIntro')}</p></div></header>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>{t('credits.place')}</th><th>{t('credits.author')}</th><th>{t('credits.license')}</th><th>{t('credits.source')}</th></tr>
            </thead>
            <tbody>
              {destinations === null && <tr><td colSpan={4}>{t('common.loading')}</td></tr>}
              {withPhoto.map(d => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.photo.author}</td>
                  <td><ExternalLink href={d.photo.licenseUrl}>{d.photo.license}</ExternalLink></td>
                  <td><ExternalLink href={d.photo.source}>{t('credits.sourceLink')}</ExternalLink></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container">
        <header className="section-head"><span className="section-num">•</span><div><h2 className="section-title">{t('credits.othersTitle')}</h2></div></header>
        <ul className="credit-list">
          <li>{t('credits.fonts')}</li>
          <li>{t('credits.map')}</li>
          <li>{t('credits.rates')} <ExternalLink href="https://www.exchangerate-api.com">{t('credits.ratesLink')}</ExternalLink></li>
        </ul>
      </section>

      <section className="container">
        <header className="section-head"><span className="section-num">•</span><div><h2 className="section-title">{t('credits.factsTitle')}</h2><p className="section-sub">{t('credits.factsIntro')}</p></div></header>
        <ul className="credit-list">
          {facts.map(f => <li key={f.key}><ExternalLink href={f.url}>{t(`credits.${f.key}`)}</ExternalLink></li>)}
        </ul>
      </section>
    </>
  );
}
