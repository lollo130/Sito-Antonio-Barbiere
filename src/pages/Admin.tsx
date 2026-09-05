import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AdminLogin from '../components/admin/AdminLogin';
import { auth, db } from '../lib/firebase';
import AggiungiPrenotazione from './admin/AggiungiPrenotazione';
import Oggi from './admin/Oggi';
import Assenze from './admin/impostazioni/Assenze';
import MenuImpostazioni from './admin/impostazioni/MenuImpostazioni';
import Operatori from './admin/impostazioni/Operatori';
import OrariChiusure from './admin/impostazioni/OrariChiusure';
import Servizi from './admin/impostazioni/Servizi';

// SPECIFICA.md § 7: richiede Firebase Auth + riga in `profili`.
export default function Admin() {
  const [utente, setUtente] = useState<User | null | undefined>(undefined);
  const [autorizzato, setAutorizzato] = useState<boolean | null>(null);

  // onAuthStateChanged scatta subito con la sessione ricordata, poi a ogni
  // entrata e uscita. Restituisce la funzione per smettere di ascoltare.
  useEffect(() => onAuthStateChanged(auth, setUtente), []);

  // L'equivalente di is_admin(): esiste una riga in `profili` col mio uid.
  // Le regole lasciano leggere solo il proprio documento, quindi un account
  // senza profilo riceve un errore: vale come "non autorizzato".
  useEffect(() => {
    if (!utente) {
      setAutorizzato(null);
      return;
    }
    let attivo = true;
    getDoc(doc(db, 'profili', utente.uid))
      .then((d) => {
        if (attivo) setAutorizzato(d.exists());
      })
      .catch(() => {
        if (attivo) setAutorizzato(false);
      });
    return () => {
      attivo = false;
    };
  }, [utente]);

  if (utente === undefined || (utente && autorizzato === null)) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md items-center justify-center px-5">
        <p className="text-lg text-grigio">Un attimo…</p>
      </main>
    );
  }

  if (!utente) {
    return <AdminLogin />;
  }

  if (!autorizzato) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
        <h1 className="font-titolo text-3xl font-semibold text-inchiostro">Accesso non autorizzato</h1>
        <p className="text-lg text-grigio">
          Questo account non ha accesso al pannello. Contatta chi gestisce il sito.
        </p>
        <button
          type="button"
          onClick={() => signOut(auth)}
          className="text-lg font-semibold text-grigio underline"
        >
          Esci
        </button>
      </main>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Oggi />} />
      <Route path="/aggiungi" element={<AggiungiPrenotazione />} />
      <Route path="/impostazioni" element={<MenuImpostazioni />} />
      <Route path="/impostazioni/operatori" element={<Operatori />} />
      <Route path="/impostazioni/servizi" element={<Servizi />} />
      <Route path="/impostazioni/orari" element={<OrariChiusure />} />
      <Route path="/impostazioni/assenze" element={<Assenze />} />
    </Routes>
  );
}
