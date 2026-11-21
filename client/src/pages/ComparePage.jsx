import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useCurrency } from '../context/CurrencyContext';
import CurrencyNote from '../components/CurrencyNote';
import { useCompare } from '../context/CompareContext';
import DestinationImage from '../components/DestinationImage';
import usePageMeta from '../hooks/usePageMeta';

export default function ComparePage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.compare.title'), t('meta.compare.description'));
  const { items, remove, clear } = useCompare();
  const { money, currency } = useCurrency();
  const [result, setResult] = useState(null);

  // one call: the API sends the packages, their converted prices and which one is best in each row
  const ids = items.map(i => i.id).join(',');
  useEffect(() => {
    if (!ids) { setResult({ packages: [], best: null }); return; }
    api.compare(ids.split(',')).then(setResult).catch(() => setResult({ packages: [], best: null }));
  }, [ids, currency]);

  const list = result ? result.packages : [];
  const best = result ? result.best : null;
  const isBest = (row, id) => !!best && best[row].includes(id);

  return (
    <>
      <div className="page-header">
        <div className="container">
          <p className="eyebrow">{t('compare.eyebrow')}</p>
          <h1>{t('compare.heading')}</h1>
          <p>{t('compare.intro')}</p>
        </div>
      </div>

      <section className="container">
        {result === null && <p>{t('common.loading')}</p>}

        {result && list.length < 2 && (
          <div className="empty-box">
            <p>{list.length === 0 ? t('compare.none') : t('compare.needMore')}</p>
            <Link to="/destinations" className="btn btn-primary">{t('common.browsePackages')}</Link>
          </div>
        )}

        {list.length >= 2 && (
          <>
            <div className="table-wrap">
              <table className="compare-table">
                <caption className="sr-only">{t('compare.tableCaption')}</caption>
                <thead>
                  <tr>
                    <td></td>
                    {list.map(p => (
                      <th scope="col" key={p.id}>
                        <div className="compare-art"><DestinationImage photo={p.photo} place={p.destination_name} category={p.category} flip={p.id % 2 === 0} decorative sizes="(max-width: 700px) 100vw, 300px" /></div>
                        <Link to={`/packages/${p.id}`}>{p.title}</Link>
                        <button type="button" className="link-button" onClick={() => remove(p.id)}>{t('compare.removeBtn')}</button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr><th scope="row">{t('compare.rows.destination')}</th>{list.map(p => <td key={p.id}>{p.destination_name}, {p.destination_country}</td>)}</tr>
                  <tr><th scope="row">{t('compare.rows.category')}</th>{list.map(p => <td key={p.id}>{p.category}</td>)}</tr>
                  <tr>
                    <th scope="row">{t('compare.rows.price')}</th>
                    {list.map(p => (
                      <td key={p.id} className={isBest('price', p.id) ? 'best' : ''}>
                        {money(p.price_converted, p.currency)}
                        {isBest('price', p.id) && <span className="best-tag">{t('compare.lowest')}</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">{t('compare.rows.duration')}</th>
                    {list.map(p => (
                      <td key={p.id} className={isBest('duration', p.id) ? 'best' : ''}>
                        {t('common.daysCount', { count: p.duration_days })}
                        {isBest('duration', p.id) && <span className="best-tag">{t('compare.shortest')}</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">{t('compare.rows.perDay')}</th>
                    {list.map(p => (
                      <td key={p.id} className={isBest('value', p.id) ? 'best' : ''}>
                        {money(p.price_per_day_converted, p.currency)}
                        {isBest('value', p.id) && <span className="best-tag">{t('compare.bestValue')}</span>}
                      </td>
                    ))}
                  </tr>
                  <tr><th scope="row">{t('compare.rows.included')}</th>{list.map(p => <td key={p.id}>{p.description}</td>)}</tr>
                  <tr>
                    <th scope="row"></th>
                    {list.map(p => (
                      <td key={p.id}><Link to={`/booking?package=${p.id}`} className="btn btn-primary btn-sm">{t('compare.book')}</Link></td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <CurrencyNote />
            <p className="compare-clear"><button type="button" className="btn btn-outline btn-sm" onClick={clear}>{t('compare.clearAll')}</button></p>
          </>
        )}
      </section>
    </>
  );
}
