import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SeasonProvider } from './lib/season';
import { DaypartProvider } from './lib/daypart';
import { activateSiteLang, initialSiteLang, prepareSiteLang, siteLang, startSiteLang } from './lib/i18n';
import { pathLang, startLinks } from './lib/routes';
// fonts are served from this site (no request to Google Fonts)
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './index.css';

document.documentElement.classList.add('js');

// load the visitor's language first, so a translated page never flashes English
// live site: the address decides the language (/ = German, /en/ = English …); preview copies: saved choice / browser
const first = pathLang() ?? initialSiteLang();
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
  startLinks(siteLang);
});
