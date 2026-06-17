insert into committee_members (name, role, council, "order") values
  ('Dadson Mbogo', 'Parish Board Chairman', 'parish_board', 1),
  ('Jeremiah Kimani', 'Vice Chairman', 'parish_board', 2),
  ('Kariuki Nderitu', 'General Secretary', 'parish_board', 3),
  ('Joseph Kamande', 'Vice General Secretary', 'parish_board', 4),
  ('Johnson Kamau', 'Treasurer', 'parish_board', 5),
  ('George Kibia', 'Vice Treasurer', 'parish_board', 6),
  ('Magdalene Wageni', 'Chairlady', 'women_council', 7),
  ('Alice Kuhunya', 'Vice Chairlady', 'women_council', 8),
  ('Tiffany Kimani', 'Women Council Secretary', 'women_council', 9),
  ('Esther Mbugua', 'Women Council Treasurer', 'women_council', 10),
  ('Gilbert Wachira', 'Men Council Chairman', 'men_council', 11),
  ('Sam Ndiang''ui', 'Development Chairman', 'development', 12),
  ('Wilson Thirikwa', 'Development Secretary', 'development', 13),
  ('Maria Goretti Njenga', 'Development Treasurer', 'development', 14);

insert into campaigns (slug, title, description, goal, raised, currency, is_active)
values (
  'development-fund',
  'AIPCA Bahati Cathedral Development Fund',
  'Tujenge pamoja – Building our house of worship together. Support the sanctuary improvements, fellowship hall, ministry growth, and grounds maintenance.',
  5000000,
  842500,
  'KES',
  true
);
