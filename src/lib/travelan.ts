/** Helper to call the Travelan proxy from client components */
export async function travelanFetch(path: string, options?: RequestInit) {
  const url = `/api/proxy/travelan/${path.replace(/^\//, "")}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}
