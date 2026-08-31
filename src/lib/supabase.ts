import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Vite sostituisce queste variabili al momento della build, non a runtime:
  // se mancano nell'ambiente che compila, finiscono nel bundle come undefined.
  // In locale arrivano da .env; su Netlify vanno inserite a mano nelle
  // variabili d'ambiente del sito, perché .env non è nel repository.
  throw new Error(
    'Mancano VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. In locale: file .env (vedi .env.example). Su Netlify: Site configuration → Environment variables, poi ricompilare.',
  );
}

export const supabase = createClient(url, anonKey);
