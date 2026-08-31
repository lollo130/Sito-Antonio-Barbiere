import { useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

const classeCampo =
  'min-h-[56px] w-full rounded-xl border-2 border-stone-300 px-4 text-lg text-stone-900 focus:border-stone-900 focus:outline-none';
const classeEtichetta = 'block text-lg font-semibold text-stone-900';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);

  async function accedi(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    setInviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setInviando(false);
    if (error) setErrore('Email o password non corretti.');
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-5 py-8">
      <h1 className="font-titolo text-3xl font-semibold text-stone-900">Accedi al pannello</h1>
      <form className="flex flex-col gap-5" onSubmit={accedi}>
        <div className="flex flex-col gap-2">
          <label className={classeEtichetta} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            className={classeCampo}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className={classeEtichetta} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={classeCampo}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {errore && <p className="text-lg font-medium text-red-700">{errore}</p>}
        <button
          type="submit"
          disabled={inviando}
          className="flex min-h-[56px] w-full items-center justify-center rounded-xl bg-stone-900 px-6 text-lg font-semibold text-white disabled:opacity-60"
        >
          {inviando ? 'Accesso…' : 'Accedi'}
        </button>
      </form>
    </main>
  );
}
