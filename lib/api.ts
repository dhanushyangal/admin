export type WaterProvider = "anthropic" | "openai" | "google" | "gemini" | "openrouter" | "cursor";

export type ConnectorPublic = {
  id: "anthropic" | "openai" | "google" | "openrouter" | "cursor";
  name: string;
  product: string;
  docsUrl: string;
  keyPlaceholder: string;
};

export type WaterKeyMeta = {
  provider: WaterProvider;
  label?: string;
  configured: boolean;
  last4: string | null;
  status: "unchecked" | "valid" | "invalid";
  lastError: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
};

function backendBase(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL!.replace(/\/+$/, "");
}

async function authHeaders(getToken: () => Promise<string | null>): Promise<HeadersInit> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error || fallback;
}

function unreachableMessage(): string {
  return `Cannot reach backend at ${backendBase()}. Is the API running?`;
}

export async function fetchOverview(getToken: () => Promise<string | null>): Promise<{
  userCount: number;
  keys: WaterKeyMeta[];
  connectors: ConnectorPublic[];
}> {
  let res: Response;
  try {
    res = await fetch(`${backendBase()}/api/admin/overview`, {
      headers: await authHeaders(getToken),
      cache: "no-store",
    });
  } catch {
    throw new Error(unreachableMessage());
  }
  if (!res.ok) throw new Error(await readError(res, "Failed to load overview"));
  const body = (await res.json()) as {
    userCount: number;
    keys: WaterKeyMeta[];
    connectors?: ConnectorPublic[];
  };
  return {
    userCount: body.userCount,
    keys: body.keys,
    connectors: body.connectors ?? [],
  };
}

export async function fetchWaterKeys(getToken: () => Promise<string | null>): Promise<{
  keys: WaterKeyMeta[];
  connectors: ConnectorPublic[];
}> {
  let res: Response;
  try {
    res = await fetch(`${backendBase()}/api/admin/api-keys`, {
      headers: await authHeaders(getToken),
      cache: "no-store",
    });
  } catch {
    throw new Error(unreachableMessage());
  }
  if (!res.ok) throw new Error(await readError(res, "Failed to load Water API keys"));
  const body = (await res.json()) as { keys: WaterKeyMeta[]; connectors?: ConnectorPublic[] };
  return { keys: body.keys, connectors: body.connectors ?? [] };
}

export async function saveWaterKey(
  provider: WaterProvider,
  apiKey: string,
  getToken: () => Promise<string | null>
): Promise<WaterKeyMeta> {
  const id = provider === "gemini" ? "google" : provider;
  const res = await fetch(`${backendBase()}/api/admin/api-keys/${id}`, {
    method: "PUT",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ apiKey }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Failed to save API key");
  return (body as { key: WaterKeyMeta }).key;
}

export async function deleteWaterKey(
  provider: WaterProvider,
  getToken: () => Promise<string | null>
): Promise<void> {
  const id = provider === "gemini" ? "google" : provider;
  const res = await fetch(`${backendBase()}/api/admin/api-keys/${id}`, {
    method: "DELETE",
    headers: await authHeaders(getToken),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to remove API key"));
}
