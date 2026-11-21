import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import { useCurrency } from '../../context/CurrencyContext';
import { useConfirm } from '../../context/ConfirmContext';

export default function CurrenciesTab() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { reload: reloadPublicList } = useCurrency();
  const [info, setInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', locale: '' });

  const load = () => api.adminCurrencies().then(setInfo).catch(() => setInfo({ currencies: [] }));

  useEffect(() => {
    load();
  }, []);

  // run a change, then show the new list here and on the public site
  const run = async (action, doneText) => {
    setError('');
    setMessage('');
    try {
      await action();
      if (doneText) setMessage(doneText);
      await load();
      reloadPublicList();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const toggle = (c) => run(() => api.adminUpdateCurrency(c.code, !c.enabled));

  const remove = async (c) => {
    const sure = await confirm({
      title: t('admin.currencies.confirmDelete', { code: c.code }),
      message: t('common.cannotUndo'),
      confirmLabel: t('common.delete'),
    });
    if (!sure) return;
    run(() => api.adminDeleteCurrency(c.code), t('admin.currencies.deleted', { code: c.code }));
  };

  const refresh = () => run(async () => {
    const result = await api.adminRefreshRates();
    setInfo(result);
  }, t('admin.currencies.refreshed'));

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const add = async (e) => {
    e.preventDefault();
    const ok = await run(() => api.adminAddCurrency(form), t('admin.currencies.added', { code: form.code.toUpperCase() }));
    if (ok) {
      setForm({ code: '', name: '', locale: '' });
      setAdding(false);
    }
  };

  const currencies = info ? info.currencies : null;

  return (
    <div className="manage">
      <div className="manage-head">
        <h2>{t('admin.currencies.heading')}</h2>
        <div className="row-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={refresh}>{t('admin.currencies.refresh')}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setError(''); setAdding(true); }}>{t('admin.currencies.add')}</button>
        </div>
      </div>
      {info && info.updated && (
        <p className="muted small">{t('admin.currencies.updated', { date: info.updated, source: t(`admin.currencies.source.${info.source}`) })}</p>
      )}

      {message && <div className="alert alert-success alert-wide" role="status">{message}</div>}
      {error && !adding && <div className="alert alert-error alert-wide" role="alert">{error}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.currencies.headers.code')}</th>
              <th>{t('admin.currencies.headers.name')}</th>
              <th>{t('admin.currencies.headers.locale')}</th>
              <th>{t('admin.currencies.headers.rate')}</th>
              <th>{t('admin.currencies.headers.rateDate')}</th>
              <th>{t('admin.currencies.headers.status')}</th>
              <th>{t('admin.manage.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {currencies === null && <tr><td colSpan={7}>{t('common.loading')}</td></tr>}
            {currencies?.map(c => (
              <tr key={c.code}>
                <td>{c.code}</td>
                <td>{c.name}</td>
                <td>{c.locale}</td>
                <td>{c.code === 'LKR' ? '1' : Number(c.rate).toPrecision(4)}</td>
                <td>{c.rate_date || t('admin.currencies.baseCurrency')}</td>
                <td><span className={`status-pill ${c.enabled ? 'status-Confirmed' : 'status-Cancelled'}`}>{c.enabled ? t('admin.currencies.enabled') : t('admin.currencies.disabled')}</span></td>
                <td className="row-actions">
                  {c.code === 'LKR'
                    ? <span className="muted">{t('admin.currencies.base')}</span>
                    : (
                      <>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(c)}>{c.enabled ? t('admin.currencies.disable') : t('admin.currencies.enable')}</button>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => remove(c)}>{t('common.delete')}</button>
                      </>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <form className="form-card edit-panel" onSubmit={add} noValidate>
          <h3>{t('admin.currencies.addTitle')}</h3>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="form-group">
            <label htmlFor="cur-code">{t('admin.currencies.form.code')}</label>
            <input id="cur-code" value={form.code} onChange={update('code')} maxLength={3} />
          </div>
          <div className="form-group">
            <label htmlFor="cur-name">{t('admin.currencies.form.name')}</label>
            <input id="cur-name" value={form.name} onChange={update('name')} />
          </div>
          <div className="form-group">
            <label htmlFor="cur-locale">{t('admin.currencies.form.locale')}</label>
            <input id="cur-locale" value={form.locale} onChange={update('locale')} placeholder={t('admin.currencies.form.localePlaceholder')} />
          </div>
          <div className="form-buttons">
            <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            <button type="button" className="btn btn-outline" onClick={() => { setAdding(false); setError(''); }}>{t('common.cancel')}</button>
          </div>
        </form>
      )}
    </div>
  );
}
