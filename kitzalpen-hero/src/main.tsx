import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SeasonProvider } from './lib/season';
import { DaypartProvider } from './lib/daypart';
import { activateSiteLang, initialSiteLang, prepareSiteLang, startSiteLang } from './lib/i18n';
import './index.css';

document.documentElement.classList.add('js');

// load the visitor's language first, so a translated page never flashes English
const first = initialSiteLang();
prepareSiteLang(first).catch(() => undefined).then(() => {
  activateSiteLang(first);
  startSiteLang();
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SeasonProvider>
      <DaypartProvider>
        <App />
      </DaypartProvider>
    </SeasonProvider>
  </StrictMode>,
  );
});
