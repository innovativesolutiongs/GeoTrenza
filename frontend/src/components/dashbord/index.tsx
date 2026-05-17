import React, { useEffect, useMemo } from "react";
import { Users, Settings } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDevices } from "../store/deviceSlice";
import { fetchTrucks } from "../store/truckSlice";
import { fetchCustomers } from "../store/customerSlice";
import { fetchCustomerAllocations } from "../store/allocationslice";
import GoogleMapCluster from "./GoogleMapCluster";
import type { MarkerType } from "./GoogleMapCluster";
import { useLivePositions } from "../hooks/useLivePositions";
import { useAnimationTick } from "../hooks/useAnimationTick";
import { interpolatePosition } from "../utils/deadReckoning";
import { classifyMarker, shouldExtrapolate } from "../utils/signalBlending";

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();

  const devices = useSelector((state: any) => state.device.devices);
  const trucks = useSelector((state: any) => state.truck.trucks);
  const { items = [] } = useSelector((state: any) => state.customers);

  const allocations = useSelector(
    (state: any) => state.allocation?.allocations || []
  );

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
  }, [dispatch, customerID, compID]);

  /* ================= LIVE POSITIONS ================= */

  const { positions } = useLivePositions();
  const now = useAnimationTick();

  /* ================= FILTERED COUNTS ================= */

  const totalCustomers = items.length;
  const totalDevices = devices.length;
  const totalTrucks = trucks.length;

  const activeCustomers = items.filter(
    (c: any) => c.status === "active" || c.isActive === 1
  ).length;

  const allocatedDeviceIDs = allocations.map((a: any) => String(a.deviceID));

  const filteredDevices =
    userTY === "AD"
      ? devices
      : devices.filter((device: any) =>
          allocatedDeviceIDs.includes(String(device.id))
        );

  const allocatedTruckIDs = allocations.map((a: any) => String(a.truckID));

  const filteredTrucks =
    userTY === "AD"
      ? trucks
      : trucks.filter((truck: any) =>
          allocatedTruckIDs.includes(String(truck.id))
        );

  /* ================= MAP MARKERS — LIVE + ANIMATED ================= */

  // useAnimationTick drives `now` at requestAnimationFrame cadence; each
  // re-render recomputes `markers` via the pure dead-reckoning math.
  const deviceById = useMemo(() => {
    const map = new Map<string, any>();
    for (const d of devices) map.set(String(d.id), d);
    return map;
  }, [devices]);

  const visiblePositions = useMemo(() => {
    if (userTY === "AD") return positions;
    return positions.filter((p) => allocatedDeviceIDs.includes(String(p.device_id)));
  }, [positions, userTY, allocatedDeviceIDs]);

  const markers: MarkerType[] = useMemo(() => {
    return visiblePositions.map((p) => {
      const state = classifyMarker(p, now);
      const coords = shouldExtrapolate(state)
        ? interpolatePosition(p, now)
        : { lat: p.lat, lng: p.lng };
      const dev = deviceById.get(String(p.device_id));
      return {
        id: p.id,
        lat: coords.lat,
        lng: coords.lng,
        date: p.recorded_at,
        speed: p.speed_kph ?? 0,
        label: dev ? `${dev.terminal_id}${dev.model ? ` (${dev.model})` : ""}` : `device ${p.device_id}`,
        state,
      };
    });
  }, [visiblePositions, deviceById, now]);

  return (
    <div className="dashboard">
      {/* ================= STATS ================= */}

      <div className="row g-4 mb-4">
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
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Live Devices / Trucks Routes</h5>
          <small className="text-muted">
            {markers.length} {markers.length === 1 ? "vehicle" : "vehicles"} live
          </small>
        </div>

        <div className="card-body">
          <GoogleMapCluster markers={markers} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
