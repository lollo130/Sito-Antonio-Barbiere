-- =====================================================================
-- SALONE — SCHEMA SUPABASE (PostgreSQL)
-- Fuso orario di riferimento: Europe/Rome. Tutti i timestamp sono timestamptz.
-- Eseguire come singola migration.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- 1. OPERATORI
-- ---------------------------------------------------------------------
create table operatori (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  colore        text not null default '#888888',   -- per il calendario admin
  ordine        int  not null default 0,           -- ordine di visualizzazione
  attivo        boolean not null default true,     -- MAI cancellare: disattivare
  creato_il     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. SERVIZI
-- ---------------------------------------------------------------------
create table servizi (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  descrizione     text,
  durata_minuti   int  not null check (durata_minuti > 0 and durata_minuti % 5 = 0),
  prezzo_cent     int  not null check (prezzo_cent >= 0),  -- centesimi, mai float
  categoria       text not null check (categoria in ('uomo','donna','entrambi')),
  ordine          int  not null default 0,
  attivo          boolean not null default true,
  creato_il       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. CHI FA COSA  (il genere NON è un attributo dell'operatore)
-- ---------------------------------------------------------------------
create table operatori_servizi (
  operatore_id uuid not null references operatori(id) on delete cascade,
  servizio_id  uuid not null references servizi(id)   on delete cascade,
  primary key (operatore_id, servizio_id)
);

-- ---------------------------------------------------------------------
-- 4. ORARI SETTIMANALI PER OPERATORE
--    giorno: 0 = domenica ... 6 = sabato
--    Più righe per lo stesso giorno = spezzato mattina/pomeriggio.
-- ---------------------------------------------------------------------
create table orari_operatore (
  id           uuid primary key default gen_random_uuid(),
  operatore_id uuid not null references operatori(id) on delete cascade,
  giorno       int  not null check (giorno between 0 and 6),
  ora_inizio   time not null,
  ora_fine     time not null,
  check (ora_fine > ora_inizio)
);
create index on orari_operatore (operatore_id, giorno);

-- ---------------------------------------------------------------------
-- 5. ASSENZE (ferie, permessi, malattia) — per singolo operatore
-- ---------------------------------------------------------------------
create table assenze (
  id           uuid primary key default gen_random_uuid(),
  operatore_id uuid not null references operatori(id) on delete cascade,
  inizio       timestamptz not null,
  fine         timestamptz not null,
  motivo       text,
  check (fine > inizio)
);
create index on assenze (operatore_id, inizio, fine);

-- ---------------------------------------------------------------------
-- 5bis. ORARI DEL SALONE (informativi — vedi § 9bis per l'RLS)
--       La disponibilità delle prenotazioni dipende SOLO da
--       orari_operatore. Questa tabella serve al pannello impostazioni
--       e alla pagina pubblica "Dove siamo".
-- ---------------------------------------------------------------------
create table orari_salone (
  id         uuid primary key default gen_random_uuid(),
  giorno     int  not null check (giorno between 0 and 6),
  ora_inizio time not null,
  ora_fine   time not null,
  check (ora_fine > ora_inizio)
);
create index on orari_salone (giorno);

-- ---------------------------------------------------------------------
-- 6. CHIUSURE DEL SALONE (festivi, ferie collettive) — valgono per tutti
-- ---------------------------------------------------------------------
create table chiusure_salone (
  id      uuid primary key default gen_random_uuid(),
  inizio  timestamptz not null,
  fine    timestamptz not null,
  motivo  text,
  check (fine > inizio)
);
create index on chiusure_salone (inizio, fine);

-- ---------------------------------------------------------------------
-- 7. PRENOTAZIONI
-- ---------------------------------------------------------------------
create type stato_prenotazione as enum ('confermata','completata','non_presentato','cancellata');

create table prenotazioni (
  id             uuid primary key default gen_random_uuid(),
  operatore_id   uuid not null references operatori(id) on delete restrict,
  servizio_id    uuid not null references servizi(id)   on delete restrict,

  cliente_nome     text not null check (length(trim(cliente_nome)) between 2 and 60),
  cliente_cognome  text,                       -- facoltativo
  cliente_telefono text not null check (cliente_telefono ~ '^[0-9+ ]{8,20}$'),
  cliente_email    text,                       -- facoltativa: se c'è, riceve conferma

  inizio         timestamptz not null,
  fine           timestamptz not null,
  stato          stato_prenotazione not null default 'confermata',
  origine        text not null default 'sito' check (origine in ('sito','manuale')),
  forzata        boolean not null default false,  -- inserita a mano ignorando le sovrapposizioni
  note           text,

  creata_il      timestamptz not null default now(),
  check (fine > inizio)
);

create index on prenotazioni (inizio);
create index on prenotazioni (operatore_id, inizio);
create index on prenotazioni (cliente_telefono);

-- Anti doppia prenotazione (race condition): due prenotazioni non forzate
-- non possono sovrapporsi sullo stesso operatore. Le righe 'forzata' sono
-- fuori dal vincolo, così il titolare può infilare a mano un cliente.
alter table prenotazioni
  add constraint no_overlap
  exclude using gist (
    operatore_id with =,
    tstzrange(inizio, fine, '[)') with &&
  )
  where (stato in ('confermata','completata') and not forzata);

-- ---------------------------------------------------------------------
-- 8. PROFILI ADMIN (chi può entrare nel pannello)
-- ---------------------------------------------------------------------
create table profili (
  id    uuid primary key references auth.users(id) on delete cascade,
  ruolo text not null default 'admin' check (ruolo in ('admin'))
);

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profili where id = auth.uid());
$$;

-- =====================================================================
-- 9. RLS — attiva su TUTTO. Il pubblico non legge mai le prenotazioni.
-- =====================================================================
alter table operatori         enable row level security;
alter table servizi           enable row level security;
alter table operatori_servizi enable row level security;
alter table orari_operatore   enable row level security;
alter table orari_salone      enable row level security;
alter table assenze           enable row level security;
alter table chiusure_salone   enable row level security;
alter table prenotazioni      enable row level security;
alter table profili           enable row level security;

-- Catalogo pubblico: chiunque legge solo le righe attive
create policy pub_operatori on operatori for select to anon, authenticated
  using (attivo);
create policy pub_servizi on servizi for select to anon, authenticated
  using (attivo);
create policy pub_op_serv on operatori_servizi for select to anon, authenticated
  using (true);
-- Orari salone: informativi, nessun dato cliente. Pubblici a differenza
-- di orari_operatore (che restano privati, non servono al pubblico).
create policy pub_orari_salone on orari_salone for select to anon, authenticated
  using (true);

-- Orari operatore, assenze, chiusure, prenotazioni: NESSUN accesso
-- pubblico. La disponibilità passa solo dalla funzione slot_disponibili()
-- qui sotto.

-- Admin: pieno controllo su tutto
create policy admin_all_operatori    on operatori         for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_servizi      on servizi           for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_op_serv      on operatori_servizi for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_orari        on orari_operatore   for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_orari_salone on orari_salone      for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_assenze      on assenze           for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_chiusure     on chiusure_salone   for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_all_prenotazioni on prenotazioni      for all to authenticated using (is_admin()) with check (is_admin());
create policy self_profilo           on profili           for select to authenticated using (id = auth.uid());

-- =====================================================================
-- 10. DISPONIBILITÀ — security definer: restituisce SOLO orari liberi,
--     mai i dati dei clienti. È l'unico modo in cui il sito pubblico
--     "vede" le prenotazioni esistenti.
-- =====================================================================
create or replace function slot_disponibili(
  p_servizio_id  uuid,
  p_data         date,
  p_operatore_id uuid default null   -- null = nessuna preferenza
)
returns table (inizio timestamptz, operatore_id uuid, operatore_nome text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_durata int;
  v_passo  interval := interval '15 minutes';
begin
  select durata_minuti into v_durata from servizi where id = p_servizio_id and attivo;
  if v_durata is null then return; end if;

  return query
  with candidati as (
    select o.id as op_id, o.nome as op_nome,
           generate_series(
             (p_data + oo.ora_inizio) at time zone 'Europe/Rome',
             (p_data + oo.ora_fine)   at time zone 'Europe/Rome' - make_interval(mins => v_durata),
             v_passo
           ) as ts
    from operatori o
    join operatori_servizi os on os.operatore_id = o.id and os.servizio_id = p_servizio_id
    join orari_operatore oo   on oo.operatore_id = o.id
                             and oo.giorno = extract(dow from p_data)::int
    where o.attivo
      and (p_operatore_id is null or o.id = p_operatore_id)
  )
  select c.ts, c.op_id, c.op_nome
  from candidati c
  where c.ts > now() + interval '30 minutes'          -- niente prenotazioni all'ultimo minuto
    and not exists (
      select 1 from prenotazioni p
      where p.operatore_id = c.op_id
        and p.stato in ('confermata','completata')
        and tstzrange(p.inizio, p.fine, '[)')
            && tstzrange(c.ts, c.ts + make_interval(mins => v_durata), '[)')
    )
    and not exists (
      select 1 from assenze a
      where a.operatore_id = c.op_id
        and tstzrange(a.inizio, a.fine, '[)')
            && tstzrange(c.ts, c.ts + make_interval(mins => v_durata), '[)')
    )
    and not exists (
      select 1 from chiusure_salone ch
      where tstzrange(ch.inizio, ch.fine, '[)')
            && tstzrange(c.ts, c.ts + make_interval(mins => v_durata), '[)')
    )
  order by c.ts, c.op_id;
end;
$$;

revoke all on function slot_disponibili(uuid, date, uuid) from public;
grant execute on function slot_disponibili(uuid, date, uuid) to anon, authenticated;

-- =====================================================================
-- 10bis. AGENDA GIORNO — come slot_disponibili(), ma restituisce anche
--        gli istanti OCCUPATI (senza dire chi): il pubblico li vede su
--        un calendario vero, non solo i liberi. Stessa sicurezza: mai
--        una riga di prenotazioni, solo istante + libero/occupato.
-- =====================================================================
create or replace function agenda_giorno(
  p_servizio_id  uuid,
  p_data         date
)
returns table (inizio timestamptz, libero boolean, operatore_nome text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_durata int;
  v_passo  interval := interval '15 minutes';
begin
  select durata_minuti into v_durata from servizi where id = p_servizio_id and attivo;
  if v_durata is null then return; end if;

  return query
  with candidati as (
    select o.id as op_id, o.nome as op_nome, gs.ts
    from operatori o
    join operatori_servizi os on os.operatore_id = o.id and os.servizio_id = p_servizio_id
    join orari_operatore oo   on oo.operatore_id = o.id
                             and oo.giorno = extract(dow from p_data)::int
    cross join lateral generate_series(
      (p_data + oo.ora_inizio) at time zone 'Europe/Rome',
      (p_data + oo.ora_fine)   at time zone 'Europe/Rome' - make_interval(mins => v_durata),
      v_passo
    ) as gs(ts)
    where o.attivo
      and gs.ts > now() + interval '30 minutes'
  ),
  valutati as (
    select
      c.ts,
      c.op_nome,
      not exists (
        select 1 from prenotazioni p
        where p.operatore_id = c.op_id
          and p.stato in ('confermata', 'completata')
          and tstzrange(p.inizio, p.fine, '[)') && tstzrange(c.ts, c.ts + make_interval(mins => v_durata), '[)')
      )
      and not exists (
        select 1 from assenze a
        where a.operatore_id = c.op_id
          and tstzrange(a.inizio, a.fine, '[)') && tstzrange(c.ts, c.ts + make_interval(mins => v_durata), '[)')
      )
      and not exists (
        select 1 from chiusure_salone ch
        where tstzrange(ch.inizio, ch.fine, '[)') && tstzrange(c.ts, c.ts + make_interval(mins => v_durata), '[)')
      ) as e_libero
    from candidati c
  )
  select
    ts as inizio,
    bool_or(e_libero) as libero,
    case when count(*) filter (where e_libero) = 1
         then min(op_nome) filter (where e_libero)
         else null
    end as operatore_nome
  from valutati
  group by ts
  order by ts;
end;
$$;

revoke all on function agenda_giorno(uuid, date) from public;
grant execute on function agenda_giorno(uuid, date) to anon, authenticated;

-- =====================================================================
-- 10ter. AGENDA MESE — colora un mese intero (libero/pieno) in una sola
--        chiamata, per il calendario mensile pubblico. Stessa sicurezza
--        di agenda_giorno(): mai una riga di prenotazioni.
-- =====================================================================
create or replace function agenda_mese(
  p_servizio_id uuid,
  p_anno        int,
  p_mese        int
)
returns table (giorno date, libero boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_durata int;
  v_passo  interval := interval '15 minutes';
  v_primo  date := make_date(p_anno, p_mese, 1);
  v_ultimo date := (v_primo + interval '1 month' - interval '1 day')::date;
begin
  select durata_minuti into v_durata from servizi where id = p_servizio_id and attivo;
  if v_durata is null then return; end if;

  return query
  with giorni as (
    select gs::date as giorno
    from generate_series(v_primo, v_ultimo, interval '1 day') as gs
  ),
  candidati as (
    select g.giorno, o.id as op_id, gs2.ts
    from giorni g
    join orari_operatore oo on oo.giorno = extract(dow from g.giorno)::int
    join operatori o         on o.id = oo.operatore_id and o.attivo
    join operatori_servizi os on os.operatore_id = o.id and os.servizio_id = p_servizio_id
    cross join lateral generate_series(
      (g.giorno + oo.ora_inizio) at time zone 'Europe/Rome',
      (g.giorno + oo.ora_fine)   at time zone 'Europe/Rome' - make_interval(mins => v_durata),
      v_passo
    ) as gs2(ts)
    where gs2.ts > now() + interval '30 minutes'
  ),
  valutati as (
    select
      c.giorno,
      not exists (
        select 1 from prenotazioni p
        where p.operatore_id = c.op_id
          and p.stato in ('confermata', 'completata')
          and tstzrange(p.inizio, p.fine, '[)') && tstzrange(c.ts, c.ts + make_interval(mins => v_durata), '[)')
      )
      and not exists (
        select 1 from assenze a
        where a.operatore_id = c.op_id
          and tstzrange(a.inizio, a.fine, '[)') && tstzrange(c.ts, c.ts + make_interval(mins => v_durata), '[)')
      )
      and not exists (
        select 1 from chiusure_salone ch
        where tstzrange(ch.inizio, ch.fine, '[)') && tstzrange(c.ts, c.ts + make_interval(mins => v_durata), '[)')
      ) as e_libero
    from candidati c
  )
  select g.giorno, coalesce(bool_or(v.e_libero), false) as libero
  from giorni g
  left join valutati v on v.giorno = g.giorno
  group by g.giorno
  order by g.giorno;
end;
$$;

revoke all on function agenda_mese(uuid, int, int) from public;
grant execute on function agenda_mese(uuid, int, int) to anon, authenticated;

-- =====================================================================
-- 11. DATI INIZIALI (da correggere con listino e orari reali)
-- =====================================================================
insert into operatori (nome, colore, ordine) values
  ('Operatore 1', '#2563eb', 1),
  ('Operatore 2', '#16a34a', 2),
  ('Operatrice 1', '#db2777', 3);

insert into servizi (nome, durata_minuti, prezzo_cent, categoria, ordine) values
  ('Taglio uomo',        30, 1500, 'uomo',  1),
  ('Taglio + barba',     45, 2500, 'uomo',  2),
  ('Barba',              15,  800, 'uomo',  3),
  ('Taglio donna',       60, 3000, 'donna', 4),
  ('Piega',              45, 2000, 'donna', 5);
