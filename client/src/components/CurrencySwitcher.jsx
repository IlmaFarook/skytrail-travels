import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';

export default function CurrencySwitcher({ idSuffix = '' }) {
  const { t } = useTranslation();
  const { currency, choose, list } = useCurrency();
  const id = `currency${idSuffix}`;
  // if the list did not load only LKR is shown
  const options = list.length > 0 ? list : [{ code: 'LKR' }];

  return (
    <div className="currency-switcher">
      <label htmlFor={id} className="sr-only">{t('currency.label')}</label>
      <select id={id} value={currency} onChange={e => choose(e.target.value)} disabled={options.length < 2}>
        {options.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
      </select>
    </div>
  );
}
