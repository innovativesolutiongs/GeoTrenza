import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import alertService, { type AlertChannel, type Severity } from "../services/alertService";

// Phase 1: only IN_APP is selectable. Phase 3 unlocks WHATSAPP.
// Stage 4 unlocks EMAIL / SMS.
const PHASE1_SELECTABLE: AlertChannel[] = ["IN_APP"];
const SEVERITIES: Severity[] = ["LOW","MEDIUM","HIGH","CRITICAL"];

interface SubRow {
  id: string;
  user_id: string;
  rule_id: string | null;
  channels: AlertChannel[];
  min_severity: Severity;
  snooze_until: string | null;
}

const AlertSubscriptions: React.FC = () => {
  const user = useSelector((s: any) => s.login.userInfo);
  const userId = user?.userID ? String(user.userID) : null;
  const [rows, setRows] = useState<SubRow[]>([]);
  const [channels, setChannels] = useState<AlertChannel[]>(["IN_APP"]);
  const [minSeverity, setMinSeverity] = useState<Severity>("LOW");

  const load = () => {
    if (!userId) return;
    alertService.listSubscriptions(userId).then((r) => setRows(r.data))
      .catch((e) => toast.error(e?.response?.data?.message ?? "Failed"));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  const toggle = (c: AlertChannel) => {
    setChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  const create = async () => {
    if (!userId) { toast.error("No user context"); return; }
    if (channels.length === 0) { toast.error("Pick at least one channel"); return; }
    try {
      await alertService.createSubscription(userId, { channels, min_severity: minSeverity });
      toast.success("Subscription created"); load();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed"); }
  };

  const remove = async (id: string) => {
    try { await alertService.deleteSubscription(id); toast.success("Removed"); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed"); }
  };

  if (!userId) {
    return <div style={{ padding: 24 }}>Sign in to manage alert subscriptions.</div>;
  }

  return (
    <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
      <h2 style={{ marginTop: 0 }}>Alert subscriptions</h2>
      <p style={{ color: "#6b7280", fontSize: 13, marginTop: 0 }}>
        These control where you receive alert notifications. In Phase 1 only the in-app bell is wired;
        WhatsApp lands in Phase 3 and email/SMS in Stage 4.
      </p>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 18, marginBottom: 18 }}>
        <h4 style={{ margin: 0, marginBottom: 12 }}>Add subscription</h4>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Channels</div>
            <div style={{ display: "flex", gap: 6 }}>
              {PHASE1_SELECTABLE.map((c) => (
                <button key={c} onClick={() => toggle(c)} style={pill(channels.includes(c))}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Min severity</div>
            <select value={minSeverity} onChange={(e) => setMinSeverity(e.target.value as Severity)}
              style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={create} style={btnPrimary}>Add</button>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: "#f9fafb" }}>
            {["Rule scope","Channels","Min severity","Snoozed until",""].map((c) => <th key={c} style={th}>{c}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} style={{ ...td, color: "#9ca3af", textAlign: "center", padding: 24 }}>No subscriptions yet</td></tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={td}>{s.rule_id ? `Rule ${s.rule_id}` : "All rules"}</td>
                <td style={td}>{s.channels.join(", ")}</td>
                <td style={td}>{s.min_severity}</td>
                <td style={td}>{s.snooze_until ? new Date(s.snooze_until).toLocaleString() : "—"}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button onClick={() => remove(s.id)} style={btnDangerSmall}>Remove</button>
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
const btnDangerSmall: React.CSSProperties = { background: "transparent", color: "#dc2626", border: "1px solid #fecaca", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11 };
const pill = (active: boolean): React.CSSProperties => ({
  padding: "5px 12px", borderRadius: 16, fontSize: 12,
  border: active ? "1px solid #111827" : "1px solid #d1d5db",
  background: active ? "#111827" : "#fff",
  color: active ? "#fff" : "#374151", cursor: "pointer",
});

export default AlertSubscriptions;
