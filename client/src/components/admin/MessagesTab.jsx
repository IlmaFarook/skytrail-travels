import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

export default function MessagesTab() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState(null);

  useEffect(() => {
    api.adminMessages().then(setMessages).catch(() => setMessages([]));
  }, []);

  return (
    <div className="manage">
      <div className="manage-head"><h2>{t('admin.messages.heading')}</h2></div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.messages.headers.received')}</th>
              <th>{t('admin.messages.headers.name')}</th>
              <th>{t('admin.messages.headers.email')}</th>
              <th>{t('admin.messages.headers.message')}</th>
            </tr>
          </thead>
          <tbody>
            {messages === null && <tr><td colSpan={4}>{t('common.loading')}</td></tr>}
            {messages?.length === 0 && <tr><td colSpan={4}>{t('admin.messages.none')}</td></tr>}
            {messages?.map(m => (
              <tr key={m.id}>
                <td>{m.created_at}</td>
                <td>{m.name}</td>
                <td><a href={`mailto:${m.email}`}>{m.email}</a></td>
                <td>{m.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
