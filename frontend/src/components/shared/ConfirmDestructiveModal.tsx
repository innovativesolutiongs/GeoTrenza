import React, { useState } from "react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  // If set, user must type this exact string to enable Confirm. Stronger
  // friction for production-impacting actions like "UNASSIGN gateway".
  confirmationText?: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const ConfirmDestructiveModal: React.FC<Props> = ({
  open, title, description, confirmationText, confirmLabel, onConfirm, onCancel,
}) => {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;
  const canConfirm = !confirmationText || typed === confirmationText;

  const run = async () => {
    if (!canConfirm) return;
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };

  return (
    <div style={overlay} onClick={onCancel}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: "#b91c1c", fontSize: 18 }}>{title}</h3>
        <p style={{ marginTop: 10, fontSize: 14, color: "#374151" }}>{description}</p>
        {confirmationText && (
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, color: "#6b7280" }}>
              Type <strong style={{ color: "#111827" }}>{confirmationText}</strong> to confirm:
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              style={{
                width: "100%", marginTop: 6, padding: "8px 10px",
                border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14,
              }}
            />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button onClick={onCancel} style={btnSecondary} disabled={busy}>Cancel</button>
          <button
            onClick={run}
            disabled={!canConfirm || busy}
            style={{ ...btnDanger, opacity: canConfirm && !busy ? 1 : 0.55, cursor: canConfirm && !busy ? "pointer" : "not-allowed" }}
          >
            {busy ? "Working…" : (confirmLabel ?? "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(17,24,39,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5000,
};
const card: React.CSSProperties = {
  background: "#fff", padding: 22, borderRadius: 10, width: "min(480px, 90vw)",
  boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
};
const btnSecondary: React.CSSProperties = {
  background: "#f3f4f6", color: "#111827", border: "1px solid #d1d5db",
  padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontSize: 14,
};
const btnDanger: React.CSSProperties = {
  background: "#dc2626", color: "#fff", border: "none",
  padding: "8px 14px", borderRadius: 6, fontSize: 14, fontWeight: 600,
};

export default ConfirmDestructiveModal;
