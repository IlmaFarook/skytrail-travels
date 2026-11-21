import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { api } from '../api';
import PackageCard from '../components/PackageCard';
import SearchBox from '../components/SearchBox';
import DestinationImage from '../components/DestinationImage';
import { useSite } from '../context/SiteContext';
import { useCurrency } from '../context/CurrencyContext';
import usePageMeta from '../hooks/usePageMeta';

const reasonIds = ['expertise', 'pricing', 'support'];

export default function HomePage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.home.title'), t('meta.home.description'));
  const { business, stats } = useSite();
  const { currency } = useCurrency();
  const [packages, setPackages] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [testimonials, setTestimonials] = useState(null);

  useEffect(() => {
    api.getDestinations().then(setDestinations).catch(() => setDestinations([]));
    api.getTestimonials().then(setTestimonials).catch(() => setTestimonials([]));
  }, []);

  // the staff choose which packages are featured, the API sends them already converted
  useEffect(() => {
    api.getPackages({ featured: 1 }).then(setPackages).catch(() => setPackages([]));
  }, [currency]);

  const heroDestination = (image) => destinations.find(d => d.photo && d.photo.image === image);
  const ella = heroDestination('ella');
  const mirissa = heroDestination('mirissa');

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">{t('home.eyebrow')}</p>
            <h1><Trans i18nKey="home.heading" components={{ em: <em /> }} /></h1>
            <p className="lede">{t('home.lede')}</p>
            <SearchBox />
            <dl className="hero-stats">
              <div><dt>{t('home.stats.est')}</dt><dd>{business ? business.founded : t('common.loadingShort')}</dd></div>
              <div><dt>{t('home.stats.destinations')}</dt><dd><Link to="/destinations">{stats ? stats.destinations : t('common.loadingShort')}</Link></dd></div>
              <div><dt>{t('home.stats.journeys')}</dt><dd><Link to="/destinations">{stats ? stats.packages : t('common.loadingShort')}</Link></dd></div>
            </dl>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="arch">
              <DestinationImage photo={ella?.photo} place={ella ? ella.name : ''} decorative eager sizes="(max-width: 900px) 100vw, 520px" />
            </div>
            <div className="arch arch-small">
              <DestinationImage photo={mirissa?.photo} place={mirissa ? mirissa.name : ''} decorative sizes="(max-width: 900px) 60vw, 280px" />
            </div>
            <svg className="stamp" viewBox="0 0 120 120">
              <defs><path id="stamp-circle" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" /></defs>
              <text><textPath href="#stamp-circle">{t('home.stamp')}</textPath></text>
              <circle cx="60" cy="60" r="20" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M52 62 C56 50 66 50 68 60" fill="none" stroke="var(--terracotta)" strokeWidth="2" strokeDasharray="1.5 4" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </section>

      <section className="container section">
        <header className="section-head">
          <span className="section-num">01</span>
          <div>
            <h2 className="section-title"><Link to="/destinations">{t('home.featured.title')}</Link></h2>
            <p className="section-sub">{t('home.featured.subtitle')}</p>
          </div>
          <Link to="/destinations" className="link-arrow">{t('home.featured.all')} <span aria-hidden="true">→</span></Link>
        </header>
        <div className="grid">
          {packages === null && <p>{t('home.featured.loading')}</p>}
          {packages?.length === 0 && <p>{t('home.featured.empty')}</p>}
          {packages?.map(p => <PackageCard key={p.id} pkg={p} />)}
        </div>
      </section>

      <section className="container section">
        <header className="section-head">
          <span className="section-num">02</span>
          <div>
            <h2 className="section-title">{t('home.why.title')}</h2>
          </div>
        </header>
        <div className="reasons">
          {reasonIds.map(id => (
            <div className="reason" key={id}>
              <span className="reason-n">{t(`home.why.${id}.number`)}.</span>
              <h3>{t(`home.why.${id}.title`)}</h3>
              <p>{t(`home.why.${id}.text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container section">
        <header className="section-head">
          <span className="section-num">03</span>
          <div>
            <h2 className="section-title">{t('home.notes.title')}</h2>
          </div>
        </header>
        <div className="quotes">
          {testimonials === null && <p>{t('home.notes.loading')}</p>}
          {testimonials?.map(item => (
            <figure className="quote" key={item.id}>
              <blockquote>{item.quote}</blockquote>
              <figcaption>
                <span className="stars" aria-label={t('a11y.ratingOutOf', { rating: item.rating })}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span>
                <span className="by">{item.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}
