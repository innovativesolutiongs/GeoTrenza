import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { updateDevice } from "../store/deviceSlice";
import { toast } from "react-toastify";
import { ENABLE_MUTATIONS } from "../config/features";
import MutationsDisabledNotice from "../utils/MutationsDisabledNotice";

interface DevicePayload {
    deviceNo: string;
    deviceName: string;
    statusID: string;
}

const EditDevice: React.FC = () => {
    if (!ENABLE_MUTATIONS) {
        return <MutationsDisabledNotice resourceLabel="Device" backTo="/devicemaster" />;
    }

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    const device = location.state?.device;

    const [form, setForm] = useState<DevicePayload>({
        deviceNo: device?.terminal_id || "",
        deviceName: device?.model || "",
        statusID: "1",
    });

    if (!device) {
        return <div style={{ padding: 20 }}>No device data found</div>;
    }

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({
            ...form,
            [e.target.name]:
                e.target.name === "statusID"
                    ? Number(e.target.value)
                    : e.target.value,
        });
    };
    const handleSubmit = async () => {
        try {
            const payload = {
                id: device.id,
                data: form,
            };

            // console.log("UPDATE REQUEST →", payload);

            const result = await dispatch(updateDevice(payload) as any).unwrap();

            console.log("UPDATE RESPONSE →", result);

            toast.success("Device updated successfully");
        } catch (err: any) {
            console.log("UPDATE ERROR →", err);
            toast.error(err || "Update failed");
        }
    };


    return (
        <div style={container}>
            <h2 style={title}></h2>
            <div style={headerRow}>
                <div style={breadcrumb}>
                    <b>Masters</b> &nbsp;&gt;&nbsp; Device Master : <b>Edit</b>
                </div>

                <div style={headerActions}>
                    <button style={darkBtn} onClick={() => navigate("/devicemaster")}>
                        View All
                    </button>
                </div>
            </div>

            <div style={card}>
                <div style={row}>
                    <div style={field}>
                        <label>Device No *</label>
                        <input
                            name="deviceNo"
                            value={form.deviceNo}
                            onChange={handleChange}
                            style={input}
                        />
                    </div>

                    <div style={field}>
                        <label>Device Name *</label>
                        <input
                            name="deviceName"
                            value={form.deviceName}
                            onChange={handleChange}
                            style={input}
                        />
                    </div>

                    <div style={field}>
                        <label>Status</label>
                        <select
                            name="statusID"
                            value={form.statusID}
                            onChange={handleChange}
                            style={input}
                        >
                            <option value={1}>Active</option>
                            <option value={0}>Inactive</option>
                        </select>
                    </div>
                </div>

                <button style={saveBtn} onClick={handleSubmit}>
                    Update Device
                </button>
            </div>
        </div>
    );
};

export default EditDevice;

/* ===== styles (same design language as your list page) ===== */

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

const headerRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
};

const container: React.CSSProperties = {
    padding: "25px",
    backgroundColor: "#f4f6f9",
    minHeight: "100vh",
};

const title: React.CSSProperties = {
    marginBottom: "20px",
    fontWeight: 600,
    color: "#2c3e50",
};

const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: "8px",
    padding: "25px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const row: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "20px",
    marginBottom: "20px",
};

const field: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
};

const input: React.CSSProperties = {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ced4da",
    marginTop: "5px",
};

const saveBtn: React.CSSProperties = {
    background: "#007bff",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "6px",
    cursor: "pointer",
};
