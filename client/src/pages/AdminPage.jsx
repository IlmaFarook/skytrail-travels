import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import usePageMeta from '../hooks/usePageMeta';
import BookingsTab from '../components/admin/BookingsTab';
import PackagesTab from '../components/admin/PackagesTab';
import DestinationsTab from '../components/admin/DestinationsTab';
import CustomersTab from '../components/admin/CustomersTab';
import ContentTab from '../components/admin/ContentTab';
import MessagesTab from '../components/admin/MessagesTab';
import CurrenciesTab from '../components/admin/CurrenciesTab';
import SiteTab from '../components/admin/SiteTab';

const tabIds = ['bookings', 'packages', 'destinations', 'customers', 'content', 'messages', 'currencies', 'site'];

export default function AdminPage() {
  const { t } = useTranslation();
  usePageMeta(t('meta.admin.title'), t('meta.admin.description'));
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [stats, setStats] = useState(null);

  const tab = tabIds.includes(params.get('tab')) ? params.get('tab') : 'bookings';
  const isAdmin = user?.role === 'admin';

  const loadStats = () => api.adminStats().then(setStats).catch(() => {});

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin]);

  if (loading) return <p className="container">{t('common.loading')}</p>;

  if (!isAdmin) {
    return (
      <>
        <div className="page-header"><div className="container"><h1>{t('admin.heading')}</h1></div></div>
        <section className="container">
          <div className="form-card">
            <div className="alert alert-error">{t('admin.notAllowed')}</div>
            <Link to="/login" className="btn btn-primary btn-block">{t('admin.login')}</Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <div className="page-header"><div className="container"><p className="eyebrow">{t('admin.eyebrow')}</p><h1>{t('admin.heading')}</h1><p>{t('admin.intro')}</p></div></div>
      <section className="container">
        <div className="stats">
          <div className="stat"><span className="stat-n">{stats?.totalBookings ?? t('common.na')}</span><span className="stat-l">{t('admin.stats.total')}</span></div>
          <div className="stat"><span className="stat-n">{stats?.pendingBookings ?? t('common.na')}</span><span className="stat-l">{t('admin.stats.pending')}</span></div>
          <div className="stat"><span className="stat-n">{stats?.totalUsers ?? t('common.na')}</span><span className="stat-l">{t('admin.stats.customers')}</span></div>
          <div className="stat"><span className="stat-n">{stats?.totalPackages ?? t('common.na')}</span><span className="stat-l">{t('admin.stats.packages')}</span></div>
        </div>

        <div className="tabs" role="tablist" aria-label={t('admin.tablist')}>
          {tabIds.map(id => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls="admin-panel"
              className={tab === id ? 'tab active' : 'tab'}
              onClick={() => setParams({ tab: id })}
            >
              {t(`admin.tabs.${id}`)}
            </button>
          ))}
        </div>

        <div id="admin-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'bookings' && <BookingsTab onChange={loadStats} />}
          {tab === 'packages' && <PackagesTab onChange={loadStats} />}
          {tab === 'destinations' && <DestinationsTab />}
          {tab === 'customers' && <CustomersTab />}
          {tab === 'content' && <ContentTab />}
          {tab === 'messages' && <MessagesTab />}
          {tab === 'currencies' && <CurrenciesTab />}
          {tab === 'site' && <SiteTab />}
        </div>
      </section>
    </>
  );
}
