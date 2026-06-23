-- Migration v11: Make password_hash nullable (passwords now managed by Supabase Auth)
ALTER TABLE admin_users ALTER COLUMN password_hash DROP NOT NULL;
