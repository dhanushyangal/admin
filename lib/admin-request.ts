export type TokenGetter = () => Promise<string | null>;

export function backendBase(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL!.replace(/\/+$/, "");
}

async function authHeaders(getToken: TokenGetter): Promise<HeadersInit> {
  const token = await getToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

export async function adminRequest<T>(
  path: string,
  init: RequestInit,
  getToken: TokenGetter,
  fallback: string
): Promise<T> {
  const res = await fetch(`${backendBase()}${path}`, {
    ...init,
    headers: await authHeaders(getToken),
    cache: "no-store",
  }).catch(() => {
    throw new Error(`Cannot reach backend at ${backendBase()}. Is the API running?`);
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || fallback);
  }
  return body as T;
}
