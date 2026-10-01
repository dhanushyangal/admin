"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  deleteWaterKey,
  fetchWaterKeys,
  saveWaterKey,
  type ConnectorPublic,
  type WaterKeyMeta,
  type WaterProvider,
} from "@/lib/api";

export default function WaterPage() {
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<WaterKeyMeta[]>([]);
  const [connectors, setConnectors] = useState<ConnectorPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = useCallback(async () => {
    return (await getToken()) ?? null;
  }, [getToken]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchWaterKeys(token);
      setKeys(data.keys);
      setConnectors(data.connectors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Water LLMs</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Water model keys</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform API keys for Code Sculpt and Water text/code LLMs (Anthropic, OpenAI, Google, OpenRouter, Cursor).
            Used when a member has not added their own personal BYOK key.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading Water model keys…</p>
      ) : (
        <div className="space-y-3">
          {connectors.map((p) => (
            <ProviderCard
              key={p.id}
              connector={p}
              meta={keys.find((k) => (k.provider === "gemini" ? "google" : k.provider) === p.id)}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  connector,
  meta,
  onChanged,
}: {
  connector: ConnectorPublic;
  meta?: WaterKeyMeta;
  onChanged: () => Promise<void>;
}) {
  const { getToken } = useAuth();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);
  const provider = connector.id as WaterProvider;

  const save = async () => {
    if (!value.trim()) {
      return;
    }
    setBusy(true);
    try {
      await saveWaterKey(provider, value.trim(), token);
      setValue("");
      toast.success(`${connector.name} key saved and tested`);
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
      await deleteWaterKey(provider, token);
      toast.success(`${connector.name} key removed from database`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  const statusVariant =
    meta?.configured && meta.status === "valid"
      ? "default"
      : meta?.status === "invalid"
        ? "destructive"
        : "secondary";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">{connector.name}</CardTitle>
            <Badge variant={statusVariant}>
              {meta?.status === "valid" ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Valid
                </span>
              ) : meta?.status === "invalid" ? (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Invalid
                </span>
              ) : meta?.configured ? (
                "Unchecked"
              ) : (
                "Not set"
              )}
            </Badge>
            {meta?.source === "env" ? (
              <Badge variant="outline" className="text-xs">
                Configured via .env
              </Badge>
            ) : null}
          </div>
          {connector.product ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{connector.product}</p>
          ) : null}
        </div>
        <a
          href={connector.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`${connector.name} docs`}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={provider} className="sr-only">
            API key
          </Label>
          <Input
            id={provider}
            type="password"
            autoComplete="off"
            value={value}
            placeholder={meta?.configured ? `••••••••${meta.last4 || ""}` : connector.keyPlaceholder}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void save()} disabled={busy || !value.trim()}>
            Save
          </Button>
          {meta?.configured ? (
            <Button size="sm" variant="outline" onClick={() => void remove()} disabled={busy}>
              Remove
            </Button>
          ) : null}
        </div>
        {meta?.lastError && meta.status === "invalid" ? (
          <p className="text-xs text-destructive">{meta.lastError}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
