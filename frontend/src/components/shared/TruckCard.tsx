import React from "react";
import BatteryIcon from "./BatteryIcon";
import { MARKER_COLORS, MARKER_LABELS } from "../utils/constants";
import type { MarkerState } from "../utils/constants";

export interface TruckCardData {
  id: string;
  name: string | null;
  registration_no: string;
  state: MarkerState;
  lastUpdate?: string | null; // ISO timestamp (received_at preferred)
  lat?: number | null;
  lng?: number | null;
  speedKph?: number | null;
  batteryPercent?: number | null;
}

interface Props {
  data: TruckCardData;
  now: number; // for "X minutes ago"
  compact?: boolean; // sidebar-collapsed icon-only view
  onHoverChange?: (hovered: boolean) => void;
  onClick?: () => void;
  isHighlighted?: boolean;
}

// "12s ago", "3m ago", "2h ago" — coarse, dashboard-style.
function relativeTime(ts: string | null | undefined, now: number): string {
  if (!ts) return "—";
  const ms = Math.max(0, now - new Date(ts).getTime());
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TruckCard: React.FC<Props> = ({ data, now, compact, onHoverChange, onClick, isHighlighted }) => {
  const color = MARKER_COLORS[data.state];
  const stateLabel = MARKER_LABELS[data.state];

  if (compact) {
    return (
      <div
        title={`${data.name ?? data.registration_no} — ${stateLabel}`}
        onClick={onClick}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        style={{
          padding: "8px",
          cursor: onClick ? "pointer" : "default",
          background: isHighlighted ? "#e5e7eb" : "transparent",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span style={{
          width: 12, height: 12, borderRadius: "50%",
          background: color, display: "inline-block",
          boxShadow: "0 0 4px rgba(0,0,0,0.3)",
        }} />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      style={{
        padding: "12px 14px",
        borderBottom: "1px solid #e5e7eb",
        cursor: onClick ? "pointer" : "default",
        background: isHighlighted ? "#f3f4f6" : "#ffffff",
        transition: "background 80ms",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: color, display: "inline-block", flexShrink: 0,
              boxShadow: "0 0 3px rgba(0,0,0,0.25)",
            }} />
            <span style={{
              fontWeight: 600, fontSize: 15, color: "#111827",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {data.name ?? data.registration_no}
            </span>
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
            {data.registration_no}
            {data.name ? " · " + stateLabel : ""}
          </div>
        </div>
        <BatteryIcon percentLevel={data.batteryPercent ?? null} size={32} />
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 4,
        marginTop: 8,
        fontSize: 12,
        color: "#4b5563",
      }}>
        <div>
          <span style={{ color: "#9ca3af" }}>Updated </span>
          {relativeTime(data.lastUpdate, now)}
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ color: "#9ca3af" }}>Speed </span>
          {data.speedKph == null ? "—" : `${data.speedKph.toFixed(0)} kph`}
        </div>
        <div style={{ gridColumn: "1 / -1", color: "#6b7280" }}>
          {data.lat != null && data.lng != null
            ? `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`
            : "Location unknown"}
        </div>
      </div>
    </div>
  );
};

export default TruckCard;
