import { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

// The server converts prices. This only keeps its answer and formats numbers.
const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);

  const reload = () => api.getCurrencies().then(setInfo).catch(() => setInfo(null));

  useEffect(() => {
    reload();
  }, []);

  const currency = info ? info.selected : 'LKR';
  const list = info ? info.currencies : [];

  const choose = async (code) => {
    const result = await api.setCurrency(code);
    setInfo(old => (old ? { ...old, selected: result.selected } : old));
  };

  // amount is already in the currency named by code (the API sends it that way)
  const money = (amount, code = currency) => {
    if (code === 'LKR') {
      return t('price.lkr', { amount: Math.round(amount).toLocaleString('en-LK') });
    }
    const known = list.find(c => c.code === code);
    const formatted = new Intl.NumberFormat(known ? known.locale : undefined, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(amount);
    return t('currency.approx', { amount: formatted });
  };

  return (
    <CurrencyContext.Provider value={{ currency, list, updated: info ? info.updated : null, choose, money, reload }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}
