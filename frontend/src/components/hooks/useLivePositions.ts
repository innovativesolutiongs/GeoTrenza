import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLatestPositions } from "../store/positionSlice";
import type { Position } from "../store/positionSlice";
import type { RootState, AppDispatch } from "../store";

const POLL_INTERVAL_MS = 20_000;

interface Options {
  // Cap returned rows. Default 100 matches backend default.
  limit?: number;
  // Skip polling entirely (e.g. when no auth or feature off).
  enabled?: boolean;
}

interface Result {
  positions: Position[];
  loading: boolean;
  error: string | null;
}

// Polls /api/positions/latest on an interval and exposes the latest array
// from redux. Polling pauses while the tab is hidden to save resources and
// resumes (with an immediate fetch) on visibilitychange.
export function useLivePositions(opts: Options = {}): Result {
  const { limit, enabled = true } = opts;
  const dispatch = useDispatch<AppDispatch>();
  const positions = useSelector((s: RootState) => s.position.latest);
  const loading = useSelector((s: RootState) => s.position.loading);
  const error = useSelector((s: RootState) => s.position.error);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = () => {
      dispatch(fetchLatestPositions(limit));
    };

    const start = () => {
      if (timer !== null) return;
      fetchOnce();
      timer = setInterval(fetchOnce, POLL_INTERVAL_MS);
    };

    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [dispatch, limit, enabled]);

  return { positions, loading, error };
}
