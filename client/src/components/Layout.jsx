import { Suspense, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import Logo from './Logo';
import CompareBar from './CompareBar';
import SocialLinks from './SocialLinks';
import CurrencySwitcher from './CurrencySwitcher';
import ErrorBoundary from './ErrorBoundary';

function AuthLinks({ onNavigate }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <>
        <NavLink to="/login" onClick={onNavigate}>{t('nav.login')}</NavLink>
        <NavLink to="/register" className="btn btn-primary btn-sm" onClick={onNavigate}>{t('nav.signUp')}</NavLink>
      </>
    );
  }

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    onNavigate?.();
    navigate('/');
  };

  return (
    <>
      <span className="greeting">{t('nav.greeting', { name: user.name.split(' ')[0] })}</span>
      <NavLink to={user.role === 'admin' ? '/admin' : '/my-bookings'} onClick={onNavigate}>
        {user.role === 'admin' ? t('nav.admin') : t('nav.myBookings')}
      </NavLink>
      <a href="#" className="logout-link" onClick={handleLogout}>{t('nav.logout')}</a>
    </>
  );
}

export default function Layout() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { business } = useSite();
  const { pathname } = useLocation();

  const navLinks = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/destinations', label: t('nav.destinations') },
    { to: '/gallery', label: t('nav.gallery') },
    { to: '/about', label: t('nav.about') },
  ];

  return (
    <>
      <a className="skip-link" href="#main">{t('a11y.skipToMain')}</a>
      <header className="site-header">
        <div className="nav-wrap">
          <NavLink to="/" className="brand">
            <Logo />
            <span className="brand-text">{t('brand.name')}<small>{t('brand.tagline')}</small></span>
          </NavLink>
          <button className="nav-toggle" aria-label={t('a11y.toggleNavigation')} aria-expanded={open} onClick={() => setOpen(o => !o)}>
            <span /><span />
          </button>
          <nav className={`main-nav${open ? ' open' : ''}`}>
            <ul>
              {navLinks.map(l => (
                <li key={l.to}>
                  <NavLink to={l.to} end={l.end} onClick={() => setOpen(false)}
                    className={({ isActive }) => isActive ? 'active' : undefined}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div id="nav-auth-area-mobile">
              <AuthLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="nav-currency-mobile"><CurrencySwitcher idSuffix="-mobile" /></div>
          </nav>
          <div id="nav-auth-area"><CurrencySwitcher /><AuthLinks /></div>
        </div>
      </header>

      <main id="main">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<p className="container">{t('common.loading')}</p>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <CompareBar />

      <footer className="site-footer">
        <div className="container">
          <div className="footer-hero">
            <p className="footer-tagline">{t('footer.tagline')}</p>
            <NavLink to="/destinations" className="btn btn-light">{t('footer.planJourney')}</NavLink>
          </div>
          <div className="footer-grid">
            <div>
              <h2>{t('footer.studio')}</h2>
              {business && <p>{business.address}</p>}
              {business && <p><a href={`tel:${business.phoneLink}`}>{business.phone}</a><br />{business.email}</p>}
            </div>
            <div>
              <h2>{t('footer.explore')}</h2>
              <p><NavLink to="/destinations">{t('footer.destinations')}</NavLink></p>
              <p><NavLink to="/gallery">{t('footer.galleryJournal')}</NavLink></p>
              <p><NavLink to="/about#faq">{t('footer.faqs')}</NavLink></p>
              <p><NavLink to="/compare">{t('footer.compare')}</NavLink></p>
              <p><NavLink to="/privacy">{t('footer.privacy')}</NavLink></p>
              <p><NavLink to="/credits">{t('footer.credits')}</NavLink></p>
            </div>
            <div>
              <h2>{t('footer.account')}</h2>
              <p><NavLink to="/login">{t('footer.login')}</NavLink></p>
              <p><NavLink to="/register">{t('footer.createAccount')}</NavLink></p>
            </div>
            <div>
              <h2>{t('footer.follow')}</h2>
              <SocialLinks />
            </div>
          </div>
          <div className="footer-bottom">
            <span>{t('footer.copyright')}</span>
            {business && <span>{t('footer.est', { founded: business.founded, locality: business.locality, region: business.region })}</span>}
          </div>
        </div>
      </footer>
    </>
  );
}
