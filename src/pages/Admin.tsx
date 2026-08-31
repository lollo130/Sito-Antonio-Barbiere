import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import AdminLogin from '../components/admin/AdminLogin';
import { supabase } from '../lib/supabase';
import Oggi from './admin/Oggi';
import Assenze from './admin/impostazioni/Assenze';
import MenuImpostazioni from './admin/impostazioni/MenuImpostazioni';
import Operatori from './admin/impostazioni/Operatori';
import OrariChiusure from './admin/impostazioni/OrariChiusure';
import Servizi from './admin/impostazioni/Servizi';

// SPECIFICA.md § 7: richiede Supabase Auth + riga in `profili`.
export default function Admin() {
  const [sessione, setSessione] = useState<Session | null | undefined>(undefined);
  const [autorizzato, setAutorizzato] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessione(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, s) => setSessione(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessione) {
      setAutorizzato(null);
      return;
    }
    let attivo = true;
    supabase
      .from('profili')
      .select('id')
      .eq('id', sessione.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (attivo) setAutorizzato(!!data);
      });
    return () => {
      attivo = false;
    };
  }, [sessione]);

  if (sessione === undefined || (sessione && autorizzato === null)) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md items-center justify-center px-5">
        <p className="text-lg text-grigio">Un attimo…</p>
      </main>
    );
  }

  if (!sessione) {
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
          onClick={() => supabase.auth.signOut()}
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
      <Route path="/impostazioni" element={<MenuImpostazioni />} />
      <Route path="/impostazioni/operatori" element={<Operatori />} />
      <Route path="/impostazioni/servizi" element={<Servizi />} />
      <Route path="/impostazioni/orari" element={<OrariChiusure />} />
      <Route path="/impostazioni/assenze" element={<Assenze />} />
    </Routes>
  );
}
