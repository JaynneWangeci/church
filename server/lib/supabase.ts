import { createClient } from "@supabase/supabase-js";

let _supabase: ReturnType<typeof createClient> | null = null;
let _serviceClient: ReturnType<typeof createClient> | null = null;
let _warmed = false;

const POOL_URL = process.env.SUPABASE_POOL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

function createPooledClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
    db: {
      schema: "public",
    },
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

function ensureClients() {
  if (_supabase && _serviceClient) return;
  const url = POOL_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && anonKey) _supabase = createPooledClient(url, anonKey);
  if (url && serviceKey) _serviceClient = createPooledClient(url, serviceKey);
}

export function requireService() {
  ensureClients();
  if (!_warmed) {
    _warmed = true;
    _serviceClient?.from("donations").select("id").limit(1).then(() => {}).catch(() => {});
  }
  const svc = _serviceClient || _supabase;
  if (!svc) throw new Error("Supabase not configured");
  return svc;
}

export function warmConnections() {
  ensureClients();
  _warmed = true;
  Promise.allSettled([
    _serviceClient?.from("donations").select("id").limit(1).then(() => {}),
    _supabase?.from("donations").select("id").limit(1).then(() => {}),
  ]).catch(() => {});
}

// Warm on import for instant use
warmConnections();
