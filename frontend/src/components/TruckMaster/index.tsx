import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchTrucks, deleteTruck } from "../store/truckSlice";
import { fetchCustomerAllocations } from "../store/allocationslice";
import type { Truck } from "../store/truckSlice";
import { toast } from "react-toastify";

const TruckMaster = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const trucks: Truck[] = useSelector((state: any) => state.truck.trucks);
  const loading: boolean = useSelector((state: any) => state.truck.loading);

  const allocations = useSelector(
    (state: any) => state.allocation?.allocations || []
  );

  const user = useSelector((state: any) => state.login.userInfo);
  const userTY = user?.userTY;
  const customerID = user?.customerID;

  /* ================= FETCH ================= */

  useEffect(() => {
    dispatch(fetchTrucks() as any);

    if (customerID) {
      dispatch(fetchCustomerAllocations(customerID) as any);
    }
  }, [dispatch, customerID]);

  /* ================= MATCH ALLOCATED TRUCKS ================= */

  const allocatedTruckIDs = allocations.map((a: any) =>
    String(a.truckID)
  );

  const filteredTrucks =
    userTY === "AD"
      ? trucks
      : trucks.filter((truck) =>
          allocatedTruckIDs.includes(String(truck.id))
        );

  /* ================= PAGINATION ================= */

  const pageSize = 10;
  const [page, setPage] = useState(1);

  const total = filteredTrucks.length;
  const totalPages = Math.ceil(total / pageSize);

  const paginatedTrucks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTrucks.slice(start, start + pageSize);
  }, [filteredTrucks, page]);

  useEffect(() => {
    setPage(1);
  }, [filteredTrucks]);

  /* ================= DELETE ================= */

  const handleDelete = (id: string) => {
    const toastId = toast.info(
      <div>
        <div>Delete this truck?</div>

        <div className="mt-2 d-flex gap-2">
          <button
            className="btn btn-danger btn-sm"
            onClick={async () => {
              try {
                await dispatch(deleteTruck(id) as any);
                toast.dismiss(toastId);
                toast.success("Truck deleted successfully");
              } catch (err: any) {
                toast.dismiss(toastId);
                toast.error(err || "Failed to delete truck");
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

  /* ================= UI ================= */

  return (
    <div style={container}>
      <h2 style={title}>Truck Master</h2>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="fw-bold fs-5">Masters</span>
          <span className="mx-2 text-muted">&gt;</span>
          <span className="text-muted">Truck Master</span>
        </div>

        <div>
          <button
            className="btn btn-dark me-2"
            onClick={() => navigate("/truckmaster")}
          >
            View All
          </button>

          {userTY === "AD" && (
            <button
              className="btn btn-dark"
              onClick={() => navigate("/createtruckmaster")}
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
                  <th style={th}>Name</th>
                  <th style={th}>Registration No</th>
                  <th style={th}>Model</th>
                  <th style={thCenter}>Status</th>

                  {userTY === "AD" && <th style={thCenter}>Edit</th>}
                  {userTY === "AD" && <th style={thCenter}>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {paginatedTrucks.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={noData}>
                      No data found
                    </td>
                  </tr>
                ) : (
                  paginatedTrucks.map((truck, index) => (
                    <tr
                      key={truck.id}
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? "#ffffff" : "#f8f9fa",
                      }}
                    >
                      <td style={td}>{(page - 1) * pageSize + index + 1}</td>
                      <td style={td}>{truck.name ?? "—"}</td>
                      <td style={td}>{truck.registration_no}</td>
                      <td style={td}>{truck.model ?? "—"}</td>

                      <td style={tdCenter}>
                        <span
                          style={
                            truck.status === "active"
                              ? activeStatus
                              : { color: "#dc3545", fontWeight: 600 }
                          }
                        >
                          {truck.status}
                        </span>
                      </td>

                      {userTY === "AD" && (
                        <>
                          <td style={tdCenter}>
                            <Link
                              to={`/edit-truck/${truck.id}`}
                              state={{ truck }}
                              style={{ textDecoration: "none" }}
                            >
                              ✏️
                            </Link>
                          </td>

                          <td style={tdCenter}>
                            <button
                              style={deleteBtn}
                              onClick={() => handleDelete(truck.id)}
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

            {/* PAGINATION */}

            <div style={paginationWrapper}>
              <div>
                Showing {paginatedTrucks.length} of {total} entries
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  style={pageBtn}
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    style={p === page ? activePageBtn : pageBtn}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}

                <button
                  style={pageBtn}
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage((p) => p + 1)}
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

export default TruckMaster;

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

const activeStatus: React.CSSProperties = {
  color: "#28a745",
  fontWeight: 600,
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

const paginationWrapper: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderTop: "1px solid #dee2e6",
  fontSize: "14px",
};

const pageBtn: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #dee2e6",
  background: "#fff",
  cursor: "pointer",
  borderRadius: "4px",
};

const activePageBtn: React.CSSProperties = {
  ...pageBtn,
  background: "#212529",
  color: "#fff",
  border: "1px solid #212529",
};
