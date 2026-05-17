import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { fetchDevices, deleteDevice } from "../store/deviceSlice";
import { fetchCustomerAllocations } from "../store/allocationslice";
import type { Device } from "../store/deviceSlice";
import { toast } from "react-toastify";

const DeviceMaster: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const devices: Device[] = useSelector((state: any) => state.device.devices);
  const loading: boolean = useSelector((state: any) => state.device.loading);

  const allocations = useSelector(
    (state: any) => state.allocation?.allocations || []
  );

  const user = useSelector((state: any) => state.login.userInfo);
  const userTY = user?.userTY;
  const customerID = user?.customerID;

  console.log("CustomerID:", customerID);
  console.log("Allocations:", allocations);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    dispatch(fetchDevices() as any);

    if (customerID) {
      dispatch(fetchCustomerAllocations(customerID) as any);
    }
  }, [dispatch, customerID]);

  /* ================= MATCH ALLOCATED DEVICES ================= */

  const allocatedDeviceIDs = (allocations || []).map((a: any) =>
    String(a.deviceID)
  );

  const filteredDevices =
    userTY === "AD"
      ? devices
      : devices.filter((device) =>
        allocatedDeviceIDs.includes(String(device.id))
      );

  /* ================= PAGINATION ================= */

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalItems = filteredDevices.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const paginatedDevices = filteredDevices.slice(startIndex, endIndex);

  /* ================= DELETE DEVICE ================= */

  const handleDelete = (ID: string) => {
    const toastId = toast.info(
      <div>
        <div>Delete this device?</div>

        <div className="mt-2 d-flex gap-2">
          <button
            className="btn btn-danger btn-sm"
            onClick={async () => {
              try {
                await dispatch(deleteDevice(ID) as any);
                toast.dismiss(toastId);
                toast.success("Device deleted successfully");
              } catch (err: any) {
                toast.dismiss(toastId);
                toast.error(err || "Failed to delete device");
              }
            }}
          >
            Yes
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => toast.dismiss(toastId)}
          >
            Cancel
          </button>
        </div>
      </div>,
      { autoClose: false }
    );
  };

  return (
    <div style={container}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="fw-bold fs-5">Masters</span>
          <span className="mx-2 text-muted">&gt;</span>
          <span className="text-muted">Device Master</span>
        </div>

        <div>
          <button
            className="btn btn-dark me-2"
            onClick={() => navigate("/devicemaster")}
          >
            View All
          </button>

          {userTY === "AD" && (
            <button
              className="btn btn-dark"
              onClick={() => navigate("/Createdevicemaster")}
            >
              Create New
            </button>
          )}
        </div>
      </div>

      <div style={card}>
        {loading ? (
          <div style={loadingStyle}>Loading...</div>
        ) : (
          <>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Sr No</th>
                  <th style={th}>Terminal ID</th>
                  <th style={th}>Model</th>
                  <th style={thCenter}>Last Seen</th>
                  {userTY === "AD" && <th style={thCenter}>Edit</th>}
                  {userTY === "AD" && <th style={thCenter}>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {paginatedDevices.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={noData}>
                      No devices found
                    </td>
                  </tr>
                ) : (
                  paginatedDevices.map((device, index) => (
                    <tr
                      key={device.id}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#f8f9fa",
                      }}
                    >
                      <td style={td}>{startIndex + index + 1}</td>

                      <td style={td}>{device.terminal_id}</td>

                      <td style={td}>{device.model ?? "—"}</td>

                      <td style={tdCenter}>
                        {device.last_seen_at
                          ? new Date(device.last_seen_at).toLocaleString()
                          : "—"}
                      </td>

                      {userTY === "AD" && (
                        <>
                          <td style={tdCenter}>
                            <Link
                              to={`/edit-device/${device.id}`}
                              state={{ device }}
                              style={{ textDecoration: "none" }}
                            >
                              ✏️
                            </Link>
                          </td>

                          <td style={tdCenter}>
                            <button
                              style={deleteBtn}
                              onClick={() => handleDelete(device.id)}
                            >
                              🗑️
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ================= PAGINATION ================= */}

            <div style={paginationContainer}>
              <div>
                Showing {Math.min(endIndex, totalItems)} of {totalItems} entries
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-light btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`btn btn-sm ${currentPage === i + 1 ? "btn-dark" : "btn-light"
                      }`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  className="btn btn-light btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeviceMaster;

/* ===================== STYLES ===================== */

const container: React.CSSProperties = {
  padding: "25px",
  backgroundColor: "#f4f6f9",
  minHeight: "100vh",
  fontFamily: "Segoe UI, sans-serif",
};

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: "8px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  overflow: "hidden",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const th: React.CSSProperties = {
  padding: "14px",
  textAlign: "left",
  backgroundColor: "#e9ecef",
  borderBottom: "2px solid #dee2e6",
  fontWeight: 600,
  fontSize: "14px",
};

const thCenter: React.CSSProperties = {
  ...th,
  textAlign: "center",
};

const td: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #dee2e6",
  fontSize: "14px",
};

const tdCenter: React.CSSProperties = {
  ...td,
  textAlign: "center",
};

const deleteBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: "16px",
  color: "red",
};

const loadingStyle: React.CSSProperties = {
  padding: "20px",
  textAlign: "center",
  fontSize: "16px",
};

const noData: React.CSSProperties = {
  textAlign: "center",
  padding: "20px",
};

const paginationContainer: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderTop: "1px solid #dee2e6",
  background: "#fff",
  fontSize: "14px",
};