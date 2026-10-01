import { adminRequest, type TokenGetter } from "./admin-request";

export type ImageProvider = "openai" | "gemini";

export type ImageKeyMeta = {
  provider: ImageProvider;
  name: string;
  modelsDescription: string;
  docsUrl: string;
  keyPlaceholder: string;
  configured: boolean;
  source: "database" | "env" | "none";
  last4: string | null;
  status: "unchecked" | "valid" | "invalid";
  lastError: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
};

export async function fetchImageKeys(getToken: TokenGetter): Promise<{ keys: ImageKeyMeta[] }> {
  return adminRequest<{ keys: ImageKeyMeta[] }>(
    "/api/admin/image-keys",
    { method: "GET" },
    getToken,
    "Failed to load image generation keys"
  );
}

export async function saveImageKey(
  provider: ImageProvider,
  apiKey: string,
  getToken: TokenGetter
): Promise<ImageKeyMeta> {
  const body = await adminRequest<{ key: ImageKeyMeta }>(
    `/api/admin/image-keys/${provider}`,
    {
      method: "PUT",
      body: JSON.stringify({ apiKey }),
    },
    getToken,
    "Failed to save image API key"
  );
  return body.key;
}

export async function deleteImageKey(provider: ImageProvider, getToken: TokenGetter): Promise<void> {
  await adminRequest<void>(
    `/api/admin/image-keys/${provider}`,
    { method: "DELETE" },
    getToken,
    "Failed to remove image API key"
  );
}

export async function verifyImageKey(
  provider: ImageProvider,
  getToken: TokenGetter
): Promise<{ ok: boolean; status: string; error?: string }> {
  return adminRequest<{ ok: boolean; status: string; error?: string }>(
    `/api/admin/image-keys/${provider}/verify`,
    { method: "POST" },
    getToken,
    "Failed to verify image API key"
  );
}
