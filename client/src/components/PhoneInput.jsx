import { useEffect, useMemo, useRef, useState } from 'react';
import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import { useTranslation } from 'react-i18next';
import { useRules } from '../context/SiteContext';

const flag = (code) => String.fromCodePoint(...[...code].map(c => 127397 + c.charCodeAt(0)));

// Country picker plus a number box. It keeps the number in international form (+94771234567).
export default function PhoneInput({ id, value, onChange, invalid }) {
  const { t, i18n } = useTranslation();
  const { config } = useRules();
  const fallback = config?.defaultPhoneCountry || 'LK';
  const lastSent = useRef(value);

  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([i18n.language], { type: 'region' });
    return getCountries()
      .map(code => ({ code, name: names.of(code), dial: getCountryCallingCode(code) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [i18n.language]);

  const start = (number) => {
    const parsed = number ? parsePhoneNumberFromString(number, fallback) : undefined;
    return parsed
      ? { country: parsed.country || fallback, text: parsed.formatNational() }
      : { country: fallback, text: number || '' };
  };
  const [state, setState] = useState(() => start(value));

  // the form can change the value from outside, for example after it is sent
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setState(start(value));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = (country, text) => {
    const number = parsePhoneNumberFromString(text, country)?.number || '';
    lastSent.current = number;
    onChange(number);
  };

  const onText = (e) => {
    const raw = e.target.value;
    // a number typed or pasted with + and a country code picks the country by itself
    if (raw.trim().startsWith('+')) {
      const typed = new AsYouType();
      const text = typed.input(raw);
      const country = typed.getCountry() || state.country;
      setState({ country, text });
      send(country, text);
      return;
    }
    const text = new AsYouType(state.country).input(raw);
    setState({ ...state, text });
    send(state.country, text);
  };

  const onCountry = (e) => {
    const country = e.target.value;
    const text = new AsYouType(country).input(state.text.replace(/^\+\d+\s*/, ''));
    setState({ country, text });
    send(country, text);
  };

  return (
    <div className={`phone-input${invalid ? ' is-invalid' : ''}`}>
      <label className="phone-country">
        <span aria-hidden="true">{flag(state.country)} +{getCountryCallingCode(state.country)}</span>
        <select value={state.country} onChange={onCountry} aria-label={t('form.phoneCountry')}>
          {countries.map(c => (
            <option key={c.code} value={c.code}>{flag(c.code)} {c.name} (+{c.dial})</option>
          ))}
        </select>
      </label>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={state.text}
        onChange={onText}
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}
