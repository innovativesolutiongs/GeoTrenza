import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";

import { Trash2, User } from "lucide-react";
import { fetchCustomers, deleteCustomer, updateUserCredentials } from "../store/customerSlice";
import "../../assets/css/bootstrap.min.css";
import "../../assets/css/bootstrap-extended.css";
import { toast } from "react-toastify";

const CustomersMaster: React.FC = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();

  const { items = [], loading } = useSelector((state: any) => state.customers);
  const user = useSelector((state: any) => state.login.userInfo);
  console.log("USER INFO →", items);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // customer username and password

  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");


  console.log("Selected Customer →", items.userpass);

  const itemsPerPage = 10;

  const openUserModal = (customer: any) => {
    setSelectedCustomer(customer);
    setUsername(customer.code || "");
    setPassword(customer.userpass ?? "");
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedCustomer(null);
    setUsername("");
    setPassword("");
  };

  // ✅ Fetch data when compID available
  useEffect(() => {
    if (user?.compID) {
      dispatch(fetchCustomers(user.compID));
    }

  }, [dispatch, user?.compID]);

  // ✅ Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const handleDelete = (id: number) => {
    const toastId = toast.info(
      <div>
        <div>Delete this customer?</div>

        <div className="mt-2 d-flex gap-2">
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={async () => {
              try {
                await dispatch(deleteCustomer(id)).unwrap();
                toast.dismiss(toastId);
                toast.success("Customer deleted successfully");
              } catch (err: any) {
                toast.dismiss(toastId);
                toast.error(err || "Failed to delete customer");
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

  const handleUserSubmit = async () => {
    if (!password) {
      toast.error("Password is required");
      return;
    }

    if (!selectedCustomer?.ID) {
      toast.error("Customer not selected");
      return;
    }

    const payload = {
      customerID: selectedCustomer.ID,
      username: username,
      password: password,
    };

    console.log("DISPATCH →", payload);

    try {
      const result = await dispatch(updateUserCredentials(payload)).unwrap();

      console.log("DISPATCH RESULT →", result);

      toast.success("User saved successfully");
      closeUserModal();
    } catch (error: any) {
      console.log("DISPATCH ERROR →", error);
      toast.error(error || "Failed to save user");
    }
  };




  // ✅ FILTER LOGIC
  const filteredData = Array.isArray(items)
    ? items.filter((item: any) => {
      const searchText = search.toLowerCase();

      const title = item?.title?.toLowerCase() ?? "";
      const person = `${item?.firstName || ""} ${item?.lastName || ""}`.toLowerCase();
      const code = item?.code?.toLowerCase() ?? "";
      const email = item?.emailID?.toLowerCase() ?? "";
      const address = item?.address?.toLowerCase() ?? "";

      const matchesSearch =
        title.includes(searchText) ||
        person.includes(searchText) ||
        code.includes(searchText) ||
        email.includes(searchText) ||
        address.includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && item.statusID === 1) ||
        (statusFilter === "Inactive" && item.statusID !== 1);

      return matchesSearch && matchesStatus;
    })
    : [];

  // ✅ Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="row">
      <div className="col-12 py-4 px-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className="fw-bold fs-5">Masters</span>
            <span className="mx-2 text-muted">&gt;</span>
            <span className="text-muted">Customers Master</span>
          </div>

          <div>
            <button className="btn btn-dark me-2" onClick={() => navigate("/customer")}>
              View All
            </button>
            <button className="btn btn-dark" onClick={() => navigate("/createcustomermaster")}>
              Create New
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          <select
            className="form-select w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* <button className="btn btn-info" onClick={() => setCurrentPage(1)}>
            Filter Data
          </button> */}

          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearch("");
              setStatusFilter("All");
            }}
          >
            Clear Filters
          </button>

          <button className="btn btn-success">Export</button>

          <input
            type="text"
            className="form-control w-auto ms-auto"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="card shadow-sm d-flex flex-column" style={{ height: "600px" }}>
          <div className="card-body p-0" style={{ overflow: "auto", flex: 1 }}>
            {loading && <p className="text-center py-3 fw-medium">Loading...</p>}

            <table className="table table-bordered table-hover align-middle mb-0">
              <thead className="table-light" style={{ position: "sticky", top: 0 }}>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>DOT No</th>
                  <th>Person</th>
                  <th>Address</th>
                  <th>Email</th>
                  <th>Edit</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item: any, index: number) => (
                    <tr key={item.ID ?? index}>
                      <td>{item.code}</td>
                      <td>{item.title}</td>
                      <td>{item.dotNo}</td>
                      <td>{`${item.firstName || ""} ${item.lastName || ""}`}</td>
                      <td>{item.address}</td>
                      <td>{item.emailID}</td>

                      <td>
                        <Link
                          to={`/edit-customer/${item.ID}`}
                          state={{ customer: item }}
                          style={{ textDecoration: "none" }}
                        >
                          ✏️
                        </Link>
                      </td>

                      <td>
                        <span className={`fw-medium ${item.statusID === 1 ? "text-success" : "text-danger"}`}>
                          {item.statusID === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="text-center">
                        <Trash2
                          size={16}
                          className="me-2 text-danger"
                          style={{ cursor: "pointer" }}
                          onClick={() => handleDelete(item.ID)}
                        />
                        <User
                          size={16}
                          style={{ cursor: "pointer" }}
                          onClick={() => openUserModal(item)}
                        />

                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center text-muted py-4">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {showUserModal && (
              <>
                <div className="modal fade show d-block" tabIndex={-1}>
                  <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">

                      {/* HEADER */}
                      <div className="modal-header">
                        <h5 className="modal-title fw-bold text-danger">
                          Create User :
                          <span className="text-primary ms-2">
                            {selectedCustomer?.code}
                          </span>
                        </h5>

                        <button
                          type="button"
                          className="btn-close"
                          onClick={closeUserModal}
                        />
                      </div>

                      {/* BODY */}
                      <div className="modal-body">

                        <div className="mb-3">
                          <label className="form-label fw-medium">Username</label>
                          <input
                            className="form-control"
                            value={username}
                            readOnly
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label fw-medium">Password</label>
                          <input
                            type="text"
                            className="form-control"
                            value={password || ""}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                          />
                        </div>
                      </div>

                      {/* FOOTER */}
                      <div className="modal-footer">
                        <button
                          className="btn btn-secondary"
                          onClick={closeUserModal}
                        >
                          Cancel
                        </button>

                        <button
                          className="btn btn-info px-4"
                          onClick={handleUserSubmit}
                        >
                          Update
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

                {/* BACKDROP */}
                <div className="modal-backdrop fade show"></div>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="card-footer bg-white">
            <div className="d-flex justify-content-between align-items-center small">
              <div>
                Showing {paginatedData.length} of {filteredData.length} entries
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </button>

                <button className="btn btn-dark btn-sm">{currentPage}</button>

                <button
                  className="btn btn-outline-secondary btn-sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomersMaster;
