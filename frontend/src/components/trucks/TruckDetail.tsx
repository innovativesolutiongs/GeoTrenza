import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store";
import { fetchTrucks } from "../store/truckSlice";
import { fetchDevices } from "../store/deviceSlice";
import truckService from "../services/truckmaster";
import positionService from "../services/positionService";
import GoogleMapCluster from "../dashbord/GoogleMapCluster";
import type { MarkerType } from "../dashbord/GoogleMapCluster";
import { useLivePositions } from "../hooks/useLivePositions";
import { useAnimationTick } from "../hooks/useAnimationTick";
import { interpolatePosition } from "../utils/deadReckoning";
import { classifyMarker, shouldExtrapolate } from "../utils/signalBlending";
import { MARKER_COLORS, MARKER_LABELS } from "../utils/constants";
import type { MarkerState } from "../utils/constants";
import BatteryIcon from "../shared/BatteryIcon";
import PositionTimeline from "./PositionTimeline";
import type { DetectedEvent } from "./PositionTimeline";
import type { Position } from "../store/positionSlice";

const SIDEBAR_MIN = 320;
const SIDEBAR_MAX = 600;
const SIDEBAR_DEFAULT = 400;
const HISTORY_HOURS = 24;
const POLYLINE_MAX_POSITIONS = 50;

const TruckDetail: React.FC = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Sidebar drag-resize state.
  const [sidebarW, setSidebarW] = useState(SIDEBAR_DEFAULT);
  const draggingRef = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
  }, []);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, e.clientX));
      setSidebarW(next);
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Redux: ensure trucks + devices are loaded.
  const trucks = useSelector((s: RootState) => s.truck.trucks);
  const devices = useSelector((s: RootState) => s.device.devices);
  useEffect(() => {
    dispatch(fetchTrucks() as any);
    dispatch(fetchDevices() as any);
  }, [dispatch]);

  // Truck row — first try redux, then API fallback (covers deep links).
  const [truck, setTruck] = useState<any | null>(null);
  useEffect(() => {
    const fromStore = trucks.find((t: any) => String(t.id) === String(id));
    if (fromStore) { setTruck(fromStore); return; }
    truckService.getTruckById(id).then((r) => setTruck(r.data)).catch(() => setTruck(null));
  }, [id, trucks]);

  const truckDevices = useMemo(
    () => devices.filter((d: any) => String(d.truck_id) === String(id)),
    [devices, id]
  );

  // Position history for this truck's devices over the last HISTORY_HOURS.
  const [history, setHistory] = useState<Position[]>([]);
  useEffect(() => {
    if (truckDevices.length === 0) { setHistory([]); return; }
    const to = new Date();
    const from = new Date(to.getTime() - HISTORY_HOURS * 3600 * 1000);
    Promise.all(
      truckDevices.map((d) => positionService.getPositionsForDevice(String(d.id), from.toISOString(), to.toISOString()).then(r => r.data as Position[]))
    ).then((arrays) => {
      const all: Position[] = arrays.flat();
      setHistory(all);
    });
  }, [truckDevices]);

  // Detected events (WIRED only — the endpoint returns [] for asset trackers).
  const [events, setEvents] = useState<DetectedEvent[]>([]);
  useEffect(() => {
    if (!id) return;
    const to = new Date();
    const from = new Date(to.getTime() - HISTORY_HOURS * 3600 * 1000);
    truckService
      .getTruckEvents(id, from.toISOString(), to.toISOString())
      .then((r) => setEvents(r.data))
      .catch(() => setEvents([]));
  }, [id]);

  // Live latest position for marker animation.
  const { positions: livePositions } = useLivePositions();
  const now = useAnimationTick();
  const livePos = useMemo(() => {
    const myDeviceIds = new Set(truckDevices.map((d) => String(d.id)));
    let newest: Position | null = null;
    for (const p of livePositions) {
      if (!myDeviceIds.has(String(p.device_id))) continue;
      if (!newest || new Date(p.recorded_at) > new Date(newest.recorded_at)) newest = p;
    }
    return newest;
  }, [livePositions, truckDevices]);

  const state: MarkerState = livePos ? classifyMarker(livePos, now) : "OFFLINE";
  const stateColor = MARKER_COLORS[state];
  const stateLabel = MARKER_LABELS[state];

  // Polyline path: last N positions sorted ASC.
  const path: [number, number][] = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    const tail = sorted.slice(-POLYLINE_MAX_POSITIONS);
    return tail.map((p) => [p.lat, p.lng] as [number, number]);
  }, [history]);

  // Single marker for the truck — interpolated when ACTIVE_MOVING.
  const markers: MarkerType[] = useMemo(() => {
    if (!livePos) return [];
    const coords = shouldExtrapolate(state)
      ? interpolatePosition(livePos, now)
      : { lat: livePos.lat, lng: livePos.lng };
    return [{
      id: livePos.id,
      lat: coords.lat,
      lng: coords.lng,
      date: livePos.recorded_at,
      speed: livePos.speed_kph ?? 0,
      label: truck?.name ?? truck?.registration_no ?? `truck ${id}`,
      state,
    }];
  }, [livePos, state, now, truck, id]);

  const deviceType = truckDevices[0]?.device_type ?? "UNKNOWN";
  const deviceTypeLabel: Record<string, string> = {
    WIRED: "Wired",
    MAGNETIC_BATTERY: "Magnetic Asset Tracker",
    ASSET_TRACKER: "Asset Tracker",
    UNKNOWN: "—",
  };
  const lastUpdate = livePos?.received_at ?? livePos?.recorded_at ?? null;

  if (!truck) {
    return (
      <div style={{ padding: 24, color: "#6b7280" }}>
        <button onClick={() => navigate("/livelocation")} style={{ marginBottom: 12, background: "none", border: "none", color: "#3b82f6", cursor: "pointer" }}>
          ← Back to fleet
        </button>
        <div>Loading truck {id}…</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)", background: "#f4f6f9" }}>
      {/* === Sidebar === */}
      <div style={{
        width: sidebarW,
        background: "#ffffff",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Identity card */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #e5e7eb" }}>
          <button
            onClick={() => navigate("/livelocation")}
            style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 0, marginBottom: 8, fontSize: 12 }}
          >
            ← Fleet
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: "#111827" }}>
                {truck.name ?? truck.registration_no}
              </h2>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{truck.registration_no}</div>
            </div>
            <BatteryIcon percentLevel={null} size={52} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", marginTop: 14, fontSize: 13 }}>
            <span style={{ color: "#9ca3af" }}>Status</span>
            <span style={{ fontWeight: 500 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: stateColor, marginRight: 6 }} />
              {stateLabel}
            </span>

            <span style={{ color: "#9ca3af" }}>Year</span>
            <span>—</span>

            <span style={{ color: "#9ca3af" }}>Make</span>
            <span>—</span>

            <span style={{ color: "#9ca3af" }}>Model</span>
            <span>{truck.model ?? "—"}</span>

            <span style={{ color: "#9ca3af" }}>Manufacturer</span>
            <span>—</span>

            <span style={{ color: "#9ca3af" }}>Device</span>
            <span>{deviceTypeLabel[deviceType] ?? deviceType}</span>

            <span style={{ color: "#9ca3af" }}>Last update</span>
            <span>{lastUpdate ? new Date(lastUpdate).toLocaleString() : "—"}</span>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{
            padding: "10px 14px", fontSize: 11, fontWeight: 600,
            color: "#6b7280", background: "#f9fafb",
            textTransform: "uppercase", letterSpacing: 0.5,
            borderBottom: "1px solid #e5e7eb",
          }}>
            Last {HISTORY_HOURS}h
          </div>
          <PositionTimeline positions={history} events={events} deviceType={deviceType} />
        </div>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          width: 4,
          cursor: "col-resize",
          background: "#e5e7eb",
          flexShrink: 0,
        }}
      />

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <GoogleMapCluster markers={markers} path={path} height="100%" />
      </div>
    </div>
  );
};

export default TruckDetail;
