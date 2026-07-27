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
