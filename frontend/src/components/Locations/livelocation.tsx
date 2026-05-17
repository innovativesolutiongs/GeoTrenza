import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { fetchAllocations } from "../store/allocationslice";
import { fetchCustomers } from "../store/customerSlice";
import { fetchTrucks } from "../store/truckSlice";
import { fetchDevices } from "../store/deviceSlice";
import GoogleMapCluster from "../dashbord/GoogleMapCluster";
import type { MarkerType } from "../dashbord/GoogleMapCluster";
import { useLivePositions } from "../hooks/useLivePositions";
import { useAnimationTick } from "../hooks/useAnimationTick";
import { interpolatePosition } from "../utils/deadReckoning";
import { shouldFreezeMarker } from "../utils/signalBlending";

const LiveLocation = () => {
    const dispatch = useDispatch();

    const allocations = useSelector(
        (state: RootState) => state.allocation.items || []
    );

    const customersList = useSelector(
        (state: RootState) => state.customers.items || []
    );

    const trucks = useSelector(
        (state: RootState) => state.truck.trucks || []
    );

    const devices = useSelector(
        (state: RootState) => state.device.devices || []
    );

    const user = useSelector((state: any) => state.login.userInfo);
    const compID = user?.compID;

    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [selectedTruck, setSelectedTruck] = useState("");
    const [filteredTrucks, setFilteredTrucks] = useState<any[]>([]);

    useEffect(() => {
        if (compID) {
            dispatch(fetchCustomers(compID) as any);
        }
        dispatch(fetchAllocations() as any);
        dispatch(fetchTrucks() as any);
        dispatch(fetchDevices() as any);
    }, [dispatch, compID]);

    // Filter trucks by customer via allocation.
    useEffect(() => {
        if (!selectedCustomer) {
            setFilteredTrucks([]);
            setSelectedTruck("");
            return;
        }
        const allocationTruckIDs = allocations
            .filter((item: any) => Number(item.customerID) === Number(selectedCustomer))
            .map((item: any) => String(item.truckID));
        const matched = trucks.filter((t: any) =>
            allocationTruckIDs.includes(String(t.id))
        );
        setFilteredTrucks(matched);
        setSelectedTruck("");
    }, [selectedCustomer, allocations, trucks]);

    /* ================= LIVE POSITIONS ================= */

    const { positions } = useLivePositions();
    const now = useAnimationTick();

    // Map truck → device(s) via devices.truck_id.
    const devicesByTruckId = useMemo(() => {
        const map = new Map<string, any[]>();
        for (const d of devices) {
            if (!d.truck_id) continue;
            const k = String(d.truck_id);
            const arr = map.get(k) ?? [];
            arr.push(d);
            map.set(k, arr);
        }
        return map;
    }, [devices]);

    const deviceById = useMemo(() => {
        const map = new Map<string, any>();
        for (const d of devices) map.set(String(d.id), d);
        return map;
    }, [devices]);

    // Which device_ids to render? Depends on dropdown state.
    const visibleDeviceIds = useMemo<Set<string>>(() => {
        // No customer selected → show everything the user could see.
        if (!selectedCustomer) {
            return new Set(positions.map((p) => String(p.device_id)));
        }
        // Customer selected, truck selected → only that truck's devices.
        if (selectedTruck) {
            return new Set(
                (devicesByTruckId.get(String(selectedTruck)) ?? []).map((d) => String(d.id))
            );
        }
        // Customer selected, no specific truck → all devices on this customer's trucks.
        const truckIds = new Set(filteredTrucks.map((t: any) => String(t.id)));
        const ids = new Set<string>();
        for (const [tid, devs] of devicesByTruckId.entries()) {
            if (!truckIds.has(tid)) continue;
            for (const d of devs) ids.add(String(d.id));
        }
        return ids;
    }, [positions, selectedCustomer, selectedTruck, filteredTrucks, devicesByTruckId]);

    const markers: MarkerType[] = useMemo(() => {
        return positions
            .filter((p) => visibleDeviceIds.has(String(p.device_id)))
            .map((p) => {
                const freeze = shouldFreezeMarker(p);
                const interp = freeze
                    ? {
                          lat: p.lat,
                          lng: p.lng,
                          ageSeconds: Math.max(0, (now - new Date(p.recorded_at).getTime()) / 1000),
                          isStale: false,
                          isFrozen: true,
                      }
                    : interpolatePosition(p, now);
                const dev = deviceById.get(String(p.device_id));
                return {
                    id: p.id,
                    lat: interp.lat,
                    lng: interp.lng,
                    date: p.recorded_at,
                    speed: p.speed_kph ?? 0,
                    label: dev
                        ? `${dev.terminal_id}${dev.model ? ` (${dev.model})` : ""}`
                        : `device ${p.device_id}`,
                    isStale: interp.isStale,
                    isFrozen: interp.isFrozen,
                };
            });
    }, [positions, visibleDeviceIds, deviceById, now]);

    return (
        <div className="card shadow p-4">
            <h4 className="mb-4">Live Location</h4>

            <div className="row g-3">
                <div className="col-md-6">
                    <label className="form-label">Customer</label>
                    <select
                        className="form-select"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                    >
                        <option value="">All Customers</option>
                        {customersList.map((c: any) => (
                            <option key={c.ID} value={c.ID}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col-md-6">
                    <label className="form-label">Truck</label>
                    <select
                        className="form-select"
                        value={selectedTruck}
                        onChange={(e) => setSelectedTruck(e.target.value)}
                        disabled={!selectedCustomer}
                    >
                        <option value="">All Trucks</option>
                        {filteredTrucks.map((truck: any) => (
                            <option key={truck.id} value={truck.id}>
                                {truck.name ?? truck.registration_no}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <br />

            <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Live Locations</h5>
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

export default LiveLocation;
