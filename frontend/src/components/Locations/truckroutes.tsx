import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { fetchAllocations } from "../store/allocationslice";
import { fetchCustomers } from "../store/customerSlice";
import { fetchTrucks } from "../store/truckSlice";
import GoogleMapCluster from "../dashbord/GoogleMapCluster"; // Adjust path
// Example markers for the map
const markersData = [
    { id: 1, lat: 28.6139, lng: 77.209 }, // Delhi
    { id: 2, lat: 19.076, lng: 72.8777 }, // Mumbai
    { id: 3, lat: 13.0827, lng: 80.2707 }, // Chennai
    { id: 4, lat: 22.5726, lng: 88.3639 }, // Kolkata
    { id: 5, lat: 26.9124, lng: 75.7873 }, // Jaipur
    { id: 6, lat: 12.9716, lng: 77.5946 }, // Bangalore
    { id: 7, lat: 17.385, lng: 78.4867 },  // Hyderabad
];


const AllocationForm = () => {
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

    const user = useSelector((state: any) => state.login.userInfo);
    const compID = user?.compID;

    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [filteredTrucks, setFilteredTrucks] = useState<any[]>([]);

    // Load data
    useEffect(() => {
        if (compID) {
            dispatch(fetchCustomers(compID) as any);
        }
        dispatch(fetchAllocations() as any);
        dispatch(fetchTrucks() as any);
    }, [dispatch, compID]);

    // 🔑 MAIN LOGIC
    useEffect(() => {
        if (!selectedCustomer) {
            setFilteredTrucks([]);
            return;
        }

        // Step 1 → get truckIDs from allocation
        const allocationTruckIDs = allocations
            .filter(
                (item: any) =>
                    Number(item.customerID) === Number(selectedCustomer)
            )
            .map((item: any) => Number(item.truckID));

        // console.log("🚛 TruckIDs from Allocation:", allocationTruckIDs);
        // console.log("🚚 Trucks Table:", trucks);

        // Step 2 → filter trucks table using those IDs
        const matchedTrucks = trucks.filter((truck: any) =>
            allocationTruckIDs.includes(Number(truck.ID)) // IMPORTANT MATCH
        );

        // console.log("✅ Final Trucks to Show:", matchedTrucks);

        setFilteredTrucks(matchedTrucks);

    }, [selectedCustomer, allocations, trucks]);

    return (
        <div className="card shadow p-4">
            <h4 className="mb-4">Truck Routes</h4>

            <div className="row g-3">
                {/* Customer */}
                <div className="col-md-6">
                    <label className="form-label">Customer</label>
                    <select
                        className="form-select"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                    >
                        <option value="">Select Customer</option>
                        {customersList.map((c: any) => (
                            <option key={c.ID} value={c.ID}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Truck → shows truckNo ONLY */}
                <div className="col-md-6">
                    <label className="form-label">Truck</label>
                    <select className="form-select" disabled={!selectedCustomer}>
                        <option value="">Select Truck</option>

                        {filteredTrucks.map((truck: any) => (
                            <option key={truck.ID} value={truck.ID}>
                                {truck.truckNo}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <br />
            <br />
            <div className="card">
                <div className="card-header">
                    <h5 className="mb-0">Trucks Routes</h5>
                </div>
                <div className="card-body">
                    <GoogleMapCluster markers={markersData} />
                </div>
            </div>
        </div>
    );
};

export default AllocationForm;
