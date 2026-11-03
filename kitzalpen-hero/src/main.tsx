import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SeasonProvider } from './lib/season';
import './index.css';

document.documentElement.classList.add('js');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SeasonProvider>
      <App />
    </SeasonProvider>
  </StrictMode>,
);
