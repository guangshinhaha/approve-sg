import { getSessionToken } from "./session";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "";

/**
 * Server-side API client that forwards the session JWT.
 * Used by Server Components to call the API routes.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const token = getSessionToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Client-side fetch helper. Cookie is auto-sent by browser.
 */
export async function clientFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}
