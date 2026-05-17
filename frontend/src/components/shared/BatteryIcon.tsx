import React from "react";

interface Props {
  percentLevel: number | null | undefined;
  size?: number; // outer pixel width
}

// Apple-style battery icon. Fill rectangle scales with percent; numeric
// percent overlays the icon. Null/undefined → gray outline + tooltip.
const BatteryIcon: React.FC<Props> = ({ percentLevel, size = 40 }) => {
  const w = size;
  const h = Math.round(size * 0.5);
  const bodyW = w - 4;
  const bodyH = h - 2;
  const nubW = 3;
  const nubH = Math.round(h * 0.4);

  if (percentLevel == null) {
    return (
      <span title="Not available" style={{ display: "inline-block", lineHeight: 0 }}>
        <svg width={w + nubW} height={h} viewBox={`0 0 ${w + nubW} ${h}`}>
          <rect x="1" y="1" width={bodyW} height={bodyH} rx="3" ry="3" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
          <rect x={bodyW + 1} y={(h - nubH) / 2} width={nubW} height={nubH} fill="#9ca3af" />
          <text x={w / 2} y={h / 2 + 4} fontSize={Math.round(h * 0.5)} fill="#9ca3af" textAnchor="middle" fontWeight="600">—</text>
        </svg>
      </span>
    );
  }

  const pct = Math.max(0, Math.min(100, percentLevel));
  const fillW = Math.round((bodyW - 2) * (pct / 100));
  const color = pct < 20 ? "#ef4444" : pct < 50 ? "#eab308" : "#22c55e";
  const textColor = pct < 35 ? "#111827" : "#ffffff";

  return (
    <span title={`Battery ${Math.round(pct)}%`} style={{ display: "inline-block", lineHeight: 0 }}>
      <svg width={w + nubW} height={h} viewBox={`0 0 ${w + nubW} ${h}`}>
        <rect x="1" y="1" width={bodyW} height={bodyH} rx="3" ry="3" fill="none" stroke="#374151" strokeWidth="1.5" />
        <rect x={bodyW + 1} y={(h - nubH) / 2} width={nubW} height={nubH} fill="#374151" />
        <rect x="2" y="2" width={fillW} height={bodyH - 2} rx="2" ry="2" fill={color} />
        <text
          x={w / 2}
          y={h / 2 + Math.round(h * 0.18)}
          fontSize={Math.round(h * 0.55)}
          fill={textColor}
          textAnchor="middle"
          fontWeight="700"
        >
          {Math.round(pct)}
        </text>
      </svg>
    </span>
  );
};

export default BatteryIcon;
