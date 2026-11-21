import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useRules } from '../context/SiteContext';

const WAIT_MS = 200;

// the part of the title the visitor typed is shown in bold
function Highlight({ text, term }) {
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}<mark>{text.slice(at, at + term.length)}</mark>{text.slice(at + term.length)}
    </>
  );
}

const pathFor = (item) => (item.type === 'package' ? `/packages/${item.id}` : `/destinations?destination=${item.id}`);

export default function SearchBox() {
  const { t } = useTranslation();
  const { config } = useRules();
  const navigate = useNavigate();
  const listId = useId();
  const boxRef = useRef(null);
  const latest = useRef(0);
  const timer = useRef(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState([]);
  const [popular, setPopular] = useState([]);
  const [active, setActive] = useState(-1);

  const minChars = config?.suggestMinChars ?? 2;
  const term = query.trim();
  const ready = term.length >= minChars;

  const ask = (text) => {
    const id = ++latest.current;
    api.suggest(text)
      .then(data => {
        if (id !== latest.current) return; // a newer request is already on its way
        setMatches(data.matches);
        setPopular(data.popular);
      })
      .catch(() => {
        if (id === latest.current) setMatches([]);
      });
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const onChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setActive(-1);
    setOpen(true);
    clearTimeout(timer.current);
    if (value.trim().length < minChars) {
      latest.current++;
      setMatches([]);
      return;
    }
    timer.current = setTimeout(() => ask(value.trim()), WAIT_MS);
  };

  const onFocus = () => {
    setOpen(true);
    if (popular.length === 0) ask('');
  };

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const pick = (item) => {
    setQuery(item.title);
    close();
    navigate(pathFor(item));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      setOpen(true);
      setActive(a => (a + 1) % matches.length);
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault();
      setOpen(true);
      setActive(a => (a <= 0 ? matches.length - 1 : a - 1));
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault();
      pick(matches[active]);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    close();
    navigate(term ? `/destinations?q=${encodeURIComponent(term)}` : '/destinations');
  };

  // close when focus leaves the whole box (clicks on the panel keep it, see onMouseDown below)
  const onBlur = (e) => {
    if (!boxRef.current?.contains(e.relatedTarget)) close();
  };

  const showPanel = open && (matches.length > 0 || popular.length > 0 || term.length > 0);
  const optionId = (i) => `${listId}-${i}`;

  return (
    <div className="search-box" ref={boxRef} onBlur={onBlur}>
      <form className="search-bar" role="search" onSubmit={onSubmit}>
        <input
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          value={query}
          onChange={onChange}
          onFocus={onFocus}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('home.searchPlaceholder')}
          aria-label={t('home.searchLabel')}
        />
        <button type="submit" className="btn btn-primary">{t('home.search')}</button>
      </form>

      {showPanel && (
        <div className="suggest-panel" onMouseDown={(e) => e.preventDefault()}>
          <div className="suggest-main">
            <p className="suggest-head">{t('search.matches')}</p>
            <ul id={listId} role="listbox" aria-label={t('search.matches')}>
              {matches.map((item, i) => (
                <li
                  key={`${item.type}-${item.id}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? 'suggest-option is-active' : 'suggest-option'}
                  onClick={() => pick(item)}
                >
                  <span className="suggest-title"><Highlight text={item.title} term={term} /></span>
                  <span className="suggest-sub">{item.subtitle}</span>
                </li>
              ))}
            </ul>
            {matches.length === 0 && (
              <p className="suggest-note">{ready ? t('search.none') : t('search.hint', { min: minChars })}</p>
            )}
          </div>

          {popular.length > 0 && (
            <nav className="suggest-popular" aria-label={t('search.popular')}>
              <p className="suggest-head">{t('search.popular')}</p>
              <ul>
                {popular.map(d => (
                  <li key={d.id}>
                    <Link to={pathFor({ type: 'destination', id: d.id })} onClick={close}>
                      <span className="suggest-title">{d.title}</span>
                      <span className="suggest-sub">{d.subtitle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {open && ready ? t('search.count', { count: matches.length }) : ''}
      </p>
    </div>
  );
}
