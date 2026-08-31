-- Dati segnaposto: chi fa cosa + orari settimanali. Senza questi due, il
-- flusso pubblico non ha nulla da mostrare (slot_disponibili() è sempre
-- vuota). Da correggere con i dati reali del cliente (SPECIFICA.md § 11).

insert into operatori_servizi (operatore_id, servizio_id)
select o.id, s.id
from operatori o, servizi s
where (o.nome in ('Operatore 1', 'Operatore 2') and s.categoria = 'uomo')
   or (o.nome = 'Operatrice 1' and s.categoria = 'donna');

-- Lun-Sab 09:00-13:00 e 15:00-19:00, domenica chiuso (nessuna riga = chiuso).
insert into orari_operatore (operatore_id, giorno, ora_inizio, ora_fine)
select o.id, giorno, ora_inizio, ora_fine
from operatori o
cross join (
  values
    (1, time '09:00', time '13:00'), (1, time '15:00', time '19:00'),
    (2, time '09:00', time '13:00'), (2, time '15:00', time '19:00'),
    (3, time '09:00', time '13:00'), (3, time '15:00', time '19:00'),
    (4, time '09:00', time '13:00'), (4, time '15:00', time '19:00'),
    (5, time '09:00', time '13:00'), (5, time '15:00', time '19:00'),
    (6, time '09:00', time '13:00'), (6, time '15:00', time '19:00')
) as t(giorno, ora_inizio, ora_fine);
