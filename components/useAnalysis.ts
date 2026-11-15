"use client";

import { useCallback, useEffect, useState } from "react";
import type { Analysis } from "@/lib/types";

export function useAnalysis(handle: string) {
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Deu erro na análise.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deu erro na análise.");
    } finally {
      setRunning(false);
    }
  }, [handle]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/analyze?handle=${encodeURIComponent(handle)}`);
      if (cancelled) return;
      if (res.ok) setData(await res.json());
      else run();
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, run]);

  return { data, error, running, run };
}
