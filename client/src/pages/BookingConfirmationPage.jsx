import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import CurrencyNote from '../components/CurrencyNote';
import usePageMeta from '../hooks/usePageMeta';
import { LoginRedirect } from '../lib/access';
import { formatPhone } from '../lib/phone';

export default function BookingConfirmationPage() {
  const { t, i18n } = useTranslation();
  usePageMeta(t('meta.bookingConfirmation.title'), t('meta.bookingConfirmation.description'));
  const { reference } = useParams();
  const { user, loading } = useAuth();
  const { money, currency } = useCurrency();
  const [booking, setBooking] = useState(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.bookingByReference(reference).then(setBooking).catch(() => setMissing(true));
  }, [user, reference, currency]);

  if (loading) return <p className="container">{t('common.loading')}</p>;
  if (!user) return <LoginRedirect />;

  if (missing) {
    return (
      <section className="container section-top">
        <h1>{t('confirmation.notFoundHeading')}</h1>
        <p>{t('confirmation.notFoundText')}</p>
        <Link to="/my-bookings" className="btn btn-primary">{t('confirmation.viewBookings')}</Link>
      </section>
    );
  }
  if (!booking) return <p className="container">{t('common.loading')}</p>;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(booking.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false); // the browser blocked it, the reference is on screen anyway
    }
  };

  const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(`${booking.travel_date}T00:00:00`));
  const details = [
    ['package', booking.package_title],
    ['destination', `${booking.destination_name}, ${booking.destination_country}`],
    ['travelDate', date],
    ['travellers', booking.travellers],
    ['total', money(booking.total_converted, booking.currency)],
    ['contact', <>{booking.email}<br />{formatPhone(booking.phone)}</>],
  ];

  return (
    <>
      <div className="page-header">
        <div className="container">
          <p className="eyebrow">{t('confirmation.eyebrow')}</p>
          <h1>{t('confirmation.heading')}</h1>
          <p>{t('confirmation.intro', { name: booking.full_name.split(' ')[0] })}</p>
        </div>
      </div>

      <section className="container">
        <div className="confirm-card">
          <div className="confirm-ref">
            <div>
              <span className="confirm-label">{t('confirmation.reference')}</span>
              <strong id="booking-reference">{booking.reference}</strong>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={copy}>
              {copied ? t('confirmation.copied') : t('confirmation.copy')}
            </button>
          </div>
          <p className="muted small" role="status">{copied ? t('confirmation.copiedNote') : t('confirmation.keep')}</p>

          <dl className="confirm-details">
            {details.map(([key, value]) => (
              <div key={key}>
                <dt>{t(`confirmation.details.${key}`)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div>
              <dt>{t('confirmation.details.status')}</dt>
              <dd><span className={`status-pill status-${booking.status}`}>{t(`status.${booking.status}`)}</span></dd>
            </div>
          </dl>
          <CurrencyNote />

          <h2>{t('confirmation.nextTitle')}</h2>
          <ol className="confirm-steps">
            <li>{t('confirmation.steps.review')}</li>
            <li>{t('confirmation.steps.contact')}</li>
            <li>{t('confirmation.steps.status')}</li>
          </ol>

          <div className="confirm-actions">
            <Link to="/my-bookings" className="btn btn-primary">{t('confirmation.viewBookings')}</Link>
            <Link to="/destinations" className="btn btn-outline">{t('confirmation.browseMore')}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
