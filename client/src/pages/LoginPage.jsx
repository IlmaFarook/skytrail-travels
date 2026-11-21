import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useRules } from '../context/SiteContext';
import usePageMeta from '../hooks/usePageMeta';
import { emailAttrs } from '../lib/forms';
import { safePath, homeFor } from '../lib/access';


export default function LoginPage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.login.title'), t('meta.login.description'));
  const { user, login } = useAuth();
  const { emailOk } = useRules();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    const errs = {};
    if (!emailOk(email.trim())) errs.email = true;
    if (!password) errs.password = true;
    setErrors(errs);
    if (Object.keys(errs).length) { setAlert(t('validation.fixHighlighted')); return; }

    try {
      await login(email.trim(), password); // the redirect below takes over once the user is set
    } catch (err) {
      setAlert(err.message || t('auth.login.failed'));
    }
  };

  // already signed in: there is nothing to do here
  if (user) return <Navigate to={safePath(state?.from) || homeFor(user)} replace />;

  return (
    <>
      <div className="page-header"><div className="container"><h1>{t('auth.login.heading')}</h1><p>{t('auth.login.intro')}</p></div></div>
      <section className="container">
        {alert && <div className="alert alert-error">{alert}</div>}
        <form className="form-card" onSubmit={onSubmit} noValidate>
          <div className={`form-group${errors.email ? ' has-error' : ''}`}>
            <label htmlFor="email">{t('auth.login.email')}</label>
            <input id="email" {...emailAttrs} value={email} onChange={e => setEmail(e.target.value)} />
            <div className="error-text">{t('validation.email')}</div>
          </div>
          <div className={`form-group${errors.password ? ' has-error' : ''}`}>
            <label htmlFor="password">{t('auth.login.password')}</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <div className="error-text">{t('validation.password')}</div>
          </div>
          <button type="submit" className="btn btn-primary btn-block">{t('auth.login.submit')}</button>
          <p className="form-switch">
            {t('auth.login.noAccount')} <Link to="/register">{t('auth.login.signUp')}</Link>
          </p>
          <p className="form-note">
            {t('auth.login.demo')}
          </p>
        </form>
      </section>
    </>
  );
}
