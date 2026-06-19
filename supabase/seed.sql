insert into committee_members (name, role, council, "order") values
  ('Dadson Mbogo', 'Parish board chairman', 'parish_board', 1),
  ('Jeremiah Kimani', 'V Chairman', 'parish_board', 2),
  ('Kariuki Nderitu', 'General Secretary', 'parish_board', 3),
  ('Joseph Kamande', 'Vice General Secretary', 'parish_board', 4),
  ('Johnson Kamau', 'Treasurer', 'parish_board', 5),
  ('George Kibia', 'Vice Treasurer', 'parish_board', 6),
  ('Magdalene Wageni', 'Chairlady', 'women_council', 7),
  ('Alice Kuhunya', 'V Chairlady', 'women_council', 8),
  ('Tiffany Kimani', 'Women council Secretary', 'women_council', 9),
  ('Esther Mbugua', 'Women council Treasurer', 'women_council', 10),
  ('Gilbert Wachira', 'Men council chairman', 'men_council', 11),
  ('Sam Ndiang''ui', 'Development chairman', 'development', 12),
  ('Wilson Thirikwa', 'Development Secretary', 'development', 13),
  ('Maria goretti Njenga', 'Development Treasurer', 'development', 14);

insert into campaigns (slug, title, description, goal, raised, currency, is_active)
values (
  'development-fund',
  'AIPCA Bahati Cathedral Development Fund',
  'Tujenge pamoja – Building our house of worship together. Support the sanctuary improvements, fellowship hall, ministry growth, and grounds maintenance.',
  30000000,
  842500,
  'KES',
  true
);

-- First admin is created via /admin/setup using ADMIN_INVITE_CODE.
-- Run the app, go to /admin/setup, and enter the invite code to create the first super_admin.
