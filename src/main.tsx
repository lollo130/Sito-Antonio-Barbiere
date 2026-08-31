import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Se questo modulo non riesce nemmeno a caricarsi (tipicamente: variabili
// d'ambiente mancanti sul server di pubblicazione), la rete di sicurezza è
// lo script inline dentro index.html: qui non ci arriveremmo comunque.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((errore) => {
      console.error('Registrazione service worker fallita:', errore);
    });
  });
}
