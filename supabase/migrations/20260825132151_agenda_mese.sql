-- Calendario mensile pubblico: un solo round-trip per colorare tutto un
-- mese (libero/pieno) invece di 28-31 chiamate a agenda_giorno(). Stessa
-- impostazione di sicurezza: security definer, mai una riga di
-- `prenotazioni`, solo giorno + libero/pieno.

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
