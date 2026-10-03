import { adminRequest as request, type TokenGetter } from "./admin-request";

export type GpuDevice = {
  name?: string;
  memory_total_mib?: number | null;
  memory_used_mib?: number | null;
  memory_free_mib?: number | null;
  utilization_percent?: number | null;
  temperature_c?: number | null;
  power_draw_w?: number | null;
  power_limit_w?: number | null;
  error?: string;
};

export type VmSystem = {
  service: {
    status: "ok" | "loading" | "error";
    pipeline_loaded: boolean;
    load_error: string | null;
    pid: number;
    process_uptime_seconds: number;
    process_rss_mib: number | null;
    restarting: boolean;
    restart_requested: boolean;
    gpu_runs_since_restart: number;
    restart_every_n_generations: number;
    max_gpu_attempts: number;
    last_restart: { reason?: string; at?: number; gpu_runs?: number } | null;
  };
  model: {
    name: string;
    model_path: string;
    resolution: number;
    sampling_steps: number;
    decimation_target: number;
    texture_size: number;
    remesh: boolean;
  };
  queue: { processing_job_id: string | null; waiting_jobs: number; max_queue_length: number };
  gpus: GpuDevice[];
  ram: {
    total_mib?: number | null;
    available_mib?: number | null;
    used_mib?: number | null;
    swap_total_mib?: number | null;
    swap_used_mib?: number | null;
  };
  cpu: { count: number | null; load_1m: number; load_5m: number; load_15m: number };
  disk: { total_gib: number; used_gib: number; free_gib: number };
  host_uptime_seconds: number | null;
};

export type GcpInstance = {
  name: string;
  status: string;
  machineType: string | null;
  gpus: { type: string; count: number }[];
  lastStartTimestamp: string | null;
  lastStopTimestamp: string | null;
  externalIp: string | null;
};

export type GpuStatus = {
  gateway: string;
  instanceName: string;
  zone: string;
  vm: { reachable: boolean; data: VmSystem | null; error: string | null };
  instance: { configured: boolean; data: GcpInstance | null; error: string | null };
  checkedAt: string;
};

export type RestartMode = "when_idle" | "now";
export type InstanceAction = "start" | "stop" | "reset";

export function fetchGpuStatus(getToken: TokenGetter): Promise<GpuStatus> {
  return request<GpuStatus>("/api/admin/gpu", { method: "GET" }, getToken, "Failed to load GPU status");
}

export function restartGpuService(
  mode: RestartMode,
  getToken: TokenGetter
): Promise<{ status: string; message: string }> {
  return request(
    "/api/admin/gpu/restart",
    { method: "POST", body: JSON.stringify({ mode }) },
    getToken,
    "Failed to restart GPU service"
  );
}

export function trimMemory(
  getToken: TokenGetter
): Promise<{ status: string; before_rss_mib: number; after_rss_mib: number; freed_mib: number }> {
  return request(
    "/api/admin/gpu/trim-memory",
    { method: "POST" },
    getToken,
    "Failed to trim memory"
  );
}

export function clearGpuQueue(
  getToken: TokenGetter
): Promise<{ status: string; cleared_jobs: number; message: string }> {
  return request(
    "/api/admin/gpu/clear-queue",
    { method: "POST" },
    getToken,
    "Failed to clear queue"
  );
}

export function runInstanceAction(
  action: InstanceAction,
  getToken: TokenGetter
): Promise<{ ok: boolean; operation: string }> {
  return request(
    `/api/admin/gpu/instance/${action}`,
    { method: "POST" },
    getToken,
    `Failed to ${action} the instance`
  );
}
