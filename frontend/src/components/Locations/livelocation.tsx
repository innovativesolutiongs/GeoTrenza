import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../store";
import { fetchTrucks } from "../store/truckSlice";
import { fetchDevices } from "../store/deviceSlice";
import GoogleMapCluster from "../dashbord/GoogleMapCluster";
import type { MarkerType } from "../dashbord/GoogleMapCluster";
import { useLivePositions } from "../hooks/useLivePositions";
import { useAnimationTick } from "../hooks/useAnimationTick";
import { interpolatePosition } from "../utils/deadReckoning";
import { classifyMarker, shouldExtrapolate } from "../utils/signalBlending";
import type { MarkerState } from "../utils/constants";
import TruckCard from "../shared/TruckCard";
import type { TruckCardData } from "../shared/TruckCard";
import UniversalSearchBar from "../shared/UniversalSearchBar";

const SIDEBAR_OPEN_W = 320;
const SIDEBAR_COLLAPSED_W = 64;

const LiveLocation = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const trucks = useSelector((s: RootState) => s.truck.trucks);
    const devices = useSelector((s: RootState) => s.device.devices);

    useEffect(() => {
        dispatch(fetchTrucks() as any);
        dispatch(fetchDevices() as any);
    }, [dispatch]);

    const { positions } = useLivePositions();
    const now = useAnimationTick();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    // Index: truck.id → devices on truck.
    const devicesByTruckId = useMemo(() => {
        const m = new Map<string, any[]>();
        for (const d of devices) {
            if (!d.truck_id) continue;
            const k = String(d.truck_id);
            const arr = m.get(k) ?? [];
            arr.push(d);
            m.set(k, arr);
        }
        return m;
    }, [devices]);

    // Latest position per device (we already get DISTINCT ON from backend, but
    // be defensive).
    const positionByDeviceId = useMemo(() => {
        const m = new Map<string, any>();
        for (const p of positions) {
            const k = String(p.device_id);
            const prev = m.get(k);
            if (!prev || new Date(p.recorded_at) > new Date(prev.recorded_at)) {
                m.set(k, p);
            }
        }
        return m;
    }, [positions]);

    // Combine truck + its newest position into a TruckCardData (the view model
    // the card renders).
    type Entry = {
        truck: any;
        data: TruckCardData;
        position: any | null;
        state: MarkerState;
    };
    const entries: Entry[] = useMemo(() => {
        return trucks.map((t: any) => {
            const devs = devicesByTruckId.get(String(t.id)) ?? [];
            let newest: any = null;
            for (const d of devs) {
                const p = positionByDeviceId.get(String(d.id));
                if (!p) continue;
                if (!newest || new Date(p.recorded_at) > new Date(newest.recorded_at)) newest = p;
            }
            const state: MarkerState = newest ? classifyMarker(newest, now) : "OFFLINE";
            const data: TruckCardData = {
                id: String(t.id),
                name: t.name,
                registration_no: t.registration_no,
                state,
                lastUpdate: newest?.received_at ?? newest?.recorded_at ?? null,
                lat: newest?.lat ?? null,
                lng: newest?.lng ?? null,
                speedKph: newest?.speed_kph ?? null,
                batteryPercent: null, // Stage 4: parse 0xEE TLV into a real %
            };
            return { truck: t, data, position: newest, state };
        });
    }, [trucks, devicesByTruckId, positionByDeviceId, now]);

    // Filter sidebar list by the in-place query from UniversalSearchBar.
    const filteredEntries = useMemo(() => {
        if (!query.trim()) return entries;
        const q = query.toLowerCase();
        return entries.filter(({ truck }) =>
            (truck.name ?? "").toLowerCase().includes(q) ||
            truck.registration_no.toLowerCase().includes(q)
        );
    }, [entries, query]);

    // Sort by most recent update (null last_seen falls to the bottom).
    const sortedEntries = useMemo(() => {
        const score = (e: Entry) =>
            e.data.lastUpdate ? new Date(e.data.lastUpdate).getTime() : 0;
        return [...filteredEntries].sort((a, b) => score(b) - score(a));
    }, [filteredEntries]);

    // Build map markers from the entries (one per truck — uses the truck's
    // newest position). Devices not assigned to a truck are dropped from the
    // map for Stage 3c; they'll surface via the universal search instead.
    const markers: MarkerType[] = useMemo(() => {
        const out: MarkerType[] = [];
        for (const e of entries) {
            if (!e.position) continue;
            const state = e.state;
            const coords = shouldExtrapolate(state)
                ? interpolatePosition(e.position, now)
                : { lat: e.position.lat, lng: e.position.lng };
            out.push({
                id: e.truck.id,
                lat: coords.lat,
                lng: coords.lng,
                date: e.position.recorded_at,
                speed: e.position.speed_kph ?? 0,
                label: e.data.name ?? e.data.registration_no,
                state,
            } as MarkerType & { __truckId: string });
        }
        return out;
    }, [entries, now]);

    const activeCount = entries.filter((e) =>
        e.state === "ACTIVE_MOVING" || e.state === "ACTIVE_IDLE" || e.state === "STATIONARY"
    ).length;
    const offlineCount = entries.filter((e) => e.state === "OFFLINE").length;

    return (
        <div style={{ display: "flex", height: "calc(100vh - 60px)", background: "#f4f6f9" }}>
            {/* === Sidebar === */}
            <div style={{
                width: sidebarOpen ? SIDEBAR_OPEN_W : SIDEBAR_COLLAPSED_W,
                background: "#ffffff",
                borderRight: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                transition: "width 150ms",
                overflow: "hidden",
            }}>
                {/* Header / collapse toggle */}
                <div style={{
                    padding: sidebarOpen ? "12px 14px" : "12px 8px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: sidebarOpen ? "space-between" : "center",
                }}>
                    {sidebarOpen && <strong style={{ fontSize: 14 }}>Fleet</strong>}
                    <button
                        onClick={() => setSidebarOpen((o) => !o)}
                        title={sidebarOpen ? "Collapse" : "Expand"}
                        style={{
                            border: "none", background: "transparent",
                            cursor: "pointer", fontSize: 16, color: "#6b7280",
                        }}
                    >
                        {sidebarOpen ? "‹" : "›"}
                    </button>
                </div>

                {/* Search bar — only when open */}
                {sidebarOpen && (
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6" }}>
                        <UniversalSearchBar onQueryChange={setQuery} placeholder="Filter trucks…" />
                        <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                            {entries.length} {entries.length === 1 ? "truck" : "trucks"} ·{" "}
                            <span style={{ color: "#16a34a" }}>{activeCount} active</span>
                            {offlineCount > 0 && (
                                <>, <span style={{ color: "#dc2626" }}>{offlineCount} offline</span></>
                            )}
                        </div>
                    </div>
                )}

                {/* Truck list */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {sortedEntries.length === 0 ? (
                        <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>
                            {trucks.length === 0 ? "No trucks yet" : "No matches"}
                        </div>
                    ) : (
                        sortedEntries.map((e) => (
                            <TruckCard
                                key={e.truck.id}
                                data={e.data}
                                now={now}
                                compact={!sidebarOpen}
                                onClick={() => navigate(`/trucks/${e.truck.id}`)}
                                onHoverChange={(h) => setHoveredId(h ? String(e.truck.id) : null)}
                                isHighlighted={hoveredId === String(e.truck.id)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* === Map === */}
            <div style={{ flex: 1, position: "relative" }}>
                <GoogleMapCluster markers={markers} />
            </div>
        </div>
    );
};

export default LiveLocation;
