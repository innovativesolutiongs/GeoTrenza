import React from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  resourceLabel: string;
  backTo: string;
}

// Placeholder shown wherever a Create/Edit form would render while
// ENABLE_MUTATIONS is false (Stage 3 — backend is GET-only).
const MutationsDisabledNotice: React.FC<Props> = ({ resourceLabel, backTo }) => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 25 }}>
      <div className="alert alert-warning" role="alert">
        <h5 className="mb-2">{resourceLabel} mutations are disabled</h5>
        <p className="mb-2">
          Create, edit, and delete for {resourceLabel.toLowerCase()}s are turned off in this
          environment. Read-only views remain available. Write endpoints return in Stage 4.
        </p>
        <button className="btn btn-dark" onClick={() => navigate(backTo)}>
          Back
        </button>
      </div>
    </div>
  );
};

export default MutationsDisabledNotice;
