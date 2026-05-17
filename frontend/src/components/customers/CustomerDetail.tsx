import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import customerService from "../services/customerService";
import gatewayService from "../services/gatewayService";
import ConfirmDestructiveModal from "../shared/ConfirmDestructiveModal";

type Tab = "overview" | "vehicles" | "gateways" | "drivers" | "users" | "billing";

const VEHICLE_TYPES = ["Truck","Trailer","Car","Van","Bus","Generator","Container","Heavy Equipment","Other"];

const CustomerDetail: React.FC = () => {
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [customer, setCustomer] = useState<any | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);

  // Modal flags
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [assignGwOpen, setAssignGwOpen] = useState(false);
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [unassignGw, setUnassignGw] = useState<any | null>(null);

  useEffect(() => {
    customerService.getCustomer(id).then((r) => setCustomer(r.data)).catch(() => setCustomer(null));
    customerService.listVehiclesForCustomer(id).then((r) => setVehicles(r.data));
    gatewayService.listGateways({ account_id: id }).then((r) => setGateways(r.data));
    customerService.listDriversForCustomer(id).then((r) => setDrivers(r.data));
    customerService.listUsers(id).then((r) => setUsers(r.data));
  }, [id, refresh]);

  if (!customer) {
    return <div style={{ padding: 24 }}><Link to="/customers">← Customers</Link><div style={{ marginTop: 12 }}>Loading customer {id}…</div></div>;
  }

  const reload = () => setRefresh((n) => n + 1);

  return (
    <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
      <Link to="/customers" style={{ color: "#6b7280", fontSize: 12 }}>← Customers</Link>
      <h2 style={{ margin: "8px 0 4px" }}>{customer.company_name ?? customer.title}</h2>
      <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        {(customer.owner_name ?? customer.firstName ?? "—")} · {(customer.email ?? customer.emailID ?? "—")}
        {customer.pricing_tier && <> · <span style={{ background: "#eef2ff", color: "#3730a3", padding: "2px 8px", borderRadius: 12, fontSize: 12 }}>{customer.pricing_tier}</span></>}
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", marginBottom: 18 }}>
        {(["overview","vehicles","gateways","drivers","users","billing"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              borderBottom: tab === t ? "2px solid #111827" : "2px solid transparent",
              color: tab === t ? "#111827" : "#6b7280", fontWeight: tab === t ? 600 : 400,
              textTransform: "capitalize", fontSize: 14,
            }}
          >{t}{t === "vehicles" || t === "gateways" || t === "drivers" || t === "users" ? ` (${
            t === "vehicles" ? vehicles.length :
            t === "gateways" ? gateways.length :
            t === "drivers" ? drivers.length : users.length
          })` : ""}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {[
            ["Vehicles", vehicles.length],
            ["Gateways", gateways.length],
            ["Drivers", drivers.length],
            ["Users", users.length],
          ].map(([l, v]) => (
            <div key={l as string} style={card}>
              <div style={{ color: "#6b7280", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
              <div style={{ fontWeight: 700, fontSize: 26 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "vehicles" && (
        <Section
          title="Vehicles"
          addLabel="+ Add Vehicle"
          onAdd={() => setAddVehicleOpen(true)}
        >
          <Table cols={["Name", "Registration", "Type", "Year", "Status"]}
                 rows={vehicles.map((v) => [
                   <Link to={`/vehicles/${v.id}`} style={{ color: "#1d4ed8" }}>{v.name ?? v.registration_no}</Link>,
                   v.registration_no, v.vehicle_type, v.year ?? "—", v.status,
                 ])} empty="No vehicles yet" />
        </Section>
      )}

      {tab === "gateways" && (
        <Section
          title="Gateways"
          addLabel="Assign Gateway from Inventory"
          onAdd={() => setAssignGwOpen(true)}
        >
          <Table cols={["Terminal", "Model", "Type", "Vehicle", "Status", ""]}
                 rows={gateways.map((g) => [
                   g.terminal_id, g.model ?? "—", g.device_type,
                   g.vehicle_id ? `Vehicle ${g.vehicle_id}` : <em style={{ color: "#9ca3af" }}>unassigned</em>,
                   g.inventory_status,
                   <button onClick={() => setUnassignGw(g)} style={btnDangerSmall}>Unassign</button>,
                 ])} empty="No gateways assigned to this customer" />
        </Section>
      )}

      {tab === "drivers" && (
        <Section title="Drivers" addLabel="+ Add Driver" onAdd={() => setAddDriverOpen(true)}>
          <Table cols={["Name", "Phone", "License", "Vehicle", "Status"]}
                 rows={drivers.map((d) => [
                   d.name, d.phone ?? "—", d.license_number ?? "—",
                   d.vehicle_id ? `Vehicle ${d.vehicle_id}` : "—", d.status,
                 ])} empty="No drivers yet" />
        </Section>
      )}

      {tab === "users" && (
        <Section title="Users" addLabel="+ Add User" onAdd={() => setAddUserOpen(true)}>
          <Table cols={["Name", "Email", "Role", "Last login"]}
                 rows={users.map((u) => [
                   u.name ?? "—", u.email, u.role ?? "—",
                   u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never",
                 ])} empty="No users yet" />
        </Section>
      )}

      {tab === "billing" && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Billing</h3>
          <p><strong>Pricing tier:</strong> {customer.pricing_tier ?? "—"}</p>
          <p><strong>Billing email:</strong> {customer.billing_email ?? customer.email ?? "—"}</p>
          <p><strong>Billing contact:</strong> {customer.billing_contact_name ?? "—"}</p>
          <button disabled style={{ ...btnSecondary, opacity: 0.5, cursor: "not-allowed" }}>Manage billing — Coming in Stage 5</button>
        </div>
      )}

      {addVehicleOpen && (
        <VehicleFormModal customerId={id} onClose={() => setAddVehicleOpen(false)} onSaved={() => { setAddVehicleOpen(false); reload(); }} />
      )}
      {assignGwOpen && (
        <AssignGatewayModal customerId={id} onClose={() => setAssignGwOpen(false)} onAssigned={() => { setAssignGwOpen(false); reload(); }} />
      )}
      {addDriverOpen && (
        <DriverFormModal customerId={id} vehicles={vehicles} onClose={() => setAddDriverOpen(false)} onSaved={() => { setAddDriverOpen(false); reload(); }} />
      )}
      {addUserOpen && (
        <UserFormModal customerId={id} onClose={() => setAddUserOpen(false)} onSaved={() => { setAddUserOpen(false); reload(); }} />
      )}

      <ConfirmDestructiveModal
        open={!!unassignGw}
        title="Unassign gateway from this customer?"
        description={`This stops tracking data flowing to ${customer.company_name ?? customer.title}'s account. The gateway returns to inventory and can be reassigned.`}
        confirmationText="UNASSIGN"
        confirmLabel="Unassign gateway"
        onCancel={() => setUnassignGw(null)}
        onConfirm={async () => {
          try {
            await gatewayService.unassignGatewayFromCustomer(String(unassignGw.id));
            toast.success("Gateway unassigned");
            setUnassignGw(null);
            reload();
          } catch (e: any) {
            toast.error(e?.response?.data?.message ?? "Failed");
          }
        }}
      />
    </div>
  );
};

// ============ Helpers ============

const Section: React.FC<{ title: string; addLabel: string; onAdd: () => void; children: React.ReactNode }> = ({ title, addLabel, onAdd, children }) => (
  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
    <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between" }}>
      <strong>{title}</strong>
      <button onClick={onAdd} style={btnPrimary}>{addLabel}</button>
    </div>
    {children}
  </div>
);

const Table: React.FC<{ cols: string[]; rows: React.ReactNode[][]; empty: string }> = ({ cols, rows, empty }) => (
  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
    <thead><tr style={{ background: "#f9fafb" }}>{cols.map((c) => <th key={c} style={th}>{c}</th>)}</tr></thead>
    <tbody>
      {rows.length === 0 ? <tr><td colSpan={cols.length} style={{ ...td, color: "#9ca3af" }}>{empty}</td></tr>
        : rows.map((r, i) => (
          <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
            {r.map((cell, j) => <td key={j} style={td}>{cell}</td>)}
          </tr>
        ))}
    </tbody>
  </table>
);

// ============ Modals (inline to ship faster) ============

const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div style={overlay} onClick={onClose}>
    <div style={modalCard} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "#6b7280" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const VehicleFormModal: React.FC<{ customerId: string; onClose: () => void; onSaved: () => void }> = ({ customerId, onClose, onSaved }) => {
  const [form, setForm] = useState({
    registration_no: "", name: "", vehicle_type: "Truck",
    year: "", make: "", model: "", manufacturer: "", vin: "",
    // type-specific metadata flat in form, packaged into JSONB on submit
    gvw_kg: "", axle_count: "", body_type: "",
    trailer_length_m: "", trailer_type: "",
    fuel_type: "", seats: "",
    power_kw: "",
    container_size: "", refrigerated: "false",
    equipment_type: "", capacity: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.registration_no || !form.name) {
      toast.error("Name and registration are required");
      return;
    }
    const meta: any = {};
    if (form.vehicle_type === "Truck") {
      if (form.gvw_kg) meta.gvw_kg = Number(form.gvw_kg);
      if (form.axle_count) meta.axle_count = Number(form.axle_count);
      if (form.body_type) meta.body_type = form.body_type;
    } else if (form.vehicle_type === "Trailer") {
      if (form.trailer_length_m) meta.trailer_length_m = Number(form.trailer_length_m);
      if (form.trailer_type) meta.trailer_type = form.trailer_type;
    } else if (form.vehicle_type === "Car" || form.vehicle_type === "Van") {
      if (form.fuel_type) meta.fuel_type = form.fuel_type;
      if (form.seats) meta.seats = Number(form.seats);
    } else if (form.vehicle_type === "Generator") {
      if (form.power_kw) meta.power_kw = Number(form.power_kw);
      if (form.fuel_type) meta.fuel_type = form.fuel_type;
    } else if (form.vehicle_type === "Container") {
      if (form.container_size) meta.container_size = form.container_size;
      meta.refrigerated = form.refrigerated === "true";
    } else if (form.vehicle_type === "Heavy Equipment") {
      if (form.equipment_type) meta.equipment_type = form.equipment_type;
      if (form.capacity) meta.capacity = form.capacity;
    } else if (form.vehicle_type === "Other") {
      if (form.description) meta.description = form.description;
    }

    setBusy(true);
    try {
      await customerService.createVehicleForCustomer(customerId, {
        registration_no: form.registration_no,
        name: form.name,
        vehicle_type: form.vehicle_type,
        year: form.year ? Number(form.year) : null,
        make: form.make || null,
        model: form.model || null,
        manufacturer: form.manufacturer || null,
        vin: form.vin || null,
        metadata: Object.keys(meta).length ? meta : null,
        status: "active",
      });
      toast.success("Vehicle added");
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally { setBusy(false); }
  };

  const fld = (label: string, key: keyof typeof form, type: string = "text") => (
    <div><label style={lab}>{label}</label><input type={type} value={(form as any)[key]} onChange={(e) => set(key as string, e.target.value)} style={inp} /></div>
  );

  return (
    <ModalShell title="Add Vehicle" onClose={onClose}>
      <div style={grid2}>
        <div>
          <label style={lab}>Vehicle type</label>
          <select value={form.vehicle_type} onChange={(e) => set("vehicle_type", e.target.value)} style={inp}>
            {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        {fld("Name *", "name")}
        {fld("Registration *", "registration_no")}
        {fld("Year", "year", "number")}
        {fld("Make", "make")}
        {fld("Model", "model")}
        {fld("Manufacturer", "manufacturer")}
        {fld("VIN", "vin")}
      </div>
      {form.vehicle_type === "Truck" && (
        <div style={{ marginTop: 14, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Truck-specific</div>
          <div style={grid2}>
            {fld("GVW (kg)", "gvw_kg", "number")}
            {fld("Axle count", "axle_count", "number")}
            {fld("Body type", "body_type")}
          </div>
        </div>
      )}
      {form.vehicle_type === "Trailer" && (
        <div style={{ marginTop: 14, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
          <div style={grid2}>
            {fld("Length (m)", "trailer_length_m", "number")}
            <div><label style={lab}>Trailer type</label>
              <select value={form.trailer_type} onChange={(e) => set("trailer_type", e.target.value)} style={inp}>
                <option value="">—</option>
                <option value="flatbed">Flatbed</option>
                <option value="box">Box</option>
                <option value="reefer">Reefer</option>
                <option value="tanker">Tanker</option>
              </select>
            </div>
          </div>
        </div>
      )}
      {(form.vehicle_type === "Car" || form.vehicle_type === "Van") && (
        <div style={{ marginTop: 14, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
          <div style={grid2}>{fld("Fuel type", "fuel_type")}{fld("Seats", "seats", "number")}</div>
        </div>
      )}
      {form.vehicle_type === "Generator" && (
        <div style={{ marginTop: 14, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
          <div style={grid2}>{fld("Power (kW)", "power_kw", "number")}{fld("Fuel type", "fuel_type")}</div>
        </div>
      )}
      {form.vehicle_type === "Container" && (
        <div style={{ marginTop: 14, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
          <div style={grid2}>
            <div><label style={lab}>Size</label><select value={form.container_size} onChange={(e) => set("container_size", e.target.value)} style={inp}><option value="">—</option><option>20ft</option><option>40ft</option></select></div>
            <div><label style={lab}>Refrigerated</label><select value={form.refrigerated} onChange={(e) => set("refrigerated", e.target.value)} style={inp}><option value="false">No</option><option value="true">Yes</option></select></div>
          </div>
        </div>
      )}
      {form.vehicle_type === "Heavy Equipment" && (
        <div style={{ marginTop: 14, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
          <div style={grid2}>{fld("Equipment type", "equipment_type")}{fld("Capacity", "capacity")}</div>
        </div>
      )}
      {form.vehicle_type === "Other" && (
        <div style={{ marginTop: 14 }}>
          <label style={lab}>Description</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} style={{ ...inp, minHeight: 60 }} />
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <button onClick={onClose} style={btnSecondary} disabled={busy}>Cancel</button>
        <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Saving…" : "Save vehicle"}</button>
      </div>
    </ModalShell>
  );
};

const AssignGatewayModal: React.FC<{ customerId: string; onClose: () => void; onAssigned: () => void }> = ({ customerId, onClose, onAssigned }) => {
  const [inv, setInv] = useState<any[]>([]);
  const [sel, setSel] = useState<string>("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    gatewayService.listGateways({ inventory_status: "IN_STOCK" }).then((r) => setInv(r.data));
  }, []);
  const submit = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      await gatewayService.assignGatewayToCustomer(sel, customerId);
      toast.success("Gateway assigned to customer");
      onAssigned();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally { setBusy(false); }
  };
  return (
    <ModalShell title="Assign Gateway from Inventory" onClose={onClose}>
      <p style={{ marginTop: 0, color: "#6b7280", fontSize: 13 }}>Showing {inv.length} gateways currently IN_STOCK.</p>
      <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ ...inp, marginTop: 8 }}>
        <option value="">— pick a gateway —</option>
        {inv.map((g) => (
          <option key={g.id} value={g.id}>
            {g.terminal_id} · {g.model ?? "—"} · {g.device_type}
          </option>
        ))}
      </select>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <button onClick={onClose} style={btnSecondary} disabled={busy}>Cancel</button>
        <button onClick={submit} disabled={!sel || busy} style={{ ...btnPrimary, opacity: sel && !busy ? 1 : 0.55 }}>Assign</button>
      </div>
    </ModalShell>
  );
};

const DriverFormModal: React.FC<{ customerId: string; vehicles: any[]; onClose: () => void; onSaved: () => void }> = ({ customerId, vehicles, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: "", phone: "", email: "", license_number: "", license_expiry: "", hire_date: "", vehicle_id: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setBusy(true);
    try {
      await customerService.createDriverForCustomer(customerId, {
        name: form.name, phone: form.phone || null, email: form.email || null,
        license_number: form.license_number || null,
        license_expiry: form.license_expiry || null,
        hire_date: form.hire_date || null,
        vehicle_id: form.vehicle_id || null,
      });
      toast.success("Driver added");
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally { setBusy(false); }
  };
  return (
    <ModalShell title="Add Driver" onClose={onClose}>
      <div style={grid2}>
        <div><label style={lab}>Name *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} style={inp} /></div>
        <div><label style={lab}>Phone</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inp} /></div>
        <div><label style={lab}>Email</label><input value={form.email} onChange={(e) => set("email", e.target.value)} style={inp} /></div>
        <div><label style={lab}>License #</label><input value={form.license_number} onChange={(e) => set("license_number", e.target.value)} style={inp} /></div>
        <div><label style={lab}>License expiry</label><input type="date" value={form.license_expiry} onChange={(e) => set("license_expiry", e.target.value)} style={inp} /></div>
        <div><label style={lab}>Hire date</label><input type="date" value={form.hire_date} onChange={(e) => set("hire_date", e.target.value)} style={inp} /></div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lab}>Initial vehicle assignment</label>
          <select value={form.vehicle_id} onChange={(e) => set("vehicle_id", e.target.value)} style={inp}>
            <option value="">— none —</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name ?? v.registration_no} · {v.registration_no}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <button onClick={onClose} style={btnSecondary} disabled={busy}>Cancel</button>
        <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Saving…" : "Add driver"}</button>
      </div>
    </ModalShell>
  );
};

const UserFormModal: React.FC<{ customerId: string; onClose: () => void; onSaved: () => void }> = ({ customerId, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState<{ email: string; password: string } | null>(null);
  const submit = async () => {
    if (!form.name || !form.email) { toast.error("Name and email required"); return; }
    setBusy(true);
    try {
      const r = await customerService.createUser({ account_id: customerId, name: form.name, email: form.email });
      setPw({ email: r.data.user.email, password: r.data.generated_password });
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed");
    } finally { setBusy(false); }
  };
  if (pw) {
    return (
      <ModalShell title="User created" onClose={() => { onSaved(); }}>
        <p>Share these credentials manually:</p>
        <div style={{ background: "#f9fafb", padding: 12, borderRadius: 8 }}>
          <div><strong>Email:</strong> {pw.email}</div>
          <div style={{ marginTop: 6 }}><strong>Password:</strong> <code>{pw.password}</code></div>
        </div>
        <p style={{ color: "#92400e", fontSize: 13, marginTop: 12 }}>Save it — this is the only copy.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={() => onSaved()} style={btnPrimary}>Done</button>
        </div>
      </ModalShell>
    );
  }
  return (
    <ModalShell title="Add User" onClose={onClose}>
      <div><label style={lab}>Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} /></div>
      <div style={{ marginTop: 10 }}><label style={lab}>Email *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inp} /></div>
      <div style={{ marginTop: 10 }}><label style={lab}>Role</label><select disabled style={inp}><option>CUSTOMER_ADMIN</option></select></div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <button onClick={onClose} style={btnSecondary} disabled={busy}>Cancel</button>
        <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Saving…" : "Add user"}</button>
      </div>
    </ModalShell>
  );
};

// ============ Styles ============
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18 };
const th: React.CSSProperties = { textAlign: "left", padding: "10px 14px", fontWeight: 600, color: "#4b5563", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: "12px 14px", color: "#111827" };
const btnPrimary: React.CSSProperties = { background: "#111827", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 13 };
const btnSecondary: React.CSSProperties = { background: "#f3f4f6", color: "#111827", border: "1px solid #d1d5db", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const btnDangerSmall: React.CSSProperties = { background: "transparent", color: "#dc2626", border: "1px solid #fecaca", padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5000 };
const modalCard: React.CSSProperties = { background: "#fff", padding: 22, borderRadius: 10, width: "min(640px, 92vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const lab: React.CSSProperties = { display: "block", fontSize: 12, color: "#4b5563", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14 };

export default CustomerDetail;
