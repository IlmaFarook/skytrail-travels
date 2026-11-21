import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useRules, useSite } from '../context/SiteContext';
import usePageMeta from '../hooks/usePageMeta';
import SocialLinks from '../components/SocialLinks';
import LimitedTextarea from '../components/LimitedTextarea';
import { cleanName, emailAttrs } from '../lib/forms';


// a small window around the business position
function mapUrl({ lat, lon }) {
  const d = 0.013;
  const bbox = [lon - d, lat - d, lon + d, lat + d].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;
}

export default function AboutPage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.about.title'), t('meta.about.description'));
  const { business } = useSite();
  const { config, emailOk, nameOk } = useRules();
  const [faqs, setFaqs] = useState(null);

  useEffect(() => {
    api.getFaqs().then(setFaqs).catch(() => setFaqs([]));
  }, []);

  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    const errs = {};
    if (!nameOk(form.name)) errs.name = true;
    if (!emailOk(form.email.trim())) errs.email = true;
    if (!form.message.trim()) errs.message = true;
    setErrors(errs);
    if (Object.keys(errs).length) { setAlert({ type: 'error', text: t('validation.fixHighlighted') }); return; }

    try {
      const data = await api.sendContact(form);
      setAlert({ type: 'success', text: data.message });
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setAlert({ type: 'error', text: err.message || t('about.form.failed') });
    }
  };

  return (
    <>
      <div className="page-header"><div className="container"><p className="eyebrow">{t('about.eyebrow')}</p><h1>{t('about.heading')}</h1><p>{t('about.intro')}</p></div></div>

      <section className="container">
        <div className="two-col">
          <div>
            <h2>{t('about.storyTitle')}</h2>
            <p>{t('about.story')}</p>
            <h2>{t('about.missionTitle')}</h2>
            <p>{t('about.mission')}</p>
          </div>
          <div>
            <aside className="contact-card">
              <h3>{t('about.visit')}</h3>
              <p>{business?.address}</p>
              <h3>{t('about.call')}</h3>
              <p>{business && <a href={`tel:${business.phoneLink}`}>{business.phone}</a>}</p>
              <h3>{t('about.email')}</h3>
              <p>{business?.email}</p>
              <h3>{t('about.follow')}</h3>
              <SocialLinks />
            </aside>
            {business && (
              <figure className="map-box">
                <iframe
                  title={t('about.mapTitle', { locality: business.locality, region: business.region })}
                  src={mapUrl(business.map)}
                  loading="lazy"
                />
                <figcaption>
                  {t('about.mapCaption', { locality: business.locality, region: business.region })}{' '}
                  <a href={`https://www.openstreetmap.org/?mlat=${business.map.lat}&mlon=${business.map.lon}#map=15/${business.map.lat}/${business.map.lon}`} target="_blank" rel="noopener noreferrer">{t('about.mapLink')}<span className="sr-only"> {t('a11y.opensNewTab')}</span></a>
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </section>

      {business && (
      <>
      <section className="container" id="faq">
        <header className="section-head"><span className="section-num">•</span><div><h2 className="section-title">{t('about.faqTitle')}</h2></div></header>
        {faqs === null && <p>{t('common.loading')}</p>}
        {faqs?.map(f => (
          <div className="faq-item" key={f.id}><h3>{f.question}</h3><p>{f.answer}</p></div>
        ))}
      </section>

      <section className="container">
        <header className="section-head"><span className="section-num">•</span><div><h2 className="section-title">{t('about.contactTitle')}</h2></div></header>
        {alert && <div className={`alert alert-${alert.type}`}>{alert.text}</div>}
        <form className="form-card" onSubmit={onSubmit} noValidate>
          <div className={`form-group${errors.name ? ' has-error' : ''}`}>
            <label htmlFor="c-name">{t('about.form.name')}</label>
            <input id="c-name" value={form.name} maxLength={config?.nameMax} autoComplete="name"
              onChange={(e) => setForm(f => ({ ...f, name: cleanName(e.target.value, config) }))} />
            <div className="error-text">{t('validation.name', { max: config?.nameMax ?? '' })}</div>
          </div>
          <div className={`form-group${errors.email ? ' has-error' : ''}`}>
            <label htmlFor="c-email">{t('about.form.email')}</label>
            <input id="c-email" {...emailAttrs} value={form.email} onChange={update('email')}
              onBlur={() => setForm(f => ({ ...f, email: f.email.trim().toLowerCase() }))} />
            <div className="error-text">{t('validation.email')}</div>
          </div>
          <div className={`form-group${errors.message ? ' has-error' : ''}`}>
            <label htmlFor="c-message">{t('about.form.message')}</label>
            <LimitedTextarea id="c-message" max={config?.messageMax} value={form.message} onChange={update('message')} />
            <div className="error-text">{t('validation.message')}</div>
          </div>
          <button type="submit" className="btn btn-primary btn-block">{t('about.form.send')}</button>
        </form>
      </section>
      </>
      )}
    </>
  );
}
