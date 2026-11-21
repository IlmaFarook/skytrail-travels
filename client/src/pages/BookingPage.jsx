import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { useRules } from '../context/SiteContext';
import usePageMeta from '../hooks/usePageMeta';


export default function BookingPage() {
  const { t } = useTranslation();
  const { money, currency } = useCurrency();
  const { config, emailOk, phoneOk, travellersOk, dateOk } = useRules();
  usePageMeta(t('meta.booking.title'), t('meta.booking.description'));
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const packageId = searchParams.get('package');

  const [pkg, setPkg] = useState(null);
  const [pkgError, setPkgError] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', travel_date: '', travellers: '', special_requests: '',
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!packageId) return;
    api.getPackage(packageId).then(setPkg).catch(() => setPkgError(t('booking.loadError')));
  }, [packageId, currency, t]);

  useEffect(() => {
    if (user) {
      setForm(f => ({ ...f, full_name: f.full_name || user.name, email: f.email || user.email }));
    }
  }, [user]);

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = true;
    if (!emailOk(form.email.trim())) errs.email = true;
    if (!phoneOk(form.phone.trim())) errs.phone = true;
    if (!dateOk(form.travel_date)) errs.travel_date = true;
    if (!travellersOk(Number(form.travellers))) errs.travellers = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    if (!packageId) { setAlert({ type: 'error', text: t('booking.noPackageSelected') }); return; }
    if (!validate()) { setAlert({ type: 'error', text: t('validation.fixBeforeSubmit') }); return; }

    try {
      await api.createBooking({ package_id: packageId, ...form, travellers: Number(form.travellers) });
      setAlert({ type: 'success', text: t('booking.success') });
      setForm({ full_name: user?.name || '', email: user?.email || '', phone: '', travel_date: '', travellers: '', special_requests: '' });
      setErrors({});
    } catch (err) {
      setAlert({ type: 'error', text: err.message || t('booking.submitFailed') });
    }
  };

  const packageLabel = pkgError
    ? pkgError
    : pkg
      ? t('booking.packageLabel', { title: pkg.title, destination: pkg.destination_name, country: pkg.destination_country, price: money(pkg.price_converted, pkg.currency) })
      : (packageId ? t('booking.loadingPackage') : t('booking.noPackage'));

  return (
    <>
      <div className="page-header">
        <div className="container">
          <h1>{t('booking.heading')}</h1>
          <p>{packageLabel}</p>
        </div>
      </div>

      <section className="container">
        {loading ? (
          <p>{t('common.loading')}</p>
        ) : !user ? (
          <div className="form-card">
            <div className="alert alert-error">{t('booking.loginNeeded')}</div>
            <Link to="/login" className="btn btn-primary btn-block">{t('booking.login')}</Link>
            <Link to="/register" className="btn btn-outline btn-block btn-stacked">{t('booking.createAccount')}</Link>
          </div>
        ) : (
          <>
            {alert && <div className={`alert alert-${alert.type}`}>{alert.text}</div>}
            <form className="form-card" onSubmit={onSubmit} noValidate>
              <div className={`form-group${errors.full_name ? ' has-error' : ''}`}>
                <label htmlFor="full_name">{t('booking.fullName')}</label>
                <input id="full_name" value={form.full_name} onChange={update('full_name')} />
                <div className="error-text">{t('validation.fullName')}</div>
              </div>
              <div className={`form-group${errors.email ? ' has-error' : ''}`}>
                <label htmlFor="email">{t('booking.email')}</label>
                <input id="email" type="email" value={form.email} onChange={update('email')} />
                <div className="error-text">{t('validation.email')}</div>
              </div>
              <div className={`form-group${errors.phone ? ' has-error' : ''}`}>
                <label htmlFor="phone">{t('booking.phone')}</label>
                <input id="phone" type="tel" placeholder={t('booking.phonePlaceholder')} value={form.phone} onChange={update('phone')} />
                <div className="error-text">{t('validation.phone')}</div>
              </div>
              <div className={`form-group${errors.travel_date ? ' has-error' : ''}`}>
                <label htmlFor="travel_date">{t('booking.travelDate')}</label>
                <input id="travel_date" type="date" min={config?.minTravelDate} value={form.travel_date} onChange={update('travel_date')} />
                <div className="error-text">{t('validation.travelDateFuture')}</div>
              </div>
              <div className={`form-group${errors.travellers ? ' has-error' : ''}`}>
                <label htmlFor="travellers">{t('booking.travellers')}</label>
                <input id="travellers" type="number" min={config?.minTravellers} max={config?.maxTravellers} value={form.travellers} onChange={update('travellers')} />
                <div className="error-text">{t('validation.travellers', { max: config?.maxTravellers ?? '' })}</div>
              </div>
              <div className="form-group">
                <label htmlFor="special_requests">{t('booking.requests')}</label>
                <textarea id="special_requests" maxLength={config?.specialRequestsMax} placeholder={t('booking.requestsPlaceholder')}
                  value={form.special_requests} onChange={update('special_requests')} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">{t('booking.submit')}</button>
            </form>
          </>
        )}
      </section>
    </>
  );
}
