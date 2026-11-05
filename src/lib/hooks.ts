import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, get } from "./api";

/** GET `path` (null = skip). Optional polling every `pollMs`. */
export function useApi<T>(path: string | null, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const mounted = useRef(true);

  const load = useCallback(async (quiet = false) => {
    if (!path) return;
    if (!quiet) setLoading(true);
    try {
      const result = await get<T>(path);
      if (mounted.current) {
        setData(result);
        setError(null);
      }
      return result;
    } catch (err) {
      if (mounted.current && !quiet) setError(err as ApiError);
    } finally {
      if (mounted.current && !quiet) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    mounted.current = true;
    load();
    if (!pollMs) return () => { mounted.current = false; };
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, pollMs);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
  }, [load, pollMs]);

  return { data, error, loading, reload: load, setData };
}

/** Wrap an async action with busy + error state. */
export function useAction<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [fn]);
  return { run, busy, error, setError };
}
