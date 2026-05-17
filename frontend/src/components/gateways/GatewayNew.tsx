import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import gatewayService from "../services/gatewayService";

const GatewayNew: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    terminal_id: "", auth_code: "", model: "G107",
    device_type: "WIRED" as "WIRED" | "MAGNETIC_BATTERY" | "ASSET_TRACKER",
    imei: "", firmware_version: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v });

  const submit = async () => {
    if (!/^[0-9]{12}$/.test(form.terminal_id)) {
      toast.error("Terminal ID must be exactly 12 digits");
      return;
    }
    if (!form.auth_code || !form.model) {
      toast.error("Auth code and model are required");
      return;
    }
    setBusy(true);
    try {
      await gatewayService.createGateway({
        terminal_id: form.terminal_id,
        auth_code: form.auth_code,
        model: form.model,
        device_type: form.device_type,
        imei: form.imei || null,
        firmware_version: form.firmware_version || null,
      });
      toast.success("Gateway added to inventory");
      navigate("/gateways");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>Add Gateway</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label style={lab}>Terminal ID * (12 digits)</label><input value={form.terminal_id} onChange={(e) => set("terminal_id", e.target.value)} style={inp} /></div>
          <div><label style={lab}>Auth code *</label><input value={form.auth_code} onChange={(e) => set("auth_code", e.target.value)} style={inp} /></div>
          <div><label style={lab}>Model *</label><input value={form.model} onChange={(e) => set("model", e.target.value)} style={inp} /></div>
          <div><label style={lab}>Device type</label>
            <select value={form.device_type} onChange={(e) => set("device_type", e.target.value)} style={inp}>
              <option value="WIRED">WIRED</option>
              <option value="MAGNETIC_BATTERY">MAGNETIC_BATTERY</option>
              <option value="ASSET_TRACKER">ASSET_TRACKER</option>
            </select>
          </div>
          <div><label style={lab}>IMEI</label><input value={form.imei} onChange={(e) => set("imei", e.target.value)} style={inp} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={lab}>Firmware version</label><input value={form.firmware_version} onChange={(e) => set("firmware_version", e.target.value)} style={inp} /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button onClick={() => navigate("/gateways")} style={btnSecondary} disabled={busy}>Cancel</button>
          <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Saving…" : "Add to inventory"}</button>
        </div>
      </div>
    </div>
  );
};

const lab: React.CSSProperties = { display: "block", fontSize: 12, color: "#4b5563", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 };
const btnPrimary: React.CSSProperties = { background: "#111827", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 };
const btnSecondary: React.CSSProperties = { background: "#f3f4f6", color: "#111827", border: "1px solid #d1d5db", padding: "8px 14px", borderRadius: 6, cursor: "pointer" };

export default GatewayNew;
