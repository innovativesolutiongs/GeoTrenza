import React, { useEffect } from "react";
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

interface MarkerType {
  id: number;
  lat: number;
  lng: number;
  date?: string;
  speed?: number;
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

/* ================= AUTO FIT BOUNDS ================= */

const FitBounds: React.FC<{ markers: MarkerType[] }> = ({ markers }) => {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(
        markers.map((m) => [m.lat, m.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);

  return null;
};

/* ================= COMPONENT ================= */

const GoogleMapCluster: React.FC<MapProps> = ({ markers = [] }) => {
  return (
    <MapContainer
      center={defaultCenter}
      zoom={8}
      style={{ width: "100%", height: "500px" }}
    >
      {/* Map Tiles */}
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Auto Zoom to All Markers */}
      <FitBounds markers={markers} />

      {/* Marker Clustering */}
      <MarkerClusterGroup chunkedLoading>
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]}>
            <Popup>
              <div style={{ fontSize: "14px" }}>
                <strong>ID:</strong> {marker.id} <br />
                <strong>Lat:</strong> {marker.lat} <br />
                <strong>Lng:</strong> {marker.lng} <br />
                <strong>Date:</strong>{" "}
                {marker.date
                  ? new Date(marker.date).toLocaleString()
                  : "N/A"}{" "}
                <br />
                <strong>Speed:</strong> {marker.speed ?? 0} km/h
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default GoogleMapCluster;