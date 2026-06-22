ALTER TABLE church_members ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));
