import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createCustomer, resetCustomerState } from "../store/customerSlice";

const CreateAccountMaster: React.FC = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { loading, error, success } = useSelector((state: any) => state.customers);
  const user = useSelector((state: any) => state.login.userInfo);
  const compID = user?.compID;
  const userID = user?.userID;

  console.log("User Info →", compID, userID);

  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    code: "",
    title: "",
    dotNo: "",
    mcNo: "",
    address: "",
    stateName: 0,
    cityName: 0,
    zipCode: 0,

    shpAddress: "",
    shpStateName: 0,
    shpCityName: 0,
    shpZipCode: 0,

    phoneNo: "",
    emailID: "",
    nemailID: "",

    firstName: "",
    lastName: "",
    dlNo: "",

    totT: 0,
    totD: 0,
    totS: 0,

    batchID: 0,
    teamID: "",
    assignTo: "",

    planID: 0,
    mayaPlanID: 0,
    planTypeID: 0,

    elogID: 2,
    elogKey: "",

    chkConfim: 0,
    appActiveID: 2,
    wapActiveID: 2,

    rowID: 0,
    imageFile: "",
    statusID: 1,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: isNaN(Number(value)) ? value : Number(value),
    }));
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!form.code.trim()) return toast.error("Code is required");
  if (!form.title.trim()) return toast.error("Title is required");

  dispatch(resetCustomerState());

  const payload = {
    ...form,
    companyID: compID,
    createdByUserID: userID,
    stateName: form.stateName.toString(),
    cityName: form.cityName.toString(),
    zipCode: form.zipCode.toString(),
    shpStateName: form.shpStateName.toString(),
    shpCityName: form.shpCityName.toString(),
  };

  try {
    // 👇 unwrap throws rejected errors properly
    await dispatch(createCustomer(payload)).unwrap();

    setSubmitted(true);
    toast.success("Customer created successfully!");

  } catch (err: any) {
    console.error("Create customer error:", err);

    toast.error(
      err || "Failed to create customer"
    );
  }
};


  useEffect(() => {
    if (!submitted) return;

    if (success) {
      // toast.success("Account created successfully");
      setSubmitted(false);
      navigate("/customer");
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
          <span className="text-muted">Customers Master :</span>
          <span className="fw-semibold text-dark"> Create New</span>
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
          <div className="row g-2">
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
            {/* <Input name="stateName" label="State ID" value={form.stateName} onChange={handleChange} />
            <Input name="cityName" label="City ID" value={form.cityName} onChange={handleChange} /> */}
             <Input name="zipCode" label="Zip Code" value={form.zipCode} onChange={handleChange} />
          </div>

          {/* Shipping */}
          {/* <h5 className="mt-4 mb-3">Shipping Info</h5>
          <div className="row g-3">
            <Input name="shpAddress" label="Shipping Address" value={form.shpAddress} onChange={handleChange} />
            <Input name="shpStateName" label="Shipping State" value={form.shpStateName} onChange={handleChange} />
            <Input name="shpCityName" label="Shipping City" value={form.shpCityName} onChange={handleChange} />
            <Input name="shpZipCode" label="Shipping Zip" value={form.shpZipCode} onChange={handleChange} />
          </div> */}

          {/* Contact */}
          <h5 className="mt-4 mb-3">Contact Person</h5>
          <div className="row g-3">
            <Input name="firstName" label="First Name" value={form.firstName} onChange={handleChange} />
            <Input name="lastName" label="Last Name" value={form.lastName} onChange={handleChange} />
            <Input name="phoneNo" label="Phone No" value={form.phoneNo} onChange={handleChange} />
            <Input name="emailID" label="Email" value={form.emailID} onChange={handleChange} />
            <Input name="nemailID" label="Notify Email" value={form.nemailID} onChange={handleChange} />
          </div>

          {/* Plan */}
          {/* <h5 className="mt-4 mb-3">Plan & Assignment</h5>
          <div className="row g-3">
            <Input name="planID" label="Plan ID" value={form.planID} onChange={handleChange} />
            <Input name="mayaPlanID" label="Maya Plan ID" value={form.mayaPlanID} onChange={handleChange} />
            <Input name="planTypeID" label="Plan Type" value={form.planTypeID} onChange={handleChange} />
            <Input name="teamID" label="Team ID" value={form.teamID} onChange={handleChange} />
            <Input name="assignTo" label="Assign To" value={form.assignTo} onChange={handleChange} />
          </div> */}

          {/* App Settings */}
          {/* <h5 className="mt-4 mb-3">App / Elog Settings</h5>
          <div className="row g-3">
            <div className="col">
              <div className="row g-3">

                <div className="col-4">
                  <label className="form-label">Confirm Flag</label>
                  <select
                    name="chkConfim"
                    className="form-select"
                    value={form.chkConfim}
                    onChange={handleChange}
                  >
                    <option value="1">Yes</option>
                    <option value="2">No</option>
                  </select>
                </div>

                <div className="col-4">
                  <label className="form-label">App Active ID</label>
                  <select
                    name="appActiveID"
                    className="form-select"
                    value={form.appActiveID}
                    onChange={handleChange}
                  >
                    <option value="1">Yes</option>
                    <option value="2">No</option>
                  </select>
                </div>

                <div className="col-4">
                  <label className="form-label">WhatsApp Active ID</label>
                  <select
                    name="wapActiveID"
                    className="form-select"
                    value={form.wapActiveID}
                    onChange={handleChange}
                  >
                    <option value="1">Yes</option>
                    <option value="2">No</option>
                  </select>
                </div>

              </div>
              <br />
              <div className="row g-3">

                <div className="col-4">
                  <label className="form-label">Elog ID</label>
                  <select
                    name="elogID"
                    className="form-select"
                    value={form.elogID}
                    onChange={handleChange}
                  >
                    <option value="1">Yes</option>
                    <option value="2">No</option>
                  </select>
                </div>

                <div className="col">
                  <Input
                    name="elogKey"
                    label="Elog Key"
                    value={form.elogKey}
                    onChange={handleChange}
                  />
                </div>

              </div>
            </div>

          </div> */}
          {/* 
          <div className="col">
              <div className="row">
                <div className="col-md-6">
                  <Input
                    name="elogID"
                    label="Elog ID"
                    value={form.elogID}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-md-6">
                  <Input
                    name="elogKey"
                    label="Elog Key"
                    value={form.elogKey}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div> */}



          {/* Totals */}
          {/* <h5 className="mt-4 mb-3">Totals</h5>
          <div className="row g-3">
            <Input name="totT" label="Total T" value={form.totT} onChange={handleChange} />
            <Input name="totD" label="Total D" value={form.totD} onChange={handleChange} />
            <Input name="totS" label="Total S" value={form.totS} onChange={handleChange} />
            <Input name="batchID" label="Batch ID" value={form.batchID} onChange={handleChange} />
            <Input name="rowID" label="Row ID" value={form.rowID} onChange={handleChange} />
          </div> */}

          {/* Status */}
          <h5 className="mt-4 mb-3">System</h5>
          <div className="row g-3">
            {/* <Input name="imageFile" label="Image File" value={form.imageFile} onChange={handleChange} /> */}
            <div className="col-md-3">
              <label>Status</label>
              <select name="statusID" className="form-control" value={form.statusID} onChange={handleChange}>
                <option value={1}>Active</option>
                <option value={2}>Inactive</option>
              </select>
            </div>
          </div>

          <hr className="mt-4" />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving..." : "Save Account"}
          </button>

        </form>
      </div>
    </div>
  );
};

export default CreateAccountMaster;

const Input = ({ name, label, value, onChange }: any) => (
  <div className="col-md-3">
    <label>{label}</label>
    <input name={name} className="form-control" value={value} onChange={onChange} />
  </div>
);
