import { useTranslation } from 'react-i18next';

// A textarea with a limit and a live count below it.
export default function LimitedTextarea({ id, value, onChange, max, placeholder }) {
  const { t } = useTranslation();
  const used = value.length;
  const near = max && used >= max * 0.9;
  return (
    <>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        maxLength={max}
        placeholder={placeholder}
        aria-describedby={`${id}-count`}
      />
      <div id={`${id}-count`} className={`char-count${near ? ' is-near' : ''}`} aria-live="polite">
        {t('form.chars', { used, max })}
      </div>
    </>
  );
}
