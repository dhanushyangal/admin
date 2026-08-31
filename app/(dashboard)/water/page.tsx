"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  deleteWaterKey,
  fetchWaterKeys,
  saveWaterKey,
  type WaterKeyMeta,
  type WaterProvider,
} from "@/lib/api";

const PROVIDERS: { id: WaterProvider; placeholder: string }[] = [
  { id: "anthropic", placeholder: "sk-ant-..." },
  { id: "openai", placeholder: "sk-..." },
  { id: "gemini", placeholder: "AIza..." },
  { id: "openrouter", placeholder: "sk-or-v1-..." },
  { id: "cursor", placeholder: "crsr_..." },
];

export default function WaterPage() {
  const { getToken } = useAuth();
  const [keys, setKeys] = useState<WaterKeyMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setError(null);
    try {
      const list = await fetchWaterKeys(async () => (await getToken()) ?? null);
      setKeys(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Water</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Water API</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Keys saved here are used by every Studio user when they pick a Water model.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p.id}
              placeholder={p.placeholder}
              meta={keys.find((k) => k.provider === p.id)}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  placeholder,
  meta,
  onChanged,
}: {
  provider: WaterProvider;
  placeholder: string;
  meta?: WaterKeyMeta;
  onChanged: () => Promise<void>;
}) {
  const { getToken } = useAuth();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const token = async () => (await getToken()) ?? null;

  const save = async () => {
    setBusy(true);
    try {
      await saveWaterKey(provider, value, token);
      setValue("");
      toast.success("Saved");
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
      toast.success("Removed");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">
          {meta?.label || provider}
        </CardTitle>
        <Badge variant={meta?.configured && meta.status === "valid" ? "default" : "secondary"}>
          {!meta?.configured ? "Not set" : meta.status}
        </Badge>
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
            placeholder={meta?.configured ? `••••••••${meta.last4 || ""}` : placeholder}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void save()} disabled={busy || !value.trim()}>
            Save
          </Button>
          {meta?.configured && (
            <Button size="sm" variant="outline" onClick={() => void remove()} disabled={busy}>
              Remove
            </Button>
          )}
        </div>
        {meta?.lastError && meta.status === "invalid" && (
          <p className="text-xs text-destructive">{meta.lastError}</p>
        )}
      </CardContent>
    </Card>
  );
}
