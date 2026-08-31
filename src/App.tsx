import { Route, Routes } from 'react-router-dom';
import Admin from './pages/Admin';
import DoveSiamo from './pages/DoveSiamo';
import Home from './pages/Home';
import Installa from './pages/Installa';
import Prenota from './pages/Prenota';
import Privacy from './pages/Privacy';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dove-siamo" element={<DoveSiamo />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/installa" element={<Installa />} />
      <Route path="/prenota" element={<Prenota />} />
      <Route path="/admin/*" element={<Admin />} />
    </Routes>
  );
}
