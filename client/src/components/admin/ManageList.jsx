import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';

// Table with add, edit and delete, used by most admin tabs.
// kind picks the wording (admin.nouns.<kind>), idPrefix keeps input ids stable.
export default function ManageList({ title, kind, idPrefix, load, create, update, remove, columns, fields, blank }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const noun = t(`admin.nouns.${kind}.title`);
  const nounLower = t(`admin.nouns.${kind}.lower`);

  const [items, setItems] = useState(null);
  const [editingId, setEditingId] = useState(null); // 'new', a record id, or null
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const reload = () => load().then(setItems).catch(() => setItems([]));

  useEffect(() => {
    reload();
  }, []);

  const startNew = () => {
    setError('');
    setMessage('');
    setForm(blank);
    setEditingId('new');
  };

  const startEdit = (item) => {
    setError('');
    setMessage('');
    const values = {};
    fields.forEach(f => { values[f.name] = item[f.name] == null ? '' : String(item[f.name]); });
    setForm(values);
    setEditingId(item.id);
  };

  const onChange = (name) => (e) => setForm(f => ({ ...f, [name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    for (const f of fields) {
      if (f.required !== false && String(form[f.name]).trim() === '') {
        setError(t('admin.manage.required', { field: f.label }));
        return;
      }
    }
    try {
      if (editingId === 'new') {
        await create(form);
        setMessage(t('admin.manage.added', { noun }));
      } else {
        await update(editingId, form);
        setMessage(t('admin.manage.updated', { noun }));
      }
      setEditingId(null);
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const onDelete = async (item) => {
    const sure = await confirm({
      title: t('admin.manage.confirmDelete', { noun: nounLower }),
      message: t('common.cannotUndo'),
      confirmLabel: t('common.delete'),
    });
    if (!sure) return;
    setError('');
    setMessage('');
    try {
      await remove(item.id);
      setMessage(t('admin.manage.deleted', { noun }));
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="manage">
      <div className="manage-head">
        <h2>{title}</h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={startNew}>{t('admin.manage.addTitle', { noun: nounLower })}</button>
      </div>

      {message && <div className="alert alert-success alert-wide" role="status">{message}</div>}
      {error && editingId === null && <div className="alert alert-error alert-wide" role="alert">{error}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>{columns.map(c => <th key={c.label}>{c.label}</th>)}<th>{t('admin.manage.actions')}</th></tr>
          </thead>
          <tbody>
            {items === null && <tr><td colSpan={columns.length + 1}>{t('common.loading')}</td></tr>}
            {items?.length === 0 && <tr><td colSpan={columns.length + 1}>{t('admin.manage.empty')}</td></tr>}
            {items?.map(item => (
              <tr key={item.id}>
                {columns.map(c => <td key={c.label}>{c.render(item)}</td>)}
                <td className="row-actions">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(item)}>{t('common.edit')}</button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => onDelete(item)}>{t('common.delete')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId !== null && (
        <form className="form-card edit-panel" onSubmit={onSubmit} noValidate>
          <h3>{editingId === 'new' ? t('admin.manage.addTitle', { noun: nounLower }) : t('admin.manage.editTitle', { noun: nounLower })}</h3>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {fields.map(f => (
            <div className="form-group" key={f.name}>
              <label htmlFor={`${idPrefix}-${f.name}`}>{f.label}{f.required === false ? ` ${t('admin.manage.optional')}` : ''}</label>
              {f.type === 'textarea' && (
                <textarea id={`${idPrefix}-${f.name}`} value={form[f.name]} onChange={onChange(f.name)} />
              )}
              {f.type === 'select' && (
                <select id={`${idPrefix}-${f.name}`} value={form[f.name]} onChange={onChange(f.name)}>
                  <option value="">{t('common.choose')}</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              {f.type !== 'textarea' && f.type !== 'select' && (
                <input id={`${idPrefix}-${f.name}`} type={f.type || 'text'} value={form[f.name]} onChange={onChange(f.name)} min={f.min} max={f.max} />
              )}
            </div>
          ))}
          <div className="form-buttons">
            <button type="submit" className="btn btn-primary">{t('common.save')}</button>
            <button type="button" className="btn btn-outline" onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
          </div>
        </form>
      )}
    </div>
  );
}
