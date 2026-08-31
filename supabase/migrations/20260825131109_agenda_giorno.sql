-- Calendario pubblico (decisione presa dopo schema_iniziale): il pubblico
-- deve vedere anche gli slot OCCUPATI di una giornata, non solo quelli
-- liberi, per scegliere l'orario su un vero calendario invece che su una
-- lista dei soli orari disponibili.
--
-- Stessa impostazione di sicurezza di slot_disponibili(): security definer,
-- restituisce solo istanti e un booleano libero/occupato, mai una riga di
-- `prenotazioni` — nessun nome, nessun telefono. Se libero=true e c'è un
-- solo operatore libero a quell'istante, ne restituisce il nome (comodo da
-- mostrare); se occupato, nessun nome: non si deve capire quale operatore
-- è impegnato con chi.

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
