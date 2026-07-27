/**
 * Fetch helper for the Travelan external API.
 *
 * The backend wraps every response in { success: true, data: {...} }.
 * This helper auto-unwraps that envelope so pages receive the inner data
 * directly, and auto-prepends api/external/ so callers use short paths:
 *   travelanFetch("agencies") → /api/proxy/travelan/api/external/agencies
 *                             → returns data.items / data.pagination / etc.
 */
export async function travelanFetch(path: string, options?: RequestInit) {
  const normalizedPath = path.replace(/^\//, "");
  const apiPath = normalizedPath.startsWith("api/external/")
    ? normalizedPath
    : `api/external/${normalizedPath}`;
  const url = `/api/proxy/travelan/${apiPath}`;
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({ success: false, error: "Invalid JSON" }));

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error ?? `Request failed with status ${res.status}`);
  }
  // Unwrap { success: true, data: {...} } envelope
  return json?.data ?? json;
}

/**
 * Extract a list array from the unwrapped data object.
 * After travelanFetch unwraps the envelope, list endpoints return:
 *   { items: [...], pagination: {...} }
 * This helper handles that and other common shapes as fallback.
 */
export function extractList<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (!response || typeof response !== "object") return [];
  const obj = response as Record<string, unknown>;
  for (const key of ["items", "data", "result", "results", "records", "list"]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) return val as T[];
  }
  return [];
}

/** Extract pagination from { items:[...], pagination:{total,page,limit,totalPages} } */
export function extractPagination(response: unknown): { total: number; page: number; totalPages: number } {
  const defaults = { total: 0, page: 1, totalPages: 1 };
  if (!response || typeof response !== "object") return defaults;
  const obj = response as Record<string, unknown>;
  const meta = (obj.pagination ?? obj.meta ?? {}) as Record<string, unknown>;
  return {
    total: Number(meta.total ?? meta.count ?? obj.total ?? 0),
    page: Number(meta.page ?? meta.currentPage ?? 1),
    totalPages: Number(meta.totalPages ?? meta.pages ?? meta.lastPage ?? obj.totalPages ?? 1),
  };
}
