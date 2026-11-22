import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import { useSite } from '../../context/SiteContext';

const fields = [
  { name: 'address', type: 'text' },
  { name: 'street', type: 'text' },
  { name: 'locality', type: 'text' },
  { name: 'region', type: 'text' },
  { name: 'phone', type: 'tel' },
  { name: 'email', type: 'email' },
  { name: 'founded', type: 'number' },
  { name: 'facebook', type: 'url' },
  { name: 'instagram', type: 'url' },
  { name: 'map_lat', type: 'number' },
  { name: 'map_lon', type: 'number' },
];

export default function SiteTab() {
  const { t } = useTranslation();
  const { reloadSite } = useSite();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminSite().then(setForm).catch(err => setError(err.message));
  }, []);

  const update = (name) => (e) => setForm(f => ({ ...f, [name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await api.adminSaveSite(form);
      setMessage(t('admin.site.saved'));
      reloadSite();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="manage">
      <div className="manage-head"><h2>{t('admin.site.heading')}</h2></div>
      <p className="muted small">{t('admin.site.intro')}</p>

      {message && <div className="alert alert-success alert-wide" role="status">{message}</div>}
      {error && <div className="alert alert-error alert-wide" role="alert">{error}</div>}

      {form === null && !error && <p>{t('common.loading')}</p>}
      {form && (
        <form className="form-card edit-panel" onSubmit={onSubmit} noValidate>
          {fields.map(f => (
            <div className="form-group" key={f.name}>
              <label htmlFor={`site-${f.name}`}>{t(`admin.site.fields.${f.name}`)}</label>
              <input id={`site-${f.name}`} type={f.type} step={f.type === 'number' ? 'any' : undefined} value={form[f.name]} onChange={update(f.name)} />
            </div>
          ))}
          <div className="form-buttons">
            <button type="submit" className="btn btn-primary">{t('common.save')}</button>
          </div>
        </form>
      )}
    </div>
  );
}
