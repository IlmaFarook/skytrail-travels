import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { enGB } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { useTranslation } from 'react-i18next';
import { fromIsoDate, toIsoDate } from '../lib/forms';

// A button that opens a calendar. The value is a date like 2026-12-20.
export default function DateField({ id, value, onChange, min, max, invalid }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const buttonRef = useRef(null);

  const selected = fromIsoDate(value);
  const first = fromIsoDate(min);
  const last = fromIsoDate(max);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const shown = selected
    ? new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(selected)
    : t('form.pickDate');

  return (
    <div className="date-field" ref={boxRef} onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); close(); } }}>
      <button
        type="button"
        id={id}
        ref={buttonRef}
        className={`date-button${selected ? '' : ' is-empty'}${invalid ? ' is-invalid' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen(o => !o)}
      >
        <span>{shown}</span>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
          <rect x="3" y="4.5" width="14" height="12.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 8.5h14M7 2.5v3M13 2.5v3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="date-popover" role="dialog" aria-label={t('form.pickDate')}>
          <DayPicker
            mode="single"
            autoFocus
            locale={enGB}
            weekStartsOn={1}
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected || first}
            startMonth={first}
            endMonth={last}
            disabled={[{ before: first }, { after: last }]}
            onSelect={(date) => {
              if (date) {
                onChange(toIsoDate(date));
                close();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
