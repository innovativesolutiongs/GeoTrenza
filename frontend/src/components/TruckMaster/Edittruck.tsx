import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { updateTruck } from "../store/truckSlice";
import type { AppDispatch } from "../store";
import { toast } from "react-toastify";
import { ENABLE_MUTATIONS } from "../config/features";
import MutationsDisabledNotice from "../utils/MutationsDisabledNotice";

/* ================= TYPES ================= */

type TruckForm = {
    truckNo: string;
    regoNo: string;
    modelNo: string;
    statusID: string;
};

/* ================= COMPONENT ================= */

const EditTruck = () => {
    if (!ENABLE_MUTATIONS) {
        return <MutationsDisabledNotice resourceLabel="Truck" backTo="/truckmaster" />;
    }

    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    const truck = location.state?.truck;

    const [form, setForm] = useState<TruckForm>({
        truckNo: "",
        regoNo: "",
        modelNo: "",
        statusID: "1",
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (truck) {
            setForm({
                truckNo: truck.name || "",
                regoNo: truck.registration_no || "",
                modelNo: truck.model || "",
                statusID: truck.status || "active",
            });
        }
    }, [truck]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                id: String(id),
                payload: form,
            };

            console.log("DISPATCH PAYLOAD →", payload);
            console.log("FORM DATA →", form);

            await dispatch(updateTruck(payload)).unwrap();

            toast.success("Truck updated successfully");
        } catch (err: any) {
            console.error("UPDATE ERROR →", err);
            toast.error(err || "Update failed");
        } finally {
            setSaving(false);
        }
    };



    if (!truck) return <div style={{ padding: 25 }}>Truck data not found</div>;

    return (
        <div style={page}>
            {/* ===== Header ===== */}
            <div style={headerRow}>
                <div style={breadcrumb}>
                    <b>Masters</b> &nbsp;&gt;&nbsp; Truck Master : <b>Edit</b>
                </div>

                <div style={headerActions}>
                    <button style={darkBtn} onClick={() => navigate("/truckmaster")}>
                        View All
                    </button>
                </div>
            </div>

            {/* ===== Form Card ===== */}
            <form style={card} onSubmit={handleSubmit}>
                <div style={grid}>
                    <div>
                        <label style={label}>Truck No *</label>
                        <input
                            style={input}
                            name="truckNo"
                            value={form.truckNo}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label style={label}>Rego No *</label>
                        <input
                            style={input}
                            name="regoNo"
                            value={form.regoNo}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label style={label}>Model No *</label>
                        <input
                            style={input}
                            name="modelNo"
                            value={form.modelNo}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div>
                        <label style={label}>statusID</label>
                        <select
                            style={input}
                            name="statusID"
                            value={form.statusID}
                            onChange={handleChange}
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <hr style={divider} />

                <button type="submit" style={primaryBtn} disabled={saving}>
                    {saving ? "Updating..." : "Update Master"}
                </button>
            </form>
        </div>
    );
};

export default EditTruck;

/* ================= STYLES ================= */

const page: React.CSSProperties = {
    padding: "25px",
    background: "#f4f6f9",
    minHeight: "100vh",
    fontFamily: "Segoe UI, sans-serif",
};

const headerRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
};

const breadcrumb: React.CSSProperties = {
    fontSize: "18px",
    color: "#2c3e50",
};

const headerActions: React.CSSProperties = {
    display: "flex",
    gap: "10px",
};

const darkBtn: React.CSSProperties = {
    background: "#212529",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
};

const card: React.CSSProperties = {
    background: "#fff",
    padding: "25px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
};

const label: React.CSSProperties = {
    display: "block",
    marginBottom: "6px",
    fontSize: "14px",
    fontWeight: 500,
};

const input: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "6px",
    border: "1px solid #ced4da",
};

const divider: React.CSSProperties = {
    margin: "20px 0",
    border: "none",
    borderTop: "1px solid #dee2e6",
};

const primaryBtn: React.CSSProperties = {
    background: "#0d6efd",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 500,
};
