-- Segnaposto coerente con gli orari già usati per i tre operatori
-- (schema.sql § 11): da correggere con gli orari reali del salone.
insert into orari_salone (giorno, ora_inizio, ora_fine)
values
  (1, '09:00', '13:00'), (1, '15:00', '19:00'),
  (2, '09:00', '13:00'), (2, '15:00', '19:00'),
  (3, '09:00', '13:00'), (3, '15:00', '19:00'),
  (4, '09:00', '13:00'), (4, '15:00', '19:00'),
  (5, '09:00', '13:00'), (5, '15:00', '19:00'),
  (6, '09:00', '13:00'), (6, '15:00', '19:00');
