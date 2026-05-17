import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import alertService, { type AlertRuleRow, type RuleType, type Severity } from "../services/alertService";
import ConfirmDestructiveModal from "../shared/ConfirmDestructiveModal";

// Phase 1: only STUB_TEST is selectable. Phase 2 unlocks geofence/device-offline/
// unauthorized-movement. Phase 4 unlocks extended-idle / speed-violation.
const SELECTABLE_TYPES: RuleType[] = ["STUB_TEST"];
const SEVERITIES: Severity[] = ["LOW","MEDIUM","HIGH","CRITICAL"];

const AlertRulesList: React.FC = () => {
  const user = useSelector((s: any) => s.login.userInfo);
  const accountId = user?.customerID ? String(user.customerID) : undefined;
  const [rows, setRows] = useState<AlertRuleRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AlertRuleRow | null>(null);
  const [toDelete, setToDelete] = useState<AlertRuleRow | null>(null);

  const load = () => {
    alertService.listAlertRules(accountId).then((r) => setRows(r.data))
      .catch((e) => toast.error(e?.response?.data?.message ?? "Failed to load rules"));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [accountId]);

  const handleTestFire = async (id: string) => {
    try {
      const r = await alertService.testFireAlertRule(id, { title: "Manual test fire" });
      if (r.data.fired) toast.success(`Fired alert ${r.data.fired.id}`);
      else toast.info(r.data.message);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Test fire failed"); }
  };

  return (
    <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>Alert rules</h2>
        <button onClick={() => { setEditing(null); setShowForm(true); }} style={btnPrimary}>+ Add Rule</button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ background: "#f9fafb" }}>
            {["Name","Type","Severity","Scope","Enabled",""].map((c) => <th key={c} style={th}>{c}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, color: "#9ca3af", textAlign: "center", padding: 24 }}>No rules configured</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={td}>
                  <div style={{ fontWeight: 500 }}>{r.name}</div>
                  {r.description && <div style={{ color: "#6b7280", fontSize: 11 }}>{r.description}</div>}
                </td>
                <td style={td}>{r.rule_type}</td>
                <td style={td}>{r.severity}</td>
                <td style={td}>{r.scope}</td>
                <td style={td}>{r.enabled ? "Yes" : "No"}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button onClick={() => handleTestFire(r.id)} style={btnLinkSmall}>Test fire</button>{" "}
                  <button onClick={() => { setEditing(r); setShowForm(true); }} style={btnLinkSmall}>Edit</button>{" "}
                  <button onClick={() => setToDelete(r)} style={btnDangerSmall}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <RuleFormModal
          editing={editing}
          accountId={accountId}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}

      <ConfirmDestructiveModal
        open={!!toDelete}
        title={`Delete rule "${toDelete?.name}"?`}
        description="Soft-deletes the rule. Existing alerts fired by it stay in history."
        confirmationText="DELETE"
        confirmLabel="Soft-delete"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await alertService.deleteAlertRule(toDelete!.id);
            toast.success("Rule deleted"); setToDelete(null); load();
          } catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed"); }
        }}
      />
    </div>
  );
};

const RuleFormModal: React.FC<{
  editing: AlertRuleRow | null;
  accountId: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}> = ({ editing, accountId, onClose, onSaved }) => {
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [ruleType, setRuleType] = useState<RuleType>(editing?.rule_type ?? "STUB_TEST");
  const [severity, setSeverity] = useState<Severity>(editing?.severity ?? "MEDIUM");
  const [enabled, setEnabled] = useState<boolean>(editing?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("name is required"); return; }
    if (!accountId && !editing) { toast.error("Cannot create rule without account context"); return; }
    setSaving(true);
    try {
      if (editing) {
        await alertService.updateAlertRule(editing.id, { name, description, rule_type: ruleType, severity, enabled });
      } else {
        await alertService.createAlertRule({ account_id: accountId!, name, description, rule_type: ruleType, severity, enabled });
      }
      toast.success(editing ? "Rule updated" : "Rule created");
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally { setSaving(false); }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{editing ? "Edit rule" : "Add alert rule"}</h3>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} style={input} /></Field>
        <Field label="Description">
          <textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} style={{ ...input, minHeight: 60 }} />
        </Field>
        <Field label="Type">
          <select value={ruleType} onChange={(e) => setRuleType(e.target.value as RuleType)} style={input}>
            {SELECTABLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            Only STUB_TEST is enabled in Phase 1. Geofence / device-offline / unauthorized-movement land in Phase 2; idle / speed in Phase 4.
          </div>
        </Field>
        <Field label="Severity">
          <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} style={input}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Enabled">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </Field>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={btnSecondary} disabled={saving}>Cancel</button>
          <button onClick={save} style={btnPrimary} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#4b5563", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: "10px 14px", color: "#111827" };
const btnPrimary: React.CSSProperties = { background: "#111827", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600 };
const btnSecondary: React.CSSProperties = { background: "#f3f4f6", color: "#111827", border: "1px solid #d1d5db", padding: "8px 14px", borderRadius: 6, cursor: "pointer" };
const btnLinkSmall: React.CSSProperties = { background: "transparent", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11 };
const btnDangerSmall: React.CSSProperties = { background: "transparent", color: "#dc2626", border: "1px solid #fecaca", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 };
const modal: React.CSSProperties = { background: "#fff", padding: 24, borderRadius: 8, width: 480, maxWidth: "90vw", maxHeight: "90vh", overflowY: "auto" };
const input: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, boxSizing: "border-box" };

export default AlertRulesList;
