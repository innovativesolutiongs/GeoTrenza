import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import gatewayService from "../services/gatewayService";
import ConfirmDestructiveModal from "../shared/ConfirmDestructiveModal";
import GatewayFormModal from "./GatewayFormModal";

const STATUSES = ["all","IN_STOCK","ASSIGNED","ACTIVE","INACTIVE","RETURNED","DECOMMISSIONED"];

const GatewayList: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("all");
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  const load = () => gatewayService.listGateways().then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => status === "all" ? rows : rows.filter((r) => r.inventory_status === status), [rows, status]);

  return (
    <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>Gateways</h2>
        <button onClick={() => navigate("/gateways/new")} style={btnPrimary}>+ Add Gateway</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {STATUSES.map((s) => (
          <button
            key={s} onClick={() => setStatus(s)}
            style={{
              padding: "6px 12px", borderRadius: 16, fontSize: 12,
              border: status === s ? "1px solid #111827" : "1px solid #d1d5db",
              background: status === s ? "#111827" : "#fff",
              color: status === s ? "#fff" : "#374151", cursor: "pointer",
            }}
          >{s.replace("_", " ").toLowerCase()}</button>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead><tr style={{ background: "#f9fafb" }}>
            {["Terminal","Model","Type","Status","Customer","Vehicle","Last seen",""].map((c) =>
              <th key={c} style={th}>{c}</th>)}
          </tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} style={{ ...td, color: "#9ca3af" }}>No gateways</td></tr>}
            {filtered.map((g) => (
              <tr key={g.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={td}>{g.terminal_id}</td>
                <td style={td}>{g.model ?? "—"}</td>
                <td style={td}>{g.device_type}</td>
                <td style={td}>{g.inventory_status}</td>
                <td style={td}>{g.account_id ?? "—"}</td>
                <td style={td}>{g.vehicle_id ?? "—"}</td>
                <td style={td}>{g.last_seen_at ? new Date(g.last_seen_at).toLocaleString() : "—"}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button onClick={() => setEditing(g)} style={btnLinkSmall}>Edit</button>{" "}
                  <button onClick={() => setToDelete(g)} style={btnDangerSmall}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <GatewayFormModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <ConfirmDestructiveModal
        open={!!toDelete}
        title={`Delete gateway ${toDelete?.terminal_id}?`}
        description="Soft-deletes the gateway from the inventory. The row remains in the database but is hidden from listings."
        confirmationText="DELETE"
        confirmLabel="Soft-delete"
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          try {
            await gatewayService.deleteGateway(String(toDelete.id));
            toast.success("Gateway deleted");
            setToDelete(null); load();
          } catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed"); }
        }}
      />
    </div>
  );
};

const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#4b5563", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: "12px 14px", color: "#111827" };
const btnPrimary: React.CSSProperties = { background: "#111827", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 };
const btnDangerSmall: React.CSSProperties = { background: "transparent", color: "#dc2626", border: "1px solid #fecaca", padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11 };
const btnLinkSmall: React.CSSProperties = { background: "transparent", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11 };

export default GatewayList;
