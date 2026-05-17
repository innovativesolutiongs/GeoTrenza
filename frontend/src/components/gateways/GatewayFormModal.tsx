import React, { useState } from "react";
import { toast } from "react-toastify";
import gatewayService from "../services/gatewayService";

// Edit-mode form modal for gateways. Create flow uses the dedicated
// /gateways/new page because it ships with a freestanding URL; this modal
// is the shared "tweak an existing gateway" UX used from /gateways and from
// the customer detail Gateways tab.
interface Props {
  editing: any;
  onClose: () => void;
  onSaved: () => void;
}

const GatewayFormModal: React.FC<Props> = ({ editing, onClose, onSaved }) => {
  const [form, setForm] = useState({
    terminal_id: editing.terminal_id ?? "",
    auth_code: editing.auth_code ?? "",
    model: editing.model ?? "",
    device_type: editing.device_type ?? "WIRED",
    imei: editing.imei ?? "",
    firmware_version: editing.firmware_version ?? "",
    inventory_status: editing.inventory_status ?? "IN_STOCK",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      await gatewayService.updateGateway(String(editing.id), {
        auth_code: form.auth_code,
        model: form.model,
        device_type: form.device_type as any,
        imei: form.imei || null,
        firmware_version: form.firmware_version || null,
        inventory_status: form.inventory_status,
      });
      toast.success("Gateway updated");
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Edit Gateway</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}>✕</button>
        </div>
        <div style={grid2}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lab}>Terminal ID (read-only)</label>
            <input value={form.terminal_id} disabled style={{ ...inp, background: "#f3f4f6" }} />
          </div>
          <div><label style={lab}>Auth code</label><input value={form.auth_code} onChange={(e) => set("auth_code", e.target.value)} style={inp} /></div>
          <div><label style={lab}>Model</label><input value={form.model} onChange={(e) => set("model", e.target.value)} style={inp} /></div>
          <div>
            <label style={lab}>Device type</label>
            <select value={form.device_type} onChange={(e) => set("device_type", e.target.value)} style={inp}>
              <option value="WIRED">WIRED</option>
              <option value="MAGNETIC_BATTERY">MAGNETIC_BATTERY</option>
              <option value="ASSET_TRACKER">ASSET_TRACKER</option>
            </select>
          </div>
          <div>
            <label style={lab}>Inventory status</label>
            <select value={form.inventory_status} onChange={(e) => set("inventory_status", e.target.value)} style={inp}>
              <option>IN_STOCK</option><option>ASSIGNED</option><option>ACTIVE</option>
              <option>INACTIVE</option><option>RETURNED</option><option>DECOMMISSIONED</option>
            </select>
          </div>
          <div><label style={lab}>IMEI</label><input value={form.imei} onChange={(e) => set("imei", e.target.value)} style={inp} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lab}>Firmware version</label><input value={form.firmware_version} onChange={(e) => set("firmware_version", e.target.value)} style={inp} /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={btnSecondary} disabled={busy}>Cancel</button>
          <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5000 };
const card: React.CSSProperties = { background: "#fff", padding: 22, borderRadius: 10, width: "min(640px, 92vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const lab: React.CSSProperties = { display: "block", fontSize: 12, color: "#4b5563", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 };
const btnPrimary: React.CSSProperties = { background: "#111827", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 };
const btnSecondary: React.CSSProperties = { background: "#f3f4f6", color: "#111827", border: "1px solid #d1d5db", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 };

export default GatewayFormModal;
