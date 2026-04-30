import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchAllocations, deleteAllocation } from "../store/allocationslice";
import { fetchCustomers } from "../store/customerSlice";
import { fetchTrucks } from "../store/truckSlice";
import { fetchDevices } from "../store/deviceSlice";
import type { RootState, AppDispatch } from "../store";
import { toast } from "react-toastify";

const AllocationMaster: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  /* ================= PAGINATION ================= */
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  /* ================= FILTER ================= */
  const [selectedCustomer, setSelectedCustomer] =
    React.useState<string>("all");

  /* ================= REDUX ================= */
  const allocations = useSelector(
    (state: RootState) => state.allocation.items || []
  );

  const allocationLoading = useSelector(
    (state: RootState) => state.allocation.loading || false
  );

  const customers = useSelector(
    (state: RootState) => state.customers.items || []
  );

  const devices = useSelector((state: RootState) => state.device.devices || []);
  const trucks = useSelector((state: RootState) => state.truck.trucks || []);

  const user = useSelector((state: RootState) => state.login.userInfo);
  const compID = user?.compID;

  /* ================= FETCH ================= */
  useEffect(() => {
    if (compID) {
      dispatch(fetchCustomers(compID) as any);
      dispatch(fetchTrucks());
      dispatch(fetchDevices());
    }
    dispatch(fetchAllocations() as any);
  }, [dispatch, compID]);

  /* Reset page when filter changes */
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCustomer]);

  /* ================= DELETE ================= */
  const handleDelete = (id: number) => {
    const toastId = toast.info(
      <div>
        <div>Delete this allocation?</div>
        <div className="mt-2 d-flex gap-2">
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={async () => {
              try {
                await dispatch(deleteAllocation(id)).unwrap();
                toast.dismiss(toastId);
                toast.success("Allocation deleted successfully");
              } catch (err: any) {
                toast.dismiss(toastId);
                toast.error(err || "Failed to delete allocation");
              }
            }}
          >
            Yes
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => toast.dismiss(toastId)}
          >
            Cancel
          </button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false }
    );
  };

  /* ================= HELPERS ================= */
  const getCustomerName = (id: number | string) => {
    const customer = customers.find((c: any) => Number(c.ID) === Number(id));
    return customer ? customer.title : "Unknown";
  };

  const getdeviceID = (id: number | string) => {
    const device = devices.find(
      (d: any) => Number(d.device_ID) === Number(id)
    );
    return device ? device.deviceNo : "Unknown";
  };

  const gettruckID = (id: number | string) => {
    const truck = trucks.find((t: any) => Number(t.ID) === Number(id));
    return truck ? truck.truckNo : "Unknown";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? dateStr
      : date.toLocaleDateString("en-GB");
  };

  /* ================= FILTER LOGIC ================= */
  const filteredAllocations =
    selectedCustomer === "all"
      ? allocations
      : allocations.filter(
          (a: any) => Number(a.customerID) === Number(selectedCustomer)
        );

  /* ================= PAGINATION LOGIC ================= */
  const totalItems = filteredAllocations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAllocations = filteredAllocations.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  /* ================= UI ================= */
  return (
    <div style={container}>
      {/* ===== FILTER BAR ===== */}
      <div className="mb-3">
        <label className="me-2 fw-semibold">Filter by Customer:</label>

        <select
          className="form-select"
          style={{ width: "250px", display: "inline-block" }}
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
        >
          <option value="all">All Customers</option>
          {customers.map((c: any) => (
            <option key={c.ID} value={c.ID}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <h2 style={title}>Allocation Master</h2>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="fw-bold fs-5">Masters</span>
          <span className="mx-2 text-muted">&gt;</span>
          <span className="text-muted">Allocation Master</span>
        </div>

        <div>
          <button
            className="btn btn-dark me-2"
            onClick={() => navigate("/allocationmaster")}
          >
            View All
          </button>
          <button
            className="btn btn-dark"
            onClick={() => navigate("/createallocationmaster")}
          >
            Create New
          </button>
        </div>
      </div>

      <div style={card}>
        {allocationLoading ? (
          <div style={loadingStyle}>Loading...</div>
        ) : (
          <>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Sr No</th>
                  <th style={th}>Allocation Date</th>
                  <th style={th}>Customer</th>
                  <th style={th}>Truck No</th>
                  <th style={th}>Device No</th>
                  <th style={thCenter}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={noData}>
                      No allocations found
                    </td>
                  </tr>
                ) : (
                  paginatedAllocations.map((allocation: any, index: number) => (
                    <tr
                      key={allocation.ID}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#f8f9fa",
                      }}
                    >
                      <td style={td}>{startIndex + index + 1}</td>
                      <td style={td}>{formatDate(allocation.dateID)}</td>
                      <td style={td}>
                        {getCustomerName(allocation.customerID)}
                      </td>
                      <td style={td}>{gettruckID(allocation.truckID)}</td>
                      <td style={td}>{getdeviceID(allocation.deviceID)}</td>
                      <td style={tdCenter}>
                        <button
                          style={deleteBtn}
                          onClick={() => handleDelete(allocation.recID)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ===== PAGINATION BAR ===== */}
            <div style={paginationBar}>
              <div>
                Showing{" "}
                {totalItems === 0
                  ? 0
                  : Math.min(itemsPerPage, totalItems - startIndex)}{" "}
                of {totalItems} entries
              </div>

              <div>
                <button
                  className="btn btn-light me-2"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </button>

                <button className="btn btn-dark me-2">{currentPage}</button>

                <button
                  className="btn btn-light"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => p + 1)}
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

export default AllocationMaster;

/* ===================== STYLES ===================== */
const container: React.CSSProperties = {
  padding: "25px",
  backgroundColor: "#f4f6f9",
  minHeight: "100vh",
  fontFamily: "Segoe UI, sans-serif",
};

const title: React.CSSProperties = {
  marginBottom: "20px",
  fontWeight: 600,
  color: "#2c3e50",
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

const paginationBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderTop: "1px solid #dee2e6",
};
