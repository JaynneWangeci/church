let _secret: string | null = null;
let _listeners: Array<(authed: boolean) => void> = [];

export function isActionAuthed(): boolean {
  return _secret !== null;
}

export function getActionSecret(): string | null {
  return _secret;
}

export function setActionSecret(secret: string | null) {
  _secret = secret;
  _listeners.forEach(fn => fn(secret !== null));
}

export function subscribeActionAuth(fn: (authed: boolean) => void) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(f => f !== fn); };
}

export async function fetchWithSecret(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (_secret) headers.set("x-action-secret", _secret);
  return fetch(input, { ...init, headers });
}
