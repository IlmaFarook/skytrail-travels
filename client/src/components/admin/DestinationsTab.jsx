import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import ManageList from './ManageList';

export default function DestinationsTab() {
  const { t } = useTranslation();

  const fields = [
    { name: 'name', label: t('admin.destinations.fields.name') },
    { name: 'country', label: t('admin.destinations.fields.country') },
    { name: 'region', label: t('admin.destinations.fields.region'), required: false },
    { name: 'description', label: t('admin.destinations.fields.description'), type: 'textarea' },
  ];

  const columns = [
    { label: t('admin.destinations.columns.name'), render: d => d.name },
    { label: t('admin.destinations.columns.country'), render: d => d.country },
    { label: t('admin.destinations.columns.region'), render: d => d.region },
  ];

  return (
    <ManageList
      title={t('admin.destinations.heading')}
      kind="destination"
      idPrefix="Destination"
      load={() => api.getDestinations()}
      create={data => api.adminCreate('destinations', data)}
      update={(id, data) => api.adminUpdate('destinations', id, data)}
      remove={id => api.adminDelete('destinations', id)}
      columns={columns}
      fields={fields}
      blank={{ name: '', country: '', region: '', description: '' }}
    />
  );
}
