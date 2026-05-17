import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom"; // at the top of your file
import { fetchCustomers } from "../store/customerSlice";
import { fetchTrucks } from "../store/truckSlice";
import { fetchDevices } from "../store/deviceSlice";
import { addAllocation } from "../store/allocationslice";

import { toast } from "react-toastify";
import type { RootState, AppDispatch } from "../store";

interface AllocationForm {
  allocationDate: string;
  customerId: string;
  truckNo: string;
  deviceNo: string;
}

const AllocationMaster: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate(); // inside your component


  const [formData, setFormData] = useState<AllocationForm>({
    allocationDate: "",
    customerId: "",
    truckNo: "",
    deviceNo: "",
  });

  const user = useSelector((state: any) => state.login.userInfo);
  const compID = user?.compID;
  // console.log(compID)

  // Redux state selectors
  const customers = useSelector((state: RootState) => state.customers.items || []);
  const customersLoading = useSelector((state: RootState) => state.customers.loading);
  const customersError = useSelector((state: RootState) => state.customers.error);

  // console.log(customers)

  // Truck
  const trucks = useSelector((state: RootState) => state.truck.trucks || []);
  const trucksLoading = useSelector((state: RootState) => state.truck.loading);
  const trucksError = useSelector((state: RootState) => state.truck.error);

  // Device
  const devices = useSelector((state: RootState) => state.device.devices || []);
  const devicesLoading = useSelector((state: RootState) => state.device.loading);
  const devicesError = useSelector((state: RootState) => state.device.error);


  // console.log(trucks)

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchCustomers(compID));
    dispatch(fetchTrucks());
    dispatch(fetchDevices());
  }, [dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { allocationDate, customerId, truckNo, deviceNo } = formData;
    if (!allocationDate || !customerId || !truckNo || !deviceNo) {
      toast.error("All fields are required");
      return;
    }

    dispatch(addAllocation({
      allocationDate,
      customerId: parseInt(customerId),
      truckNo: parseInt(truckNo),
      deviceNo: parseInt(deviceNo),
      compID
    }))
      .unwrap()
      .then(() => {
        toast.success("Allocation saved successfully!");
        navigate("/allocationmaster"); // navigate to the allocation list page (change route as needed)
      })
      .catch((err) => toast.error(err));

    setFormData({
      allocationDate: "",
      customerId: "",
      truckNo: "",
      deviceNo: "",
    });
  };

  return (
    <div className="container-fluid mt-3">
     
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="fw-bold fs-5">Masters</span>
          <span className="mx-2 text-muted">&gt;</span>
          <span className="text-muted">Allocation Master :</span>
          <span className="fw-semibold text-dark"> Create New</span>
        </div>

        <div>
          <button className="btn btn-dark me-2" onClick={() => navigate("/allocationmaster")}>
            View All
          </button>
          <button className="btn btn-dark" onClick={() => navigate("/createallocationmaster")}>
            Create New
          </button>
        </div>
      </div>

      <div className="card p-4">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            {/* Allocation Date */}
            <div className="col-sm-3">
              <label>Allocation Date *</label>
              <input
                type="date"
                name="allocationDate"
                className="form-control"
                value={formData.allocationDate}
                onChange={handleChange}
                required
              />
            </div>

            {/* Customer Dropdown */}
            <div className="col-sm-3">
              <label>Customer *</label>
              <select
                name="customerId"
                className="form-control"
                value={formData.customerId}
                onChange={handleChange}
                disabled={customersLoading}
                required
              >
                <option value="">
                  {customersLoading ? "Loading..." : "Select Customer"}
                </option>
                {customers.map((c: any) => (
                  <option key={c.ID} value={c.ID}>
                    {c.title}
                  </option>
                ))}
              </select>
              {customersError && <small className="text-danger">{customersError}</small>}
            </div>

            {/* Truck Dropdown */}
            <div className="col-sm-3">
              <label>Truck No *</label>
              <select
                name="truckNo"
                className="form-control"
                value={formData.truckNo}
                onChange={handleChange}
                disabled={trucksLoading}
                required
              >
                <option value="">{trucksLoading ? "Loading..." : "Select Truck"}</option>
                {trucks.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name ?? t.registration_no}
                  </option>
                ))}
              </select>
              {trucksError && <small className="text-danger">{trucksError}</small>}
            </div>

            {/* Device Dropdown */}
            <div className="col-sm-3">
              <label>Device No *</label>
              <select
                name="deviceNo"
                className="form-control"
                value={formData.deviceNo}
                onChange={handleChange}
                disabled={devicesLoading}
                required
              >
                <option value="">{devicesLoading ? "Loading..." : "Select Device"}</option>
                {devices.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.terminal_id}
                  </option>
                ))}
              </select>
              {devicesError && <small className="text-danger">{devicesError}</small>}
            </div>
          </div>

          <hr className="mt-4" />
          <button type="submit" className="btn btn-primary">
            Save Allocation
          </button>
        </form>
      </div>
    </div>
  );
};

export default AllocationMaster;
