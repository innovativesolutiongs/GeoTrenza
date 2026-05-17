import { useEffect, useState } from "react";

// Returns a `now` (epoch ms) that updates on every requestAnimationFrame
// while the tab is visible. Consumers can pass this through pure interpolation
// functions to get smooth ~60fps movement without imperative Leaflet calls.
//
// Pauses on document.hidden and snaps forward on visibility resume so a long
// hidden tab doesn't replay a backlog of frames.
export function useAnimationTick(): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let rafId: number | null = null;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      setNow(Date.now());
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (rafId !== null) return;
      tick();
    };

    const stop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        setNow(Date.now()); // catch up immediately on resume
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return now;
}
