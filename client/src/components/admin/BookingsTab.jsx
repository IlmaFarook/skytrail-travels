import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import { useSite } from '../../context/SiteContext';

export default function BookingsTab({ onChange }) {
  const { t } = useTranslation();
  const { config } = useSite();
  const statuses = config ? config.bookingStatuses : [];
  const [bookings, setBookings] = useState(null);
  const [filter, setFilter] = useState('');

  const load = () => api.adminBookings().then(setBookings).catch(() => setBookings([]));

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (id, status) => {
    await api.adminUpdateBooking(id, status);
    await load();
    onChange();
  };

  const shown = bookings ? bookings.filter(b => !filter || b.status === filter) : null;

  return (
    <div className="manage">
      <div className="manage-head">
        <h2>{t('admin.bookings.heading')}</h2>
        <div className="field-inline">
          <label htmlFor="status-filter">{t('admin.bookings.show')}</label>
          <select id="status-filter" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">{t('admin.bookings.allStatuses')}</option>
            {statuses.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </select>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.bookings.headers.customer')}</th>
              <th>{t('admin.bookings.headers.package')}</th>
              <th>{t('admin.bookings.headers.destination')}</th>
              <th>{t('admin.bookings.headers.travelDate')}</th>
              <th>{t('admin.bookings.headers.travellers')}</th>
              <th>{t('admin.bookings.headers.contact')}</th>
              <th>{t('admin.bookings.headers.status')}</th>
              <th>{t('admin.bookings.headers.update')}</th>
            </tr>
          </thead>
          <tbody>
            {shown === null && <tr><td colSpan={8}>{t('common.loading')}</td></tr>}
            {shown?.length === 0 && <tr><td colSpan={8}>{t('admin.bookings.none')}</td></tr>}
            {shown?.map(b => (
              <tr key={b.id}>
                <td>{b.full_name}</td>
                <td>{b.package_title}</td>
                <td>{b.destination_name}</td>
                <td>{b.travel_date}</td>
                <td>{b.travellers}</td>
                <td>{b.email}<br />{b.phone}</td>
                <td><span className={`status-pill status-${b.status}`}>{t(`status.${b.status}`)}</span></td>
                <td>
                  <select aria-label={t('admin.bookings.statusFor', { id: b.id })} value={b.status} onChange={e => changeStatus(b.id, e.target.value)}>
                    {statuses.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
