import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { updateCustomer, resetCustomerState } from "../store/customerSlice";

// ✅ Reusable Input Component
type InputProps = {
  name: string;
  label: string;
  value: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};

const Input: React.FC<InputProps> = ({ name, label, value, onChange }) => (
  <div className="col-md-4">
    <label className="form-label">{label}</label>
    <input
      name={name}
      value={value ?? ""}
      onChange={onChange}
      className="form-control"
    />
  </div>
);

const EditCustomerMaster: React.FC = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const customerId = Number(id);

  const { loading, error, success } = useSelector((state: any) => state.customers);
  const user = useSelector((state: any) => state.login.user);
  const companyID = user?.companyID;

  const customer = location.state?.customer;

  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<any>({
    code: "",
    title: "",
    dotNo: "",
    mcNo: "",
    address: "",
    zipCode: "",
    firstName: "",
    lastName: "",
    phoneNo: "",
    emailID: "",
    nemailID: "",
    statusID: "1"
  });

  // ✅ Prefill form from raw backend object
  useEffect(() => {
    if (customer) {
      setForm((prev: any) => ({ ...prev, ...customer }));
    } else {
      toast.error("Customer data not found");
    }
  }, [customer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev: any) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // ✅ Submit RAW data directly to API
 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!form.code?.trim()) return toast.error("Code is required");
  if (!form.title?.trim()) return toast.error("Title is required");

  dispatch(resetCustomerState());

  const payload = {
    ...form,
    companyID
  };

  try {
    await dispatch(updateCustomer({ ID: customerId, data: payload })).unwrap();

    console.log(payload);
    setSubmitted(true);

  } catch (err: any) {
    console.error("Update error →", err);

    toast.error(
      typeof err === "string"
        ? err
        : err?.message || "Failed to update customer"
    );
  }
};

  useEffect(() => {
    if (!submitted) return;

    if (success) {
      toast.success("Customer updated successfully");
      setSubmitted(false);
      // navigate("/customer");
    }

    if (error) {
      toast.error(error);
      setSubmitted(false);
    }
  }, [success, error, submitted, navigate]);

  return (
    <div className="container-fluid mt-3">
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
      <div className="card p-4">
        <form onSubmit={handleSubmit}>

          {/* Company Info */}
          <h5 className="mb-3">Company Info</h5>
          <div className="row g-3">
            <Input name="code" label="Code *" value={form.code} onChange={handleChange} />
            <Input name="title" label="Title *" value={form.title} onChange={handleChange} />
            <Input name="dotNo" label="DOT No" value={form.dotNo} onChange={handleChange} />
            <Input name="mcNo" label="MC No" value={form.mcNo} onChange={handleChange} />
            {/* <Input name="dlNo" label="DL No" value={form.dlNo} onChange={handleChange} /> */}
          </div>

          {/* Address */}
          <h5 className="mt-4 mb-3">Address Info</h5>
          <div className="row g-3">
            <Input name="address" label="Address" value={form.address} onChange={handleChange} />
            {/* <Input name="stateName" label="State" value={form.stateName} onChange={handleChange} />
            <Input name="cityName" label="City" value={form.cityName} onChange={handleChange} /> */}
            <Input name="zipCode" label="Zip Code" value={form.zipCode} onChange={handleChange} />
          </div>

          {/* Contact */}
          <h5 className="mt-4 mb-3">Contact Person</h5>
          <div className="row g-3">
            <Input name="firstName" label="First Name" value={form.firstName} onChange={handleChange} />
            <Input name="lastName" label="Last Name" value={form.lastName} onChange={handleChange} />
            <Input name="phoneNo" label="Phone No" value={form.phoneNo} onChange={handleChange} />
            <Input name="emailID" label="Email" value={form.emailID} onChange={handleChange} />
          </div>

          {/* Plan */}
          {/* <h5 className="mt-4 mb-3">Plan & Assignment</h5>
          <div className="row g-3">
            <Input name="planID" label="Plan ID" value={form.planID} onChange={handleChange} />
            <Input name="planTypeID" label="Plan Type" value={form.planTypeID} onChange={handleChange} />
            <Input name="assignTo" label="Assign To" value={form.assignTo} onChange={handleChange} />
          </div> */}

          {/* Status */}
          <h5 className="mt-4 mb-3">System</h5>
          <div className="row g-3">
            <div className="col-md-4">
              <label>Status</label>
              <select
                name="statusID"
                className="form-control"
                value={form.statusID}
                onChange={handleChange}
              >
                <option value="1">Active</option>
                <option value="2">Inactive</option>
              </select>
            </div>
          </div>

          <hr className="mt-4" />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Updating..." : "Update Customer"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default EditCustomerMaster;
