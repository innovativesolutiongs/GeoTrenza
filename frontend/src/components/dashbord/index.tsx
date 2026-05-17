import React, { useEffect, useMemo } from "react";
import { Truck, Activity, Navigation, AlertTriangle } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { fetchTrucks } from "../store/truckSlice";
import { fetchDevices } from "../store/deviceSlice";
import { useLivePositions } from "../hooks/useLivePositions";
import { useAnimationTick } from "../hooks/useAnimationTick";
import { classifyMarker } from "../utils/signalBlending";
import type { MarkerState } from "../utils/constants";
import UniversalSearchBar from "../shared/UniversalSearchBar";

interface Tile {
  label: string;
  value: number;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

const Dashboard: React.FC = () => {
  const dispatch = useDispatch();
  const trucks = useSelector((s: RootState) => s.truck.trucks);
  const devices = useSelector((s: RootState) => s.device.devices);
  const { positions } = useLivePositions();
  const now = useAnimationTick();

  useEffect(() => {
    dispatch(fetchTrucks() as any);
    dispatch(fetchDevices() as any);
  }, [dispatch]);

  // Classify each truck's newest position into a marker state, then count.
  const counts = useMemo(() => {
    const devicesByTruckId = new Map<string, any[]>();
    for (const d of devices) {
      if (!d.truck_id) continue;
      const k = String(d.truck_id);
      const arr = devicesByTruckId.get(k) ?? [];
      arr.push(d);
      devicesByTruckId.set(k, arr);
    }
    const positionByDeviceId = new Map<string, any>();
    for (const p of positions) positionByDeviceId.set(String(p.device_id), p);

    let total = 0, active = 0, moving = 0, offline = 0;
    for (const t of trucks) {
      total += 1;
      const devs = devicesByTruckId.get(String(t.id)) ?? [];
      let newest: any = null;
      for (const d of devs) {
        const p = positionByDeviceId.get(String(d.id));
        if (!p) continue;
        if (!newest || new Date(p.recorded_at) > new Date(newest.recorded_at)) newest = p;
      }
      const state: MarkerState = newest ? classifyMarker(newest, now) : "OFFLINE";
      if (state === "OFFLINE") offline += 1;
      else active += 1;
      if (state === "ACTIVE_MOVING") moving += 1;
    }
    return { total, active, moving, offline };
  }, [trucks, devices, positions, now]);

  const tiles: Tile[] = [
    { label: "Total trucks", value: counts.total, Icon: Truck, color: "#3b82f6" },
    { label: "Active now", value: counts.active, Icon: Activity, color: "#22c55e" },
    { label: "Moving now", value: counts.moving, Icon: Navigation, color: "#0ea5e9" },
    { label: "Offline", value: counts.offline, Icon: AlertTriangle, color: "#ef4444" },
  ];

  return (
    <div style={{ padding: 24, background: "#f4f6f9", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, marginBottom: 12, color: "#111827" }}>Fleet overview</h2>
        <div style={{ maxWidth: 560 }}>
          <UniversalSearchBar autoFocus placeholder="Search trucks, devices…" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {tiles.map(({ label, value, Icon, color }) => (
          <div key={label} style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 18,
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              width: 44, height: 44,
              borderRadius: 10,
              background: `${color}22`,
              color, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={22} />
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: 26, color: "#111827" }}>{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
