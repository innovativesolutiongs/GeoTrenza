import React, { useMemo, useState } from "react";
import type { Position } from "../store/positionSlice";

// Mirrors the backend's DetectedEvent shape. Lives here as a duck-typed
// interface so the timeline can render whatever the events endpoint returns.
export interface DetectedEvent {
  kind: "ARRIVAL" | "DEPARTURE" | "EXTENDED_IDLE" | "ENGINE_STARTED" | "ENGINE_STOPPED";
  at: string;
  details?: Record<string, unknown>;
}

interface Props {
  positions: Position[];
  events?: DetectedEvent[];
  deviceType: string;
}

const CLUSTER_GAP_SECONDS = 120;      // 2 min — burst boundary
const RENDER_GAP_THRESHOLD_SECONDS = 300; // 5 min — surface gap indicator

interface Cluster {
  start: Date; // oldest in cluster
  end: Date;   // newest
  positions: Position[];
}

function clusterPositions(positions: Position[]): Cluster[] {
  if (positions.length === 0) return [];
  // Sort ASC by recorded_at so a single forward pass closes clusters cleanly.
  const sorted = [...positions].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );
  const out: Cluster[] = [];
  let cur: Position[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const p = sorted[i];
    const dt = (new Date(p.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 1000;
    if (dt <= CLUSTER_GAP_SECONDS) {
      cur.push(p);
    } else {
      out.push({
        start: new Date(cur[0].recorded_at),
        end: new Date(cur[cur.length - 1].recorded_at),
        positions: cur,
      });
      cur = [p];
    }
  }
  out.push({
    start: new Date(cur[0].recorded_at),
    end: new Date(cur[cur.length - 1].recorded_at),
    positions: cur,
  });
  return out;
}

function fmtClock(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const EVENT_LABEL: Record<DetectedEvent["kind"], string> = {
  ARRIVAL: "Arrival",
  DEPARTURE: "Departure",
  EXTENDED_IDLE: "Extended idle",
  ENGINE_STARTED: "Engine started",
  ENGINE_STOPPED: "Engine stopped",
};
const EVENT_GLYPH: Record<DetectedEvent["kind"], string> = {
  ARRIVAL: "📍",
  DEPARTURE: "➡️",
  EXTENDED_IDLE: "⚠️",
  ENGINE_STARTED: "🟢",
  ENGINE_STOPPED: "⚪",
};

const PositionTimeline: React.FC<Props> = ({ positions, events, deviceType }) => {
  const clusters = useMemo(() => clusterPositions(positions), [positions]);

  // Decorate timeline items so we can render most-recent-first with gap
  // indicators and event overlays interleaved.
  type Item =
    | { kind: "cluster"; cluster: Cluster }
    | { kind: "gap"; seconds: number; from: Date; to: Date }
    | { kind: "event"; event: DetectedEvent };

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (let i = 0; i < clusters.length; i++) {
      out.push({ kind: "cluster", cluster: clusters[i] });
      if (i < clusters.length - 1) {
        const gap = (clusters[i + 1].start.getTime() - clusters[i].end.getTime()) / 1000;
        if (gap >= RENDER_GAP_THRESHOLD_SECONDS) {
          out.push({ kind: "gap", seconds: gap, from: clusters[i].end, to: clusters[i + 1].start });
        }
      }
    }
    if (deviceType === "WIRED" && events && events.length > 0) {
      for (const ev of events) {
        out.push({ kind: "event", event: ev });
      }
    }
    // Reverse-chronological: extract a sort key per item, then sort DESC.
    const keyFor = (it: Item) => {
      if (it.kind === "cluster") return it.cluster.end.getTime();
      if (it.kind === "gap") return it.to.getTime();
      return new Date(it.event.at).getTime();
    };
    return out.sort((a, b) => keyFor(b) - keyFor(a));
  }, [clusters, events, deviceType]);

  if (positions.length === 0) {
    return (
      <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>
        No position history yet.
      </div>
    );
  }

  return (
    <div style={{ fontSize: 13 }}>
      {items.map((it, i) =>
        it.kind === "gap" ? (
          <GapRow key={`g-${i}`} seconds={it.seconds} />
        ) : it.kind === "event" ? (
          <EventRow key={`e-${i}`} event={it.event} />
        ) : (
          <ClusterRow key={`c-${i}`} cluster={it.cluster} />
        )
      )}
    </div>
  );
};

const ClusterRow: React.FC<{ cluster: Cluster }> = ({ cluster }) => {
  const [open, setOpen] = useState(false);
  const speeds = cluster.positions.map((p) => p.speed_kph ?? 0);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const last = cluster.positions[cluster.positions.length - 1];
  const durationS = (cluster.end.getTime() - cluster.start.getTime()) / 1000;

  return (
    <div
      onClick={() => setOpen((o) => !o)}
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer",
        background: "#ffffff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <span style={{ fontWeight: 500 }}>{fmtClock(cluster.end)}</span>
          {durationS > 0 && (
            <span style={{ color: "#9ca3af", marginLeft: 8 }}>
              ← {fmtClock(cluster.start)} ({fmtDuration(durationS)})
            </span>
          )}
        </div>
        <div style={{ color: "#6b7280", fontSize: 12 }}>
          {cluster.positions.length} pkt · {avgSpeed.toFixed(1)} kph
        </div>
      </div>
      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
        {last.lat.toFixed(4)}, {last.lng.toFixed(4)}
      </div>
      {open && (
        <div style={{
          marginTop: 8, padding: 8, background: "#f9fafb",
          borderRadius: 6, fontSize: 12, color: "#4b5563",
          maxHeight: 200, overflowY: "auto",
        }}>
          {cluster.positions.slice().reverse().map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span>{new Date(p.recorded_at).toLocaleTimeString()}</span>
              <span>{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span>
              <span>{(p.speed_kph ?? 0).toFixed(1)} kph</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const GapRow: React.FC<{ seconds: number }> = ({ seconds }) => (
  <div style={{
    padding: "8px 14px",
    color: "#9ca3af",
    fontSize: 12,
    fontStyle: "italic",
    background: "#fafafa",
    borderBottom: "1px solid #f3f4f6",
    textAlign: "center",
  }}>
    No data for {fmtDuration(seconds)}
  </div>
);

const EventRow: React.FC<{ event: DetectedEvent }> = ({ event }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen((o) => !o)}
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer",
        background: event.kind === "EXTENDED_IDLE" ? "#fffbeb" : "#f0f9ff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <span style={{ marginRight: 8 }}>{EVENT_GLYPH[event.kind]}</span>
          <span style={{ fontWeight: 500 }}>{EVENT_LABEL[event.kind]}</span>
        </div>
        <span style={{ color: "#6b7280", fontSize: 12 }}>{fmtClock(new Date(event.at))}</span>
      </div>
      {open && event.details && (
        <pre style={{
          margin: "6px 0 0", padding: 8, fontSize: 11,
          background: "#f9fafb", borderRadius: 6, color: "#374151",
          whiteSpace: "pre-wrap",
        }}>{JSON.stringify(event.details, null, 2)}</pre>
      )}
    </div>
  );
};

export default PositionTimeline;
