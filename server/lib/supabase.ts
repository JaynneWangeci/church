import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;
let _anonClient: SupabaseClient | null = null;

function ensureClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && anonKey && !_anonClient) {
    _anonClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  if (url && anonKey && !_supabase) {
    _supabase = createClient(url, anonKey);
  }
  if (url && serviceKey && !_serviceClient) {
    _serviceClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
      },
    });
  }
}

export function requireService() {
  ensureClients();
  const svc = _serviceClient || _supabase;
  if (!svc) throw new Error("Supabase not configured");
  return svc;
}

export function requireAnon() {
  ensureClients();
  if (!_anonClient) throw new Error("Supabase not configured");
  return _anonClient;
}

export function requireSupabase() {
  ensureClients();
  if (!_supabase) throw new Error("Supabase not configured");
  return _supabase;
}

export async function verifyAuth(token: string) {
  const supabase = requireAnon();
  const { data, error } = await (supabase.auth as any).getUser(token);
  if (error || !data?.user) return null;
  return data.user as { id: string; email?: string };
}

export async function signIn(email: string, password: string) {
  const supabase = requireAnon();
  const { data, error } = await (supabase.auth as any).signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });
  if (error) return { session: null, error };
  return { session: data.session, error: null };
}

export async function createAuthUser(email: string, password: string, id: string) {
  const svc = requireService();
  const { data, error } = await (svc.auth as any).admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
    id,
  });
  if (error) return { user: null, error };
  return { user: data.user, error: null };
}

export async function updateAuthUserPassword(userId: string, password: string) {
  const svc = requireService();
  const { data, error } = await (svc.auth as any).admin.updateUserById(userId, { password });
  if (error) return { user: null, error };
  return { user: data.user, error: null };
}

export async function deleteAuthUser(userId: string) {
  const svc = requireService();
  const { error } = await (svc.auth as any).admin.deleteUser(userId);
  if (error) return { error };
  return { error: null };
}

function warmConnections() {
  ensureClients();
  Promise.allSettled([
    _serviceClient?.from("donations").select("id").limit(1).then(() => {}),
    _supabase?.from("donations").select("id").limit(1).then(() => {}),
  ]).catch(() => {});
}

warmConnections();
