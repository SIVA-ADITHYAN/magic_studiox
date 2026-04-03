const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE_URL = RAW_BASE.replace(/\/$/, "");

export async function apiPost<T = any>(path: string, payload: unknown): Promise<T> {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });

  const text = await resp.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (!resp.ok) {
    const msg = data?.error || `Request failed (${resp.status})`;
    throw new Error(msg);
  }

  return data as T;
}
