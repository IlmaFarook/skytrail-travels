import { useTranslation } from 'react-i18next';
import { useCurrency } from '../context/CurrencyContext';

// shown under prices when they have been converted from LKR
export default function CurrencyNote() {
  const { t } = useTranslation();
  const { currency, updated } = useCurrency();
  if (currency === 'LKR') return null;

  return (
    <p className="currency-note">
      {t('currency.note', { date: updated })}{' '}
      <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
        {t('currency.credit')}<span className="sr-only"> {t('a11y.opensNewTab')}</span>
      </a>
    </p>
  );
}
