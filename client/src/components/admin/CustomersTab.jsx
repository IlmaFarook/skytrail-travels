import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function CustomersTab() {
  const { t } = useTranslation();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.adminUsers().then(setUsers).catch(() => setUsers([]));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (u) => {
    setError('');
    try {
      await api.adminSetUserActive(u.id, !u.is_active);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="manage">
      <div className="manage-head"><h2>{t('admin.customers.heading')}</h2></div>
      {error && <div className="alert alert-error alert-wide" role="alert">{error}</div>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.customers.headers.name')}</th>
              <th>{t('admin.customers.headers.email')}</th>
              <th>{t('admin.customers.headers.role')}</th>
              <th>{t('admin.customers.headers.joined')}</th>
              <th>{t('admin.customers.headers.bookings')}</th>
              <th>{t('admin.customers.headers.account')}</th>
              <th>{t('admin.customers.headers.action')}</th>
            </tr>
          </thead>
          <tbody>
            {users === null && <tr><td colSpan={7}>{t('common.loading')}</td></tr>}
            {users?.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{t(`admin.customers.roles.${u.role}`)}</td>
                <td>{u.created_at}</td>
                <td>{u.booking_count}</td>
                <td><span className={`status-pill ${u.is_active ? 'status-Confirmed' : 'status-Cancelled'}`}>{u.is_active ? t('admin.customers.active') : t('admin.customers.disabled')}</span></td>
                <td>
                  {u.role === 'customer'
                    ? <button type="button" className="btn btn-outline btn-sm" onClick={() => toggle(u)}>{u.is_active ? t('admin.customers.disable') : t('admin.customers.enable')}</button>
                    : <span className="muted">{t('admin.customers.staffAccount')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
