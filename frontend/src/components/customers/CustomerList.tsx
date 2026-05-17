import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import customerService from "../services/customerService";
import ConfirmDestructiveModal from "../shared/ConfirmDestructiveModal";

const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [toDelete, setToDelete] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await customerService.listCustomers(); setRows(r.data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter((r: any) =>
      (r.company_name ?? r.title ?? "").toLowerCase().includes(s) ||
      (r.owner_name ?? r.firstName ?? "").toLowerCase().includes(s) ||
      (r.email ?? "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await customerService.deleteCustomer(String(toDelete.ID));
      toast.success("Customer deleted");
      setToDelete(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    }
  };

  return (
    <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>Customers</h2>
        <button onClick={() => navigate("/customers/new")} style={btnPrimary}>+ Add Customer</button>
      </div>
      <input
        type="text" placeholder="Search company / owner / email"
        value={q} onChange={(e) => setQ(e.target.value)}
        style={{ width: "100%", maxWidth: 480, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, marginBottom: 14, fontSize: 14 }}
      />

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={th}>Company</th>
              <th style={th}>Owner</th>
              <th style={th}>Email</th>
              <th style={th}>Tier</th>
              <th style={th}>Created</th>
              <th style={{ ...th, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} style={{ ...td, color: "#9ca3af" }}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, color: "#9ca3af" }}>
                {rows.length === 0 ? "No customers yet — click Add Customer to begin" : "No matches"}
              </td></tr>
            )}
            {filtered.map((c: any) => (
              <tr key={c.ID} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={td}>
                  <Link to={`/customers/${c.ID}`} style={{ color: "#1d4ed8", fontWeight: 500 }}>
                    {c.company_name ?? c.title}
                  </Link>
                </td>
                <td style={td}>{c.owner_name ?? c.firstName ?? "—"}</td>
                <td style={td}>{c.email ?? c.emailID ?? "—"}</td>
                <td style={td}>{c.pricing_tier ?? "—"}</td>
                <td style={td}>{c.logID ? new Date(c.logID).toLocaleDateString() : "—"}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button onClick={() => setToDelete(c)} style={btnDanger}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDestructiveModal
        open={!!toDelete}
        title={`Delete customer ${toDelete?.company_name ?? toDelete?.title ?? ""}?`}
        description="This soft-deletes the customer. Their vehicles, gateways, drivers, and users are hidden from default lists but the rows remain in the database. Reversible by an engineer."
        confirmationText="DELETE"
        confirmLabel="Soft-delete customer"
        onCancel={() => setToDelete(null)}
        onConfirm={onDelete}
      />
    </div>
  );
};

const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#4b5563", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: "12px 14px", color: "#111827" };
const btnPrimary: React.CSSProperties = { background: "#111827", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 };
const btnDanger: React.CSSProperties = { background: "transparent", color: "#dc2626", border: "1px solid #fecaca", padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12 };

export default CustomerList;
