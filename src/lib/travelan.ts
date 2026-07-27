/** Helper to call the Travelan proxy from client components.
 *  Automatically prepends api/external/ so callers use short paths:
 *  travelanFetch("agencies") → /api/proxy/travelan/api/external/agencies
 */
export async function travelanFetch(path: string, options?: RequestInit) {
  const normalizedPath = path.replace(/^\//, "");
  const apiPath = normalizedPath.startsWith("api/external/")
    ? normalizedPath
    : `api/external/${normalizedPath}`;
  const url = `/api/proxy/travelan/${apiPath}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Extract a list from any common API response shape:
 *   - Direct array:            [...]
 *   - { data: [...], ... }     ← most common
 *   - { data: { items:[...] }} ← nested wrapper
 *   - { items/results/...: [] }
 *   - First array found at top level
 */
export function extractList<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (!response || typeof response !== "object") return [];

  const obj = response as Record<string, unknown>;

  if (obj.data !== undefined) {
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (typeof obj.data === "object" && obj.data !== null) {
      const inner = obj.data as Record<string, unknown>;
      for (const val of Object.values(inner)) {
        if (Array.isArray(val)) return val as T[];
      }
    }
  }

  for (const key of ["items", "result", "results", "records", "list"]) {
    if (Array.isArray(obj[key])) return obj[key] as T[];
  }

  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) return val as T[];
  }

  return [];
}

/** Extract pagination from any common API response shape */
export function extractPagination(response: unknown): { total: number; page: number; totalPages: number } {
  const defaults = { total: 0, page: 1, totalPages: 1 };
  if (!response || typeof response !== "object") return defaults;

  const obj = response as Record<string, unknown>;

  // If data is a nested object, pagination may live there
  const src: Record<string, unknown> =
    obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
      ? (obj.data as Record<string, unknown>)
      : obj;

  const meta = (src.meta ?? src.pagination ?? {}) as Record<string, unknown>;

  return {
    total: Number(
      meta.total ?? meta.count ?? meta.totalCount ??
      obj.total ?? src.total ?? 0
    ),
    page: Number(meta.page ?? meta.currentPage ?? obj.page ?? 1),
    totalPages: Number(
      meta.totalPages ?? meta.pages ?? meta.lastPage ??
      obj.totalPages ?? src.totalPages ?? 1
    ),
  };
}
