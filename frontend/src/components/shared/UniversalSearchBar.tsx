import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

interface Props {
  placeholder?: string;
  autoFocus?: boolean;
  // If set, search only filters this list visually rather than navigating.
  // Used by the sidebar so typing narrows the truck list in place.
  onQueryChange?: (query: string) => void;
}

interface Match {
  kind: "truck" | "device";
  id: string;
  title: string;
  subtitle: string;
}

// 300ms debounce on the input so we're not re-running matches on every keystroke.
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

const UniversalSearchBar: React.FC<Props> = ({ placeholder, autoFocus, onQueryChange }) => {
  const navigate = useNavigate();
  const trucks = useSelector((s: RootState) => s.truck.trucks);
  const devices = useSelector((s: RootState) => s.device.devices);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(query, 300);
  const rootRef = useRef<HTMLDivElement>(null);

  // Notify parent of debounced query (sidebar uses this for in-place filtering).
  useEffect(() => {
    onQueryChange?.(debounced);
  }, [debounced, onQueryChange]);

  // Close dropdown on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches: Match[] = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return [];
    const out: Match[] = [];
    for (const t of trucks) {
      const hay = `${t.name ?? ""} ${t.registration_no}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          kind: "truck",
          id: String(t.id),
          title: t.name ?? t.registration_no,
          subtitle: t.registration_no,
        });
      }
    }
    for (const d of devices) {
      const hay = `${d.terminal_id} ${d.imei ?? ""}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          kind: "device",
          id: String(d.id),
          title: d.terminal_id,
          subtitle: d.model ? `Model ${d.model}` : "Device",
        });
      }
    }
    return out.slice(0, 50);
  }, [debounced, trucks, devices]);

  const trucksMatches = matches.filter((m) => m.kind === "truck");
  const devicesMatches = matches.filter((m) => m.kind === "device");

  const onPick = (m: Match) => {
    setOpen(false);
    setQuery("");
    if (m.kind === "truck") navigate(`/trucks/${m.id}`);
    else navigate(`/devices/${m.id}`);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Search trucks, devices…"}
        style={{
          width: "100%",
          padding: "10px 14px",
          fontSize: 14,
          border: "1px solid #d1d5db",
          borderRadius: 8,
          outline: "none",
          background: "#ffffff",
        }}
      />

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0, right: 0,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
          maxHeight: 360,
          overflowY: "auto",
          zIndex: 1000,
        }}>
          {!debounced.trim() && (
            <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>
              Type to search the fleet
            </div>
          )}

          {debounced.trim() && matches.length === 0 && (
            <div style={{ padding: 16, color: "#6b7280", fontSize: 13 }}>
              No matches found
            </div>
          )}

          {trucksMatches.length > 0 && (
            <div>
              <div style={{
                padding: "8px 14px", fontSize: 11, fontWeight: 600,
                color: "#6b7280", background: "#f9fafb",
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>Trucks</div>
              {trucksMatches.map((m) => (
                <div
                  key={`t-${m.id}`}
                  onClick={() => onPick(m)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{m.title}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{m.subtitle}</div>
                </div>
              ))}
            </div>
          )}

          {devicesMatches.length > 0 && (
            <div>
              <div style={{
                padding: "8px 14px", fontSize: 11, fontWeight: 600,
                color: "#6b7280", background: "#f9fafb",
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>Devices</div>
              {devicesMatches.map((m) => (
                <div
                  key={`d-${m.id}`}
                  onClick={() => onPick(m)}
                  style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{m.title}</div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>{m.subtitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UniversalSearchBar;
