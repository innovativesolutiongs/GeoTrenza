import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import customerService from "../services/customerService";
import type { CustomerPayload } from "../services/customerService";

const CustomerNew: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<CustomerPayload>({
    company_name: "", owner_name: "", email: "", phone: "",
    pricing_tier: "Basic",
  });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ id: string; email: string; password: string } | null>(null);

  const set = (k: keyof CustomerPayload, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.company_name || !form.owner_name || !form.email || !form.phone) {
      toast.error("Company, owner, email, phone are required");
      return;
    }
    setBusy(true);
    try {
      const r = await customerService.createCustomer(form);
      setSuccess({
        id: r.data.customer.ID,
        email: r.data.admin_user.email,
        password: r.data.generated_password,
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Create failed");
    } finally { setBusy(false); }
  };

  const copyPassword = async () => {
    if (!success) return;
    try {
      await navigator.clipboard.writeText(success.password);
      toast.success("Password copied");
    } catch {
      toast.error("Copy failed — select manually");
    }
  };

  if (success) {
    return (
      <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
        <div style={{ maxWidth: 560, margin: "40px auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 24 }}>
          <h2 style={{ margin: 0, color: "#15803d" }}>Customer created!</h2>
          <p style={{ color: "#4b5563", marginTop: 8 }}>
            Share these credentials with the customer admin out-of-band. The password is shown <strong>only once</strong>.
          </p>
          <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Admin email</div>
            <div style={{ fontWeight: 500, fontSize: 16 }}>{success.email}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 14 }}>Generated password</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <code style={{ background: "#fff", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 16, flex: 1 }}>{success.password}</code>
              <button onClick={copyPassword} style={btnSecondary}>Copy</button>
            </div>
          </div>
          <div style={{ marginTop: 20, padding: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
            ⚠️ This password is the only copy. Save it before navigating away — there's no retrieval flow.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <button onClick={() => navigate("/customers")} style={btnSecondary}>Back to list</button>
            <button onClick={() => navigate(`/customers/${success.id}`)} style={btnPrimary}>Continue to customer →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>Add Customer</h2>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 }}>
          <div style={grid}>
            {field("Company name *", form.company_name, (v) => set("company_name", v))}
            {field("Owner name *", form.owner_name, (v) => set("owner_name", v))}
            {field("Email *", form.email, (v) => set("email", v), "email")}
            {field("Phone *", form.phone, (v) => set("phone", v))}
            <div>
              <label style={lab}>Pricing tier</label>
              <select value={form.pricing_tier} onChange={(e) => set("pricing_tier", e.target.value)} style={inp}>
                <option>Basic</option><option>Pro</option><option>Enterprise</option>
              </select>
            </div>
            {field("Billing email", form.billing_email ?? "", (v) => set("billing_email", v), "email")}
            {field("Billing contact", form.billing_contact_name ?? "", (v) => set("billing_contact_name", v))}
            {field("Address line 1", form.address_line1 ?? "", (v) => set("address_line1", v))}
            {field("Address line 2", form.address_line2 ?? "", (v) => set("address_line2", v))}
            {field("City", form.city ?? "", (v) => set("city", v))}
            {field("State", form.state ?? "", (v) => set("state", v))}
            {field("Postal code", form.postal_code ?? "", (v) => set("postal_code", v))}
            {field("Country", form.country ?? "", (v) => set("country", v))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
            <button onClick={() => navigate("/customers")} style={btnSecondary} disabled={busy}>Cancel</button>
            <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Creating…" : "Create customer"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const field = (label: string, value: string, onChange: (v: string) => void, type: string = "text") => (
  <div>
    <label style={lab}>{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inp} />
  </div>
);
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const lab: React.CSSProperties = { display: "block", fontSize: 12, color: "#4b5563", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 };
const btnPrimary: React.CSSProperties = { background: "#111827", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 };
const btnSecondary: React.CSSProperties = { background: "#f3f4f6", color: "#111827", border: "1px solid #d1d5db", padding: "8px 14px", borderRadius: 6, cursor: "pointer" };

export default CustomerNew;
