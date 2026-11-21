import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, formatCurrency } from '../../api';
import ManageList from './ManageList';

export default function PackagesTab({ onChange }) {
  const { t } = useTranslation();
  const [destinations, setDestinations] = useState([]);

  useEffect(() => {
    api.getDestinations().then(setDestinations).catch(() => setDestinations([]));
  }, []);

  const fields = [
    { name: 'title', label: t('admin.packages.fields.title') },
    { name: 'destination_id', label: t('admin.packages.fields.destination'), type: 'select', options: destinations.map(d => ({ value: d.id, label: `${d.name}, ${d.country}` })) },
    { name: 'category', label: t('admin.packages.fields.category') },
    { name: 'price', label: t('admin.packages.fields.price'), type: 'number', min: 1 },
    { name: 'duration_days', label: t('admin.packages.fields.days'), type: 'number', min: 1, max: 60 },
    { name: 'description', label: t('admin.packages.fields.description'), type: 'textarea' },
    { name: 'featured', label: t('admin.packages.fields.featured'), type: 'select', required: false, options: [{ value: '1', label: t('common.yes') }, { value: '0', label: t('common.no') }] },
  ];

  const columns = [
    { label: t('admin.packages.columns.title'), render: p => p.title },
    { label: t('admin.packages.columns.destination'), render: p => p.destination_name },
    { label: t('admin.packages.columns.category'), render: p => p.category },
    { label: t('admin.packages.columns.price'), render: p => formatCurrency(p.price) },
    { label: t('admin.packages.columns.days'), render: p => p.duration_days },
    { label: t('admin.packages.columns.featured'), render: p => (p.featured ? t('common.yes') : t('common.no')) },
  ];

  const wrap = (fn) => async (...args) => {
    const result = await fn(...args);
    onChange();
    return result;
  };

  return (
    <ManageList
      title={t('admin.packages.heading')}
      kind="package"
      idPrefix="Package"
      load={() => api.getPackages()}
      create={wrap(data => api.adminCreate('packages', data))}
      update={wrap((id, data) => api.adminUpdate('packages', id, data))}
      remove={wrap(id => api.adminDelete('packages', id))}
      columns={columns}
      fields={fields}
      blank={{ title: '', destination_id: '', category: '', price: '', duration_days: '', description: '', featured: '0' }}
    />
  );
}
