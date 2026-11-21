import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRules } from '../context/SiteContext';
import usePageMeta from '../hooks/usePageMeta';
import { cleanName, emailAttrs } from '../lib/forms';
import { safePath, homeFor } from '../lib/access';


export default function RegisterPage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.register.title'), t('meta.register.description'));
  const { user, register } = useAuth();
  const { config, emailOk, nameOk, passwordOk } = useRules();
  const { state } = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    const errs = {};
    if (!nameOk(form.name)) errs.name = true;
    if (!emailOk(form.email.trim())) errs.email = true;
    if (!passwordOk(form.password)) errs.password = true;
    if (form.password !== form.confirm || !form.confirm) errs.confirm = true;
    setErrors(errs);
    if (Object.keys(errs).length) { setAlert(t('validation.fixHighlighted')); return; }

    try {
      await register(form.name.trim(), form.email.trim(), form.password);
    } catch (err) {
      setAlert(err.message || t('auth.register.failed'));
    }
  };

  if (user) return <Navigate to={safePath(state?.from) || homeFor(user)} replace />;

  return (
    <>
      <div className="page-header"><div className="container"><h1>{t('auth.register.heading')}</h1><p>{t('auth.register.intro')}</p></div></div>
      <section className="container">
        {alert && <div className="alert alert-error">{alert}</div>}
        <form className="form-card" onSubmit={onSubmit} noValidate>
          <div className={`form-group${errors.name ? ' has-error' : ''}`}>
            <label htmlFor="name">{t('auth.register.name')}</label>
            <input id="name" value={form.name} maxLength={config?.nameMax} autoComplete="name"
              onChange={(e) => setForm(f => ({ ...f, name: cleanName(e.target.value, config) }))} />
            <div className="error-text">{t('validation.fullName', { max: config?.nameMax ?? '' })}</div>
          </div>
          <div className={`form-group${errors.email ? ' has-error' : ''}`}>
            <label htmlFor="email">{t('auth.register.email')}</label>
            <input id="email" {...emailAttrs} value={form.email} onChange={update('email')}
              onBlur={() => setForm(f => ({ ...f, email: f.email.trim().toLowerCase() }))} />
            <div className="error-text">{t('validation.email')}</div>
          </div>
          <div className={`form-group${errors.password ? ' has-error' : ''}`}>
            <label htmlFor="password">{t('auth.register.password')}</label>
            <input id="password" type="password" minLength={config?.passwordMinLength} value={form.password} onChange={update('password')} />
            <div className="error-text">{t('validation.passwordStrength', { min: config?.passwordMinLength ?? '' })}</div>
          </div>
          <div className={`form-group${errors.confirm ? ' has-error' : ''}`}>
            <label htmlFor="confirm">{t('auth.register.confirm')}</label>
            <input id="confirm" type="password" value={form.confirm} onChange={update('confirm')} />
            <div className="error-text">{t('validation.passwordMatch')}</div>
          </div>
          <button type="submit" className="btn btn-primary btn-block">{t('auth.register.submit')}</button>
          <p className="form-switch">
            {t('auth.register.haveAccount')} <Link to="/login">{t('auth.register.login')}</Link>
          </p>
        </form>
      </section>
    </>
  );
}
