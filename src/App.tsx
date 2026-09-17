import { useState } from "react";
import Calendario from './pages/Calendario';
import { Route, Routes } from "react-router-dom";
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
      <BannerCookie />
    </>
  );
}
