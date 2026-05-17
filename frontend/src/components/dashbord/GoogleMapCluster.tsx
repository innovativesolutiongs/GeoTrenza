import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ================= TYPES ================= */

export interface MarkerType {
  id: number | string;
  lat: number;
  lng: number;
  date?: string;
  speed?: number;
  label?: string;
  // Stage 3b: visual confidence decay. isStale = data >60s old (yellow tint),
  // isFrozen = data >120s old or signal-blended stationary (red tint).
  isStale?: boolean;
  isFrozen?: boolean;
}

interface MapProps {
  markers: MarkerType[];
}

/* ================= DEFAULT CENTER (PUNJAB) ================= */

const defaultCenter: [number, number] = [30.9, 75.85]; // Covers Ludhiana & Moga

/* ================= FIX LEAFLET ICON ================= */

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ================= STATE-COLORED DIV ICON ================= */

const COLOR_FRESH = "#28a745";
const COLOR_STALE = "#ffc107";
const COLOR_FROZEN = "#dc3545";

const buildIcon = (isStale: boolean, isFrozen: boolean): L.DivIcon => {
  const color = isFrozen ? COLOR_FROZEN : isStale ? COLOR_STALE : COLOR_FRESH;
  const opacity = isFrozen ? 0.6 : isStale ? 0.8 : 1;
  return L.divIcon({
    className: "truck-marker",
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,0.5);opacity:${opacity}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

/* ================= AUTO FIT BOUNDS ================= */

// Fit bounds once on first non-empty markers list to avoid jumping the map
// every time a marker shifts a few meters under dead reckoning.
const FitBoundsOnce: React.FC<{ markers: MarkerType[] }> = ({ markers }) => {
  const map = useMap();
  const fittedRef = React.useRef(false);

  useEffect(() => {
    if (fittedRef.current) return;
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
    fittedRef.current = true;
  }, [markers, map]);

  return null;
};

/* ================= COMPONENT ================= */

const GoogleMapCluster: React.FC<MapProps> = ({ markers = [] }) => {
  // Cache icons so identical states share one icon instance.
  const icons = useMemo(
    () => ({
      fresh: buildIcon(false, false),
      stale: buildIcon(true, false),
      frozen: buildIcon(false, true),
    }),
    []
  );

  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
      style={{ width: "100%", height: "500px" }}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBoundsOnce markers={markers} />

      <MarkerClusterGroup chunkedLoading>
        {markers.map((marker) => {
          const icon = marker.isFrozen
            ? icons.frozen
            : marker.isStale
            ? icons.stale
            : icons.fresh;
          return (
            <Marker
              key={marker.id}
              position={[marker.lat, marker.lng]}
              icon={icon}
            >
              <Popup>
                <div style={{ fontSize: "14px" }}>
                  {marker.label && (
                    <>
                      <strong>{marker.label}</strong> <br />
                    </>
                  )}
                  <strong>ID:</strong> {marker.id} <br />
                  <strong>Lat:</strong> {marker.lat.toFixed(5)} <br />
                  <strong>Lng:</strong> {marker.lng.toFixed(5)} <br />
                  <strong>Speed:</strong> {marker.speed ?? 0} km/h <br />
                  <strong>Last update:</strong>{" "}
                  {marker.date
                    ? new Date(marker.date).toLocaleTimeString()
                    : "N/A"}{" "}
                  <br />
                  <strong>Status:</strong>{" "}
                  {marker.isFrozen
                    ? "Frozen (stale > 2 min)"
                    : marker.isStale
                    ? "Stale (no update > 1 min)"
                    : "Live"}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default GoogleMapCluster;
