import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useCurrency } from '../context/CurrencyContext';
import CurrencyNote from '../components/CurrencyNote';
import { useAuth } from '../context/AuthContext';
import { useRules } from '../context/SiteContext';
import usePageMeta from '../hooks/usePageMeta';

export default function MyBookingsPage() {
  const { t } = useTranslation();
  const { money, currency } = useCurrency();
  const { config, phoneOk, travellersOk, dateOk } = useRules();
  usePageMeta(t('meta.myBookings.title'), t('meta.myBookings.description'));
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ phone: '', travel_date: '', travellers: '', special_requests: '' });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);

  const load = () => api.myBookings().then(setBookings).catch(() => setBookings([]));

  useEffect(() => {
    if (user) load();
  }, [user, currency]);

  if (loading) return <p className="container">{t('common.loading')}</p>;
  if (!user) return <Navigate to="/login" replace />;

  const startEdit = (b) => {
    setAlert(null);
    setErrors({});
    setEditing(b);
    setForm({
      phone: b.phone,
      travel_date: b.travel_date,
      travellers: String(b.travellers),
      special_requests: b.special_requests || '',
    });
  };

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const saveEdit = async (e) => {
    e.preventDefault();
    setAlert(null);
    const errs = {};
    if (!phoneOk(form.phone.trim())) errs.phone = true;
    if (!dateOk(form.travel_date)) errs.travel_date = true;
    const n = Number(form.travellers);
    if (!travellersOk(n)) errs.travellers = true;
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await api.updateBooking(editing.id, { ...form, travellers: n });
      setEditing(null);
      setAlert({ type: 'success', text: t('myBookings.updated') });
      load();
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    }
  };

  const cancel = async (b) => {
    if (!window.confirm(t('myBookings.confirmCancel', { title: b.package_title }))) return;
    setAlert(null);
    try {
      await api.cancelBooking(b.id);
      setAlert({ type: 'success', text: t('myBookings.cancelled') });
      if (editing && editing.id === b.id) setEditing(null);
      load();
    } catch (err) {
      setAlert({ type: 'error', text: err.message });
    }
  };

  return (
    <>
      <div className="page-header"><div className="container"><p className="eyebrow">{t('myBookings.eyebrow')}</p><h1>{t('myBookings.heading')}</h1><p>{t('myBookings.intro')}</p></div></div>
      <section className="container">
        {alert && <div className={`alert alert-${alert.type} alert-wide`} role="status">{alert.text}</div>}

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('myBookings.headers.package')}</th>
                <th>{t('myBookings.headers.travelDate')}</th>
                <th>{t('myBookings.headers.travellers')}</th>
                <th>{t('myBookings.headers.price')}</th>
                <th>{t('myBookings.headers.status')}</th>
                <th>{t('myBookings.headers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {bookings === null && <tr><td colSpan={6}>{t('common.loading')}</td></tr>}
              {bookings?.length === 0 && (
                <tr><td colSpan={6}>{t('myBookings.empty')} <Link to="/destinations">{t('common.browsePackages')}</Link>.</td></tr>
              )}
              {bookings?.map(b => (
                <tr key={b.id}>
                  <td>{b.package_title}</td>
                  <td>{b.travel_date}</td>
                  <td>{b.travellers}</td>
                  <td>{money(b.total_converted, b.currency)}</td>
                  <td><span className={`status-pill status-${b.status}`}>{t(`status.${b.status}`)}</span></td>
                  <td className="row-actions">
                    {b.status === 'Pending' && <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(b)}>{t('common.edit')}</button>}
                    {(b.status === 'Pending' || b.status === 'Confirmed') && <button type="button" className="btn btn-outline btn-sm" onClick={() => cancel(b)}>{t('common.cancel')}</button>}
                    {(b.status === 'Cancelled' || b.status === 'Completed') && <span className="muted">{t('common.na')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CurrencyNote />
        <p className="muted small">{t('myBookings.note')}</p>

        {editing && (
          <form className="form-card edit-panel" onSubmit={saveEdit} noValidate>
            <h2>{t('myBookings.editTitle', { title: editing.package_title })}</h2>
            <div className={`form-group${errors.phone ? ' has-error' : ''}`}>
              <label htmlFor="e-phone">{t('myBookings.phone')}</label>
              <input id="e-phone" type="tel" value={form.phone} onChange={update('phone')} />
              <div className="error-text">{t('validation.phone')}</div>
            </div>
            <div className={`form-group${errors.travel_date ? ' has-error' : ''}`}>
              <label htmlFor="e-date">{t('myBookings.date')}</label>
              <input id="e-date" type="date" min={config?.minTravelDate} value={form.travel_date} onChange={update('travel_date')} />
              <div className="error-text">{t('validation.travelDateChoose')}</div>
            </div>
            <div className={`form-group${errors.travellers ? ' has-error' : ''}`}>
              <label htmlFor="e-travellers">{t('myBookings.travellers')}</label>
              <input id="e-travellers" type="number" min={config?.minTravellers} max={config?.maxTravellers} value={form.travellers} onChange={update('travellers')} />
              <div className="error-text">{t('validation.travellersShort', { max: config?.maxTravellers ?? '' })}</div>
            </div>
            <div className="form-group">
              <label htmlFor="e-requests">{t('myBookings.requests')}</label>
              <textarea id="e-requests" maxLength={config?.specialRequestsMax} value={form.special_requests} onChange={update('special_requests')} />
            </div>
            <div className="form-buttons">
              <button type="submit" className="btn btn-primary">{t('myBookings.saveChanges')}</button>
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>{t('common.close')}</button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
