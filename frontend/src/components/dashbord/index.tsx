import React, { useEffect } from "react";
import { Users, Settings } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDevices } from "../store/deviceSlice";
import { fetchTrucks } from "../store/truckSlice";
import { fetchCustomers } from "../store/customerSlice";
import { fetchCustomerAllocations } from "../store/allocationslice";
import GoogleMapCluster from "./GoogleMapCluster";

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();

  const devices = useSelector((state: any) => state.device.devices);
  const trucks = useSelector((state: any) => state.truck.trucks);
  const { items = [] } = useSelector((state: any) => state.customers);

  // console.log('devices', devices);
  // console.log('trucks', items);

  const allocations = useSelector(
    (state: any) => state.allocation?.allocations || []
  );

  console.log(allocations);



  const user = useSelector((state: any) => state.login.userInfo);
  const userTY = user?.userTY;
  const customerID = user?.customerID;
  const compID = user.compID;




  /* ================= FETCH ================= */

  useEffect(() => {
    dispatch(fetchDevices() as any);
    dispatch(fetchTrucks() as any);

    if (customerID) {
      dispatch(fetchCustomerAllocations(customerID) as any);
    }

    if (compID) {
      dispatch(fetchCustomers(compID) as any);
    }
  }, [dispatch, customerID]);

  /* ================= FILTER DEVICES ================= */

  const totalCustomers = items.length;
  const totalDevices = devices.length;
  const totalTrucks = trucks.length;

  // Example logic for active customers (customize based on your DB)
  const activeCustomers = items.filter(
    (c: any) => c.status === "active" || c.isActive === 1
  ).length;

  const allocatedDeviceIDs = allocations.map((a: any) =>
    Number(a.deviceID)
  );

  const filteredDevices =
    userTY === "AD"
      ? devices
      : devices.filter((device: any) =>
        allocatedDeviceIDs.includes(Number(device.device_ID))
      );

  /* ================= FILTER TRUCKS ================= */

  const allocatedTruckIDs = allocations.map((a: any) =>
    Number(a.truckID)
  );

  const filteredTrucks =
    userTY === "AD"
      ? trucks
      : trucks.filter((truck: any) =>
        allocatedTruckIDs.includes(Number(truck.ID))
      );

  /* ================= MAP MARKERS ================= */

  // const markersData = filteredTrucks.map((truck: any) => ({
  //   id: truck.ID,

  //   // Ludhiana example: 30.9010, 75.8573
  //   // Moga example: 30.8230, 75.1730

  //   lat: Number(truck.lat) || 30.9010,
  //   lng: Number(truck.lng) || 75.8573,

  //   date: truck.gpsDateTime || null,
  //   speed: Number(truck.speed) || 0,
  // }));

  const markersData = [
  { id: 1, lat: 30.9010, lng: 75.8573, speed: 45 }, // Ludhiana
  { id: 2, lat: 30.8230, lng: 75.1730, speed: 60 }, // Moga
];

  return (
    <div className="dashboard">
      {/* ================= STATS ================= */}

      <div className="row g-4 mb-4">

        {/* ADMIN ONLY CARDS */}

        {userTY === "AD" && (
          <>
            <div className="col-md-3">
              <div className="card border-start border-danger border-4">
                <div className="card-body d-flex align-items-center">
                  <Users className="text-danger me-3" size={24} />
                  <div>
                    <p className="text-muted mb-1 small">Total Customers</p>
                    <h3 className="mb-0 fw-bold">{totalCustomers}</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-start border-success border-4">
                <div className="card-body d-flex align-items-center">
                  <Users className="text-success me-3" size={24} />
                  <div>
                    <p className="text-muted mb-1 small">Active Customers</p>
                    <h3 className="mb-0 fw-bold">{activeCustomers}</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-start border-warning border-4">
                <div className="card-body d-flex align-items-center">
                  <Settings className="text-warning me-3" size={24} />
                  <div>
                    <p className="text-muted mb-1 small">Total Devices</p>
                    <h3 className="mb-0 fw-bold">{totalDevices}</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-start border-primary border-4">
                <div className="card-body d-flex align-items-center">
                  <Settings className="text-primary me-3" size={24} />
                  <div>
                    <p className="text-muted mb-1 small">Total Trucks</p>
                    <h3 className="mb-0 fw-bold">{totalTrucks}</h3>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* BOTH ADMIN & CUSTOMER */}
        {userTY === "CUSTOMER" && (
          <>
            <div className="col-md-3">
              <div className="card border-start border-info border-4">
                <div className="card-body d-flex align-items-center">
                  <Settings className="text-info me-3" size={24} />
                  <div>
                    <p className="text-muted mb-1 small">Active Devices</p>
                    <h3 className="mb-0 fw-bold">{filteredDevices?.length || 0}</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="card border-start border-primary border-4">
                <div className="card-body d-flex align-items-center">
                  <Settings className="text-primary me-3" size={24} />
                  <div>
                    <p className="text-muted mb-1 small">Active Trucks</p>
                    <h3 className="mb-0 fw-bold">{filteredTrucks?.length || 0}</h3>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* ================= MAP ================= */}

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Live Devices / Trucks Routes</h5>
        </div>

        <div className="card-body">
          <GoogleMapCluster markers={markersData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;