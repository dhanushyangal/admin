export const CLERK_JS_VERSION = process.env.NEXT_PUBLIC_CLERK_JS_VERSION || "5.127.1";

export function clerkPreconnectHost(): string | undefined {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key?.startsWith("pk_test_") && !key?.startsWith("pk_live_")) return;
  try {
    const encoded = key.replace(/^pk_(test|live)_/, "");
    const domain = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
    if (domain.includes("clerk")) return `https://${domain}`;
  } catch {
    return;
  }
}
