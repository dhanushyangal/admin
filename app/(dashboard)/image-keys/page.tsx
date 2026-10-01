"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Check, CheckCircle2, ExternalLink, RefreshCw, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteImageKey,
  fetchImageKeys,
  saveImageKey,
  verifyImageKey,
  type ImageKeyMeta,
  type ImageProvider,
} from "@/lib/image-keys-api";

export default function ImageKeysPage() {
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<ImageKeyMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchImageKeys(token);
      setKeys(data.keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image generation keys");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">3D Pipeline</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Image generation keys</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keys used specifically for 3D source images, prompt optimization, and image editing (OpenAI & Gemini).
            Distinct from Water model keys.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading image generation keys…</p>
      ) : (
        <div className="space-y-4">
          {keys.map((meta) => (
            <ImageProviderCard key={meta.provider} meta={meta} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function ImageProviderCard({
  meta,
  onChanged,
}: {
  meta: ImageKeyMeta;
  onChanged: () => Promise<void>;
}) {
  const { getToken } = useAuth();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);
  const provider = meta.provider as ImageProvider;

  const save = async () => {
    if (!value.trim()) {
      return;
    }
    setBusy(true);
    try {
      await saveImageKey(provider, value.trim(), token);
      setValue("");
      toast.success(`${meta.name} key saved and verified`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteImageKey(provider, token);
      toast.success(`${meta.name} key removed from database`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const res = await verifyImageKey(provider, token);
      if (res.ok) {
        toast.success(`${meta.name} key is valid and working!`);
      } else {
        toast.error(res.error || `${meta.name} verification failed`);
      }
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const statusVariant = meta.status === "valid" ? "default" : meta.status === "invalid" ? "destructive" : "secondary";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">{meta.name}</CardTitle>
            <Badge variant={statusVariant}>
              {meta.status === "valid" ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Valid
                </span>
              ) : meta.status === "invalid" ? (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Invalid
                </span>
              ) : meta.configured ? (
                "Unchecked"
              ) : (
                "Not set"
              )}
            </Badge>
            {meta.source === "env" ? (
              <Badge variant="outline" className="text-xs">
                Configured via .env
              </Badge>
            ) : null}
          </div>
          <CardDescription className="text-xs">{meta.modelsDescription}</CardDescription>
        </div>
        <a
          href={meta.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`${meta.name} documentation`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </CardHeader>
      <CardContent className="space-y-4">
        {meta.configured ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-2.5 text-xs">
            <div className="space-y-0.5">
              <span className="text-muted-foreground">Configured: </span>
              <span className="font-mono font-medium">••••••••••••••••••••{meta.last4 ?? ""}</span>
              {meta.verifiedAt ? (
                <p className="text-[11px] text-muted-foreground">
                  Verified: {new Date(meta.verifiedAt).toLocaleString()}
                </p>
              ) : null}
              {meta.lastError ? <p className="text-[11px] text-destructive">{meta.lastError}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void verify()} disabled={busy}>
                <Check className="h-3.5 w-3.5" />
                Test key
              </Button>
              {meta.source === "database" ? (
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => void remove()} disabled={busy}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={`key-${meta.provider}`} className="text-xs">
            {meta.configured ? "Replace key in database" : "Set API key in database"}
          </Label>
          <div className="flex gap-2">
            <Input
              id={`key-${meta.provider}`}
              type="password"
              placeholder={meta.keyPlaceholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={busy}
              className="font-mono text-sm"
            />
            <Button size="sm" onClick={() => void save()} disabled={busy || !value.trim()}>
              Save & Test
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Keys are AES-256 encrypted at rest. You can also specify <code>{meta.provider === "openai" ? "IMAGE_OPENAI_API_KEY" : "IMAGE_GEMINI_API_KEY"}</code> in the backend <code>.env</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
