import type { Council } from "../types";
import { COUNCIL_ORDER } from "../types";

let cachedCouncils: Council[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

export async function fetchCouncils(): Promise<Council[]> {
  const now = Date.now();
  if (cachedCouncils && now - cacheTime < CACHE_TTL) return cachedCouncils;
  try {
    const res = await fetch("/api/councils");
    if (res.ok) {
      const data = await res.json();
      cachedCouncils = (data.councils || []).sort((a: Council, b: Council) => (COUNCIL_ORDER[a.slug] || 99) - (COUNCIL_ORDER[b.slug] || 99));
      cacheTime = now;
      return cachedCouncils;
    }
  } catch { /* silent */ }
  return [];
}

export function getCouncilLabel(slug: string, councils?: Council[]): string {
  if (councils?.length) {
    const found = councils.find((c) => c.slug === slug);
    if (found) return found.name;
  }
  if (cachedCouncils?.length) {
    const found = cachedCouncils.find((c) => c.slug === slug);
    if (found) return found.name;
  }
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function clearCouncilCache(): void {
  cachedCouncils = null;
  cacheTime = 0;
}
