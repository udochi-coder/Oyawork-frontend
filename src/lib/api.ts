// Small fetch wrapper for the OyaWork Django API (JWT bearer auth with automatic refresh).
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

const ACCESS = "oyawork.access";
const REFRESH = "oyawork.refresh";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode: tokens live for this tab only */
  }
}

let memoryAccess: string | null = read(ACCESS);
let memoryRefresh: string | null = read(REFRESH);

export function setTokens(access: string | null, refresh?: string | null) {
  memoryAccess = access;
  write(ACCESS, access);
  if (refresh !== undefined) {
    memoryRefresh = refresh;
    write(REFRESH, refresh);
  }
}
export const hasSession = () => Boolean(memoryAccess || memoryRefresh);

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, data: any) {
    super(firstError(data) || `Request failed (${status})`);
    this.status = status;
    this.data = data;
  }
  field(name: string): string | undefined {
    const v = this.data?.[name] ?? this.data?.errors?.[name];
    return Array.isArray(v) ? v[0] : typeof v === "string" ? v : undefined;
  }
}

function firstError(data: any): string | undefined {
  if (!data) return undefined;
  if (typeof data === "string") return data.length < 200 ? data : undefined;
  if (data.error) return typeof data.error === "string" ? data.error : firstError(data.error);
  if (data.detail) return String(data.detail);
  if (data.errors) return firstError(data.errors);
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length) return typeof value[0] === "string" ? value[0] : firstError(value[0]);
    if (typeof value === "string") return value;
  }
  return undefined;
}

let refreshing: Promise<boolean> | null = null;
async function refreshAccess(): Promise<boolean> {
  if (!memoryRefresh) return false;
  refreshing ??= fetch(`${API_URL}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: memoryRefresh }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      const data = await r.json();
      setTokens(data.access, data.refresh ?? memoryRefresh);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

type Options = { method?: string; body?: any; auth?: boolean; signal?: AbortSignal };

export async function api<T = any>(path: string, opts: Options = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (opts.auth !== false && memoryAccess) headers.Authorization = `Bearer ${memoryAccess}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, { method: opts.method || (body ? "POST" : "GET"), headers, body, signal: opts.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new ApiError(0, { error: "Can't reach OyaWork. Check your connection and try again." });
  }

  if (res.status === 401 && retry && opts.auth !== false && memoryRefresh) {
    if (await refreshAccess()) return api<T>(path, opts, false);
    setTokens(null, null);
    window.dispatchEvent(new Event("oyawork:logout"));
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON reply (e.g. an HTML error page from the server or a proxy): never show the raw markup.
    data = null;
  }
  if (!res.ok) {
    if (res.status >= 500) data = { error: "Something went wrong on our side. Please try again in a moment." };
    else if (data === null) data = { error: `Something went wrong (${res.status}). Please try again.` };
    throw new ApiError(res.status, data);
  }
  return data as T;
}

export const get = <T = any>(path: string, signal?: AbortSignal) => api<T>(path, { signal });
export const post = <T = any>(path: string, body?: any) => api<T>(path, { method: "POST", body: body ?? {} });
export const patch = <T = any>(path: string, body: any) => api<T>(path, { method: "PATCH", body });

export function form(data: Record<string, any>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item) => fd.append(k, item));
    else fd.append(k, v instanceof Blob ? v : String(v));
  }
  return fd;
}
