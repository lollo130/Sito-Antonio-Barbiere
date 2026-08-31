-- SPECIFICA.md § 7.3 tratta "orari salone" come distinto dagli orari dei
-- singoli operatori, ma lo schema non aveva mai avuto una tabella per
-- questo: solo orari_operatore (per operatore) e chiusure_salone
-- (chiusure globali). Aggiunta puramente informativa/di riferimento — la
-- disponibilità delle prenotazioni continua a dipendere SOLO da
-- orari_operatore (slot_disponibili, agenda_giorno, agenda_mese non
-- toccano questa tabella). Serve al pannello impostazioni e, più avanti,
-- alla pagina pubblica "Dove siamo".

create table orari_salone (
  id         uuid primary key default gen_random_uuid(),
  giorno     int  not null check (giorno between 0 and 6),
  ora_inizio time not null,
  ora_fine   time not null,
  check (ora_fine > ora_inizio)
);
create index on orari_salone (giorno);

alter table orari_salone enable row level security;

create policy pub_orari_salone on orari_salone for select to anon, authenticated using (true);
create policy admin_all_orari_salone on orari_salone for all to authenticated using (is_admin()) with check (is_admin());
