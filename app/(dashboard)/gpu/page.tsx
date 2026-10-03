"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { Power, PowerOff, RefreshCw, RotateCcw, Trash2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  clearGpuQueue,
  fetchGpuStatus,
  restartGpuService,
  runInstanceAction,
  trimMemory,
  type GpuStatus,
  type InstanceAction,
  type RestartMode,
} from "@/lib/gpu-api";

const REFRESH_MS = 10_000;

type PendingConfirm = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  run: () => Promise<void>;
};

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return "—";
  }
  const s = Math.floor(seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${s % 60}s`;
}

function formatGib(mib: number | null | undefined): string {
  return mib === null || mib === undefined ? "—" : `${(mib / 1024).toFixed(1)} GB`;
}

function formatTime(value: string | number | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
  return date.toLocaleString();
}

function UsageBar({ used, total, warnAt = 0.85 }: { used: number | null | undefined; total: number | null | undefined; warnAt?: number }) {
  const ratio = used !== null && used !== undefined && total ? Math.min(1, used / total) : 0;
  const color = ratio >= warnAt ? "bg-destructive" : ratio >= 0.6 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">
        {value}
        {hint ? <span className="ml-1 text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </span>
    </div>
  );
}

function statusVariant(status: string | undefined): "default" | "secondary" | "destructive" | "outline" {
  if (status === "RUNNING" || status === "ok") {
    return "default";
  }
  if (status === "TERMINATED" || status === "error" || status === "unreachable") {
    return "destructive";
  }
  return "secondary";
}

export default function GpuPage() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<GpuStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const token = useCallback(async () => (await getToken()) ?? null, [getToken]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setStatus(await fetchGpuStatus(token));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load GPU status");
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const restart = async (mode: RestartMode) => {
    setBusy(true);
    try {
      const result = await restartGpuService(mode, token);
      toast.success(result.message || "Restart requested");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Restart failed");
    } finally {
      setBusy(false);
    }
  };

  const instanceAction = async (action: InstanceAction) => {
    setBusy(true);
    try {
      await runInstanceAction(action, token);
      toast.success(`Instance ${action} requested. It can take a minute to change state.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Instance ${action} failed`);
    } finally {
      setBusy(false);
    }
  };

  const handleClearQueue = () => {
    setConfirm({
      title: "Clear GPU queue?",
      description:
        "This will cancel all waiting jobs and remove them from the queue so new generation requests can start without delay.",
      confirmLabel: "Clear queue",
      destructive: true,
      run: async () => {
        setBusy(true);
        try {
          const result = await clearGpuQueue(token);
          toast.success(result.message || "Queue cleared");
          await load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to clear queue");
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const vm = status?.vm.data ?? null;
  const instance = status?.instance.data ?? null;
  const gpu = vm?.gpus.find((g) => !g.error) ?? null;
  const gpuError = vm?.gpus.find((g) => g.error)?.error ?? null;
  const serviceStatus = status ? (status.vm.reachable ? vm?.service.status : "unreachable") : undefined;
  const instanceStopped = instance?.status === "TERMINATED" || instance?.status === "STOPPED";
  const instanceRunning = instance?.status === "RUNNING";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Infrastructure</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">GPU</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {status ? `${status.instanceName} · ${status.zone} · ${status.gateway}` : "BlueFox3D image-to-3D VM"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {status ? `Updated ${new Date(status.checkedAt).toLocaleTimeString()}` : ""}
          </span>
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Instance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {!status ? (
              <p className="text-2xl font-semibold">—</p>
            ) : status.instance.configured ? (
              <>
                <Badge variant={statusVariant(instance?.status)}>{instance?.status ?? "Unknown"}</Badge>
                <p className="text-xs text-muted-foreground">
                  {instance?.machineType ?? status.instance.error ?? ""}
                  {instance?.gpus.length ? ` · ${instance.gpus.map((g) => `${g.count}× ${g.type}`).join(", ")}` : ""}
                </p>
              </>
            ) : (
              <>
                <Badge variant="secondary">Not linked</Badge>
                <p className="text-xs text-muted-foreground">Set GCP_SERVICE_ACCOUNT_KEY on the backend</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GPU service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Badge variant={statusVariant(serviceStatus)}>
              {serviceStatus === "ok" ? "Ready" : serviceStatus === "loading" ? "Loading model" : serviceStatus ?? "—"}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {vm?.service.restarting
                ? "Restarting now"
                : vm?.service.restart_requested
                  ? "Restart scheduled after current job"
                  : status && !status.vm.reachable
                    ? instanceStopped
                      ? "Instance is stopped"
                      : "Not responding"
                    : vm
                      ? `Up ${formatDuration(vm.service.process_uptime_seconds)}`
                      : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Queue</CardTitle>
            {vm && (vm.queue.waiting_jobs > 0 || Boolean(vm.queue.processing_job_id)) ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={busy}
                onClick={handleClearQueue}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums">
              {vm ? `${vm.queue.processing_job_id ? 1 : 0} + ${vm.queue.waiting_jobs}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {vm ? `running + waiting (max ${vm.queue.max_queue_length})` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Auto restart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums">
              {vm
                ? vm.service.restart_every_n_generations
                  ? `${vm.service.gpu_runs_since_restart} / ${vm.service.restart_every_n_generations}`
                  : "Off"
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">generations since last restart</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{gpu?.name ?? "GPU"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gpu ? (
              <>
                <div className="space-y-1.5">
                  <Metric
                    label="VRAM"
                    value={`${formatGib(gpu.memory_used_mib)} / ${formatGib(gpu.memory_total_mib)}`}
                  />
                  <UsageBar used={gpu.memory_used_mib} total={gpu.memory_total_mib} />
                </div>
                <div className="space-y-1.5">
                  <Metric label="Utilization" value={`${gpu.utilization_percent ?? "—"}%`} />
                  <UsageBar used={gpu.utilization_percent} total={100} warnAt={1.01} />
                </div>
                <Metric label="Temperature" value={gpu.temperature_c !== null && gpu.temperature_c !== undefined ? `${gpu.temperature_c} °C` : "—"} />
                <Metric
                  label="Power"
                  value={gpu.power_draw_w !== null && gpu.power_draw_w !== undefined ? `${gpu.power_draw_w.toFixed(0)} W` : "—"}
                  hint={gpu.power_limit_w ? `of ${gpu.power_limit_w.toFixed(0)} W` : undefined}
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {gpuError ?? (status && !status.vm.reachable ? "GPU stats unavailable while the service is down." : "Loading…")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Host</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vm ? (
              <>
                <div className="space-y-1.5">
                  <Metric label="RAM" value={`${formatGib(vm.ram.used_mib)} / ${formatGib(vm.ram.total_mib)}`} />
                  <UsageBar used={vm.ram.used_mib} total={vm.ram.total_mib} />
                </div>
                <Metric
                  label="Swap"
                  value={`${formatGib(vm.ram.swap_used_mib)} / ${formatGib(vm.ram.swap_total_mib)}`}
                />
                <div className="space-y-1.5">
                  <Metric label="Disk" value={`${vm.disk.used_gib} / ${vm.disk.total_gib} GB`} />
                  <UsageBar used={vm.disk.used_gib} total={vm.disk.total_gib} warnAt={0.9} />
                </div>
                <Metric
                  label="CPU load"
                  value={`${vm.cpu.load_1m} · ${vm.cpu.load_5m} · ${vm.cpu.load_15m}`}
                  hint={vm.cpu.count ? `${vm.cpu.count} vCPU` : undefined}
                />
                <Metric label="Service process RAM" value={formatGib(vm.service.process_rss_mib)} />
                <Metric label="Host uptime" value={formatDuration(vm.host_uptime_seconds)} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {status && !status.vm.reachable ? status.vm.error ?? "Service not reachable." : "Loading…"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Model</CardTitle>
          </CardHeader>
          <CardContent>
            {vm ? (
              <>
                <Metric label="Weights" value={vm.model.model_path} />
                <Metric label="Resolution" value={`${vm.model.resolution} cascade`} />
                <Metric label="Remesh" value={vm.model.remesh ? "On" : "Off"} />
                <Metric label="Faces (decimation)" value={vm.model.decimation_target.toLocaleString()} />
                <Metric label="Texture" value={`${vm.model.texture_size} px`} />
                <Metric label="Sampling steps" value={String(vm.model.sampling_steps)} />
                <Metric label="Last restart" value={formatTime(vm.service.last_restart?.at)} />
                {vm.service.last_restart?.reason ? (
                  <p className="pt-1 text-xs text-muted-foreground">{vm.service.last_restart.reason}</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            {instance ? (
              <div className="mt-3 border-t pt-3">
                <Metric label="Instance started" value={formatTime(instance.lastStartTimestamp)} />
                <Metric label="Instance stopped" value={formatTime(instance.lastStopTimestamp)} />
                <Metric label="External IP" value={instance.externalIp ?? "—"} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">GPU service</p>
              <p className="text-xs text-muted-foreground">
                Restarts the BlueFox3D process to clear GPU memory. Queued jobs resume after the model reloads (about 4
                minutes).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void restart("when_idle")} disabled={busy || !status?.vm.reachable}>
                  <RotateCcw />
                  Restart after current job
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy || !status?.vm.reachable}
                  onClick={() =>
                    setConfirm({
                      title: "Restart GPU service now?",
                      description:
                        "A running generation is interrupted and re-run automatically after the model reloads (about 4 minutes).",
                      confirmLabel: "Restart now",
                      destructive: true,
                      run: () => restart("now"),
                    })
                  }
                >
                  <Zap />
                  Restart now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !status?.vm.reachable}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await trimMemory(token);
                      toast.success(`Trimmed memory: released ${res.freed_mib} MiB back to OS`);
                      await load();
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : String(err));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <RefreshCw />
                  Trim RAM
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={busy || !status?.vm.reachable}
                  onClick={handleClearQueue}
                >
                  <Trash2 />
                  Clear queue
                </Button>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Instance</p>
              {status?.instance.configured ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Start or stop the GCP VM. A stopped VM costs nothing for GPU time but cannot generate.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void instanceAction("start")}
                      disabled={busy || !instanceStopped}
                    >
                      <Power />
                      Start
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !instanceRunning}
                      onClick={() =>
                        setConfirm({
                          title: "Reboot the instance?",
                          description:
                            "Hard-resets the VM. Any running generation fails; the service comes back after boot plus model load (5–6 minutes).",
                          confirmLabel: "Reboot",
                          destructive: true,
                          run: () => instanceAction("reset"),
                        })
                      }
                    >
                      <RotateCcw />
                      Reboot
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy || !instanceRunning}
                      onClick={() =>
                        setConfirm({
                          title: "Stop the GPU instance?",
                          description:
                            "3D generation will be unavailable for all users until the instance is started again.",
                          confirmLabel: "Stop instance",
                          destructive: true,
                          run: () => instanceAction("stop"),
                        })
                      }
                    >
                      <PowerOff />
                      Stop
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  To see instance state and start/stop the VM here, set <code>GCP_SERVICE_ACCOUNT_KEY</code> on the
                  backend (service account with Compute Instance Admin on {status?.instanceName ?? "the GPU VM"}).
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => (!open ? setConfirm(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.destructive ? "destructive" : "default"}
              disabled={busy}
              onClick={() => {
                const action = confirm;
                setConfirm(null);
                if (action) {
                  void action.run();
                }
              }}
            >
              {confirm?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
