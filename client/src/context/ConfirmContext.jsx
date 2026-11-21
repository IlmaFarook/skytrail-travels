import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ConfirmContext = createContext(null);

// One confirmation dialog for the whole site, instead of the browser's own pop-up.
// Use it like this: if (!(await confirm({ title, message, confirmLabel }))) return;
export function ConfirmProvider({ children }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState(null);
  const dialogRef = useRef(null);
  const answer = useRef(null);

  const confirm = useCallback((next) => new Promise((resolve) => {
    answer.current = resolve;
    setOptions(next);
  }), []);

  // showModal() gives a dark backdrop, keeps keyboard focus inside and closes on Escape
  useEffect(() => {
    if (options) dialogRef.current?.showModal();
  }, [options]);

  const finish = (result) => {
    dialogRef.current?.close();
    answer.current?.(result);
    answer.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <dialog
          ref={dialogRef}
          className="modal"
          aria-labelledby="modal-title"
          aria-describedby="modal-text"
          onCancel={(e) => { e.preventDefault(); finish(false); }}
          onClick={(e) => { if (e.target === e.currentTarget) finish(false); }}
        >
          <div className="modal-body">
            <h2 id="modal-title">{options.title}</h2>
            {options.message && <p id="modal-text">{options.message}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" autoFocus onClick={() => finish(false)}>
                {options.cancelLabel || t('common.goBack')}
              </button>
              <button type="button" className={`btn modal-confirm ${options.danger === false ? 'btn-primary' : 'btn-danger'}`} onClick={() => finish(true)}>
                {options.confirmLabel}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}
