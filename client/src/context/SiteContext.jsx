import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

// Rules and business details come from the API. Both are null until they load.
const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [site, setSite] = useState(null);

  const reloadSite = () => api.getSite().then(setSite).catch(() => setSite(null));

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => setConfig(null));
    reloadSite();
  }, []);

  return (
    <SiteContext.Provider value={{ config, business: site ? site.business : null, stats: site ? site.stats : null, reloadSite }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
}

// Form checks using the server's rules. If they did not load, the check passes
// and the server decides.
export function useRules() {
  const { config } = useSite();
  return {
    config,
    emailOk: (value) => !config || new RegExp(config.emailPattern).test(value),
    phoneOk: (value) => !config || new RegExp(config.phonePattern).test(value),
    passwordOk: (value) => !config || (value.length >= config.passwordMinLength && /[A-Za-z]/.test(value) && /[0-9]/.test(value)),
    travellersOk: (value) => !config || (Number.isInteger(value) && value >= config.minTravellers && value <= config.maxTravellers),
    dateOk: (value) => !!value && (!config || value >= config.minTravelDate),
  };
}
