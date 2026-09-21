import { useEffect, useState } from "react";
import Calendario from './pages/Calendario';
import { Route, Routes, useLocation } from "react-router-dom";
import { aggiornaTagApp } from "./lib/installazione";
import BannerCookie from "./components/BannerCookie";
import Benvenuto from "./components/Benvenuto";
import { inApp, leggiCliente } from "./lib/cliente";
import Admin from "./pages/Admin";
import Cookie from "./pages/Cookie";
import DoveSiamo from "./pages/DoveSiamo";
import Home from "./pages/Home";
import Installa from "./pages/Installa";
import Prenota from "./pages/Prenota";
import Privacy from "./pages/Privacy";

export default function App() {
  // Il benvenuto compare solo dentro l'app installata e solo la prima volta.
  // Nel browser non si sbarra mai la strada a chi cerca gli orari.
  const [presentato, setPresentato] = useState(() => !inApp() || leggiCliente() !== null);

  // Sotto /admin il sito si presenta come un'app diversa, "Agenda", che si
  // installa per conto suo e si apre sull'agenda. Vedi src/lib/installazione.ts.
  const { pathname } = useLocation();
  useEffect(() => aggiornaTagApp(pathname), [pathname]);

  if (!presentato) return <Benvenuto onFatto={() => setPresentato(true)} />;

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dove-siamo" element={<DoveSiamo />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookie" element={<Cookie />} />
        <Route path="/installa" element={<Installa />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/prenota" element={<Prenota />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
      {/* Nel pannello no. Il banner esiste perché la pagina "Dove siamo" fa
          entrare la mappa di Google: sotto /admin non entra nessuno, non c'è
          niente da chiedere, e a chi ci lavora tutti i giorni resterebbe solo
          una coperta grigia sopra l'agenda da togliere al primo avvio. Se un
          domani il pannello dovesse caricare qualcosa da fuori, questa riga
          va tolta prima di quel giorno. */}
      {!pathname.startsWith('/admin') && <BannerCookie />}
    </>
  );
}
