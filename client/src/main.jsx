import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SiteProvider } from './context/SiteContext.jsx';
import { CompareProvider } from './context/CompareContext.jsx';
import { CurrencyProvider } from './context/CurrencyContext.jsx';
import './styles/style.css';

// After a new build the old page files are gone. Reload once to pick up the new ones.
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem('reloadedAt') || 0);
  if (Date.now() - last < 10000) return;
  sessionStorage.setItem('reloadedAt', String(Date.now()));
  window.location.reload();
});

// Wait up to 1.5 seconds for the fonts so the text does not jump when they load.
const fontsReady = Promise.race([
  Promise.all([document.fonts.load('600 1em Fraunces'), document.fonts.load('400 1em "Work Sans"')]),
  new Promise(resolve => setTimeout(resolve, 1500)),
]);

fontsReady.then(() => createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SiteProvider>
          <CurrencyProvider>
            <CompareProvider>
              <App />
            </CompareProvider>
          </CurrencyProvider>
        </SiteProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
));
