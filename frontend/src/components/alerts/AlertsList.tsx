import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import alertService, { type AlertRow, type AlertStatus, type Severity } from "../services/alertService";

const STATUSES: (AlertStatus | "all")[] = ["all","ACTIVE","ACKNOWLEDGED","SNOOZED","MUTED","RESOLVED"];
const SEVERITIES: (Severity | "all")[] = ["all","LOW","MEDIUM","HIGH","CRITICAL"];

const sevColor: Record<Severity, string> = {
  LOW: "#9ca3af", MEDIUM: "#f59e0b", HIGH: "#ef4444", CRITICAL: "#7f1d1d",
};

const sevBadge = (s: Severity): React.CSSProperties => ({
  background: sevColor[s], color: "#fff", padding: "2px 8px", borderRadius: 4,
  fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
});

const statusBadge = (s: AlertStatus): React.CSSProperties => {
  const map: Record<AlertStatus, string> = {
    ACTIVE: "#dc2626", ACKNOWLEDGED: "#2563eb", RESOLVED: "#16a34a",
    SNOOZED: "#a855f7", MUTED: "#6b7280",
  };
  return {
    background: map[s], color: "#fff", padding: "2px 8px", borderRadius: 4,
    fontSize: 10, fontWeight: 600,
  };
};

const relative = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const AlertsList: React.FC = () => {
  const user = useSelector((s: any) => s.login.userInfo);
  const accountId = user?.customerID ? String(user.customerID) : undefined;

  const [rows, setRows] = useState<AlertRow[]>([]);
  const [status, setStatus] = useState<AlertStatus | "all">("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = () => {
    alertService.listAlerts({ account_id: accountId, status: status === "all" ? undefined : status, limit: 500 })
      .then((r) => setRows(r.data))
      .catch((e) => toast.error(e?.response?.data?.message ?? "Failed to load alerts"));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status, accountId]);

  const filtered = useMemo(() => rows.filter((a) => {
    if (severity !== "all" && a.severity !== severity) return false;
    if (search && !`${a.title} ${a.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, severity, search]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const bulkAck = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => alertService.acknowledgeAlert(id, user?.userID ? String(user.userID) : undefined)));
      toast.success(`Acknowledged ${ids.length}`);
      setSelected(new Set()); load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Bulk ack failed"); }
  };

  const handleAck = async (id: string) => {
    try { await alertService.acknowledgeAlert(id, user?.userID ? String(user.userID) : undefined); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed"); }
  };
  const handleResolve = async (id: string) => {
    try { await alertService.resolveAlert(id); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed"); }
  };
  const handleSnooze = async (id: string) => {
    const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    try { await alertService.snoozeAlert(id, until); toast.info("Snoozed 1h"); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed"); }
  };
  const handleMute = async (id: string) => {
    try { await alertService.muteAlert(id); toast.info("Muted"); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed"); }
  };

  return (
    <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Alerts</h2>
        {selected.size > 0 && (
          <button onClick={bulkAck} style={btnPrimary}>Acknowledge {selected.size}</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Search title / description…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, minWidth: 240 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)} style={pill(status === s)}>
              {s === "all" ? "All" : s.toLowerCase()}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {SEVERITIES.map((s) => (
            <button key={s} onClick={() => setSeverity(s)} style={pill(severity === s)}>
              {s === "all" ? "All sev" : s.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: "#f9fafb" }}>
            <th style={th}></th>
            <th style={th}>Sev</th>
            <th style={th}>Title</th>
            <th style={th}>Vehicle</th>
            <th style={th}>Status</th>
            <th style={th}>Triggered</th>
            <th style={{ ...th, textAlign: "right" }}>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...td, color: "#9ca3af", textAlign: "center", padding: 24 }}>No alerts</td></tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={td}>
                  <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                </td>
                <td style={td}><span style={sevBadge(a.severity)}>{a.severity}</span></td>
                <td style={td}>
                  <div style={{ fontWeight: 500 }}>{a.title}</div>
                  {a.description && <div style={{ color: "#6b7280", fontSize: 11 }}>{a.description}</div>}
                </td>
                <td style={td}>{a.vehicle_id ?? "—"}</td>
                <td style={td}><span style={statusBadge(a.status)}>{a.status}</span></td>
                <td style={td}>{relative(a.triggered_at)}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  {a.status === "ACTIVE" && <button onClick={() => handleAck(a.id)} style={btnLinkSmall}>Ack</button>}{" "}
                  {a.status !== "RESOLVED" && <button onClick={() => handleResolve(a.id)} style={btnLinkSmall}>Resolve</button>}{" "}
                  {a.status === "ACTIVE" && <button onClick={() => handleSnooze(a.id)} style={btnLinkSmall}>Snooze 1h</button>}{" "}
                  {a.status !== "MUTED" && <button onClick={() => handleMute(a.id)} style={btnDangerSmall}>Mute</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#4b5563", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: "10px 14px", color: "#111827" };
const btnPrimary: React.CSSProperties = { background: "#111827", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600 };
const btnLinkSmall: React.CSSProperties = { background: "transparent", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11 };
const btnDangerSmall: React.CSSProperties = { background: "transparent", color: "#dc2626", border: "1px solid #fecaca", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11 };
const pill = (active: boolean): React.CSSProperties => ({
  padding: "5px 12px", borderRadius: 16, fontSize: 12,
  border: active ? "1px solid #111827" : "1px solid #d1d5db",
  background: active ? "#111827" : "#fff",
  color: active ? "#fff" : "#374151", cursor: "pointer",
});

export default AlertsList;
