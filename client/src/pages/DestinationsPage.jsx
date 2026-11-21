import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import PackageCard from '../components/PackageCard';
import usePageMeta from '../hooks/usePageMeta';
import CurrencyNote from '../components/CurrencyNote';
import { useCurrency } from '../context/CurrencyContext';

export default function DestinationsPage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.destinations.title'), t('meta.destinations.description'));
  const { currency } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const [destinations, setDestinations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [packages, setPackages] = useState(null);

  const [destination, setDestination] = useState(searchParams.get('destination') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [maxDuration, setMaxDuration] = useState(searchParams.get('maxDuration') || '');
  const [q, setQ] = useState(searchParams.get('q') || '');

  // the filters that were last applied (what the list on screen belongs to)
  const [applied, setApplied] = useState({ destination, category, maxPrice, maxDuration, q });

  useEffect(() => {
    api.getDestinations().then(setDestinations).catch(() => setDestinations([]));
    api.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    api.getPackages(applied).then(setPackages).catch(() => setPackages([]));
  }, [applied, currency]);

  const applyFilters = (e) => {
    e.preventDefault();
    const params = { destination, category, maxPrice, maxDuration, q };
    setSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
    setPackages(null);
    setApplied(params);
  };

  const clearFilters = () => {
    setDestination(''); setCategory(''); setMaxPrice(''); setMaxDuration(''); setQ('');
    setSearchParams({});
    setPackages(null);
    setApplied({});
  };

  return (
    <>
      <div className="page-header">
        <div className="container">
          <p className="eyebrow">{t('destinations.eyebrow')}</p>
          <h1>{t('destinations.heading')}</h1>
          <p>{t('destinations.intro')}</p>
        </div>
      </div>

      <section className="container">
        <form className="filters" onSubmit={applyFilters}>
          <div className="field">
            <label htmlFor="f-destination">{t('destinations.filters.destination')}</label>
            <select id="f-destination" value={destination} onChange={e => setDestination(e.target.value)}>
              <option value="">{t('destinations.filters.allDestinations')}</option>
              {destinations.map(d => <option key={d.id} value={d.id}>{d.name}, {d.country}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-category">{t('destinations.filters.category')}</label>
            <select id="f-category" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">{t('destinations.filters.allCategories')}</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-maxprice">{t('destinations.filters.maxPrice')}</label>
            <input type="number" id="f-maxprice" min="0" step="5000" placeholder={t('destinations.filters.maxPricePlaceholder')}
              value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-maxduration">{t('destinations.filters.maxDuration')}</label>
            <input type="number" id="f-maxduration" min="1" placeholder={t('destinations.filters.maxDurationPlaceholder')}
              value={maxDuration} onChange={e => setMaxDuration(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-q">{t('destinations.filters.keyword')}</label>
            <input type="text" id="f-q" placeholder={t('destinations.filters.keywordPlaceholder')}
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="field"><button type="submit" className="btn btn-primary">{t('destinations.filters.apply')}</button></div>
          <div className="field"><button type="button" className="btn btn-outline" onClick={clearFilters}>{t('common.clear')}</button></div>
        </form>

        <p className="result-count">
          {packages === null ? t('common.loading') : t('destinations.found', { count: packages.length })}
        </p>
        <CurrencyNote />
        <h2 className="sr-only">{t('destinations.resultsHeading')}</h2>
        <div className="grid">
          {packages?.length === 0 && <p>{t('destinations.none')}</p>}
          {packages?.map(p => <PackageCard key={p.id} pkg={p} />)}
        </div>
      </section>
    </>
  );
}
