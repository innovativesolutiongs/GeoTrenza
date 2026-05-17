import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import alertService, { type AlertRow, type Severity } from "../services/alertService";

const POLL_MS = 30_000;

const sevColor: Record<Severity, string> = {
  LOW: "#9ca3af", MEDIUM: "#f59e0b", HIGH: "#ef4444", CRITICAL: "#7f1d1d",
};

const relative = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const AlertBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<AlertRow[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    try {
      const r = await alertService.listAlerts({ status: "ACTIVE", limit: 5 });
      setRecent(r.data);
      setActiveCount(r.data.length);
    } catch {
      // network blip — preserve last known counts.
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: any) => {
      if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={wrap} style={{ position: "relative", marginRight: 12 }}>
      <button
        onClick={() => setOpen((p) => !p)}
        aria-label="Alerts"
        style={{
          background: "transparent", border: "none", cursor: "pointer", padding: 6,
          position: "relative", display: "flex", alignItems: "center",
        }}
      >
        <Bell size={20} />
        {activeCount > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            background: "#ef4444", color: "#fff", borderRadius: 10,
            fontSize: 10, padding: "1px 6px", fontWeight: 700, lineHeight: "14px",
            minWidth: 16, textAlign: "center",
          }}>{activeCount > 9 ? "9+" : activeCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)",
          width: 340, background: "#fff", border: "1px solid #e5e7eb",
          borderRadius: 8, boxShadow: "0 10px 20px rgba(0,0,0,0.08)", zIndex: 1000,
        }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
            Recent active alerts
          </div>
          {recent.length === 0 && (
            <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>No active alerts</div>
          )}
          {recent.map((a) => (
            <div
              key={a.id}
              onClick={() => { setOpen(false); navigate(`/alerts`); }}
              style={{ padding: "10px 14px", borderBottom: "1px solid #f9fafb", cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: 4,
                  background: sevColor[a.severity], marginRight: 8, verticalAlign: "middle",
                }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#111827" }}>{a.title}</span>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{relative(a.triggered_at)}</span>
              </div>
              {a.vehicle_id && (
                <div style={{ fontSize: 11, color: "#6b7280", paddingLeft: 16 }}>Vehicle {a.vehicle_id}</div>
              )}
            </div>
          ))}
          <button
            onClick={() => { setOpen(false); navigate("/alerts"); }}
            style={{
              width: "100%", padding: "10px 14px", background: "#f9fafb",
              border: "none", borderTop: "1px solid #f3f4f6", cursor: "pointer",
              color: "#1d4ed8", fontWeight: 600, fontSize: 13,
            }}
          >View all alerts →</button>
        </div>
      )}
    </div>
  );
};

export default AlertBell;
