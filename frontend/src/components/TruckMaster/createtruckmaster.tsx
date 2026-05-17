import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createTruck, resetTruckState } from "../store/truckSlice";
import { toast } from "react-toastify";
import { ENABLE_MUTATIONS } from "../config/features";
import MutationsDisabledNotice from "../utils/MutationsDisabledNotice";

const CreateTruckMaster = () => {
  if (!ENABLE_MUTATIONS) {
    return <MutationsDisabledNotice resourceLabel="Truck" backTo="/truckmaster" />;
  }

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { success, error, loading } = useSelector((state: any) => state.truck);
  const user = useSelector((state: any) => state.login.userInfo);

  const userId = user?.userID;

  // console.log("User ID:", userId);



  const [truckNo, setTruckNo] = useState("");
  const [regoNo, setRegoNo] = useState("");
  const [modelNo, setModelNo] = useState("");
  const [statusID, setStatusID] = useState("1");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!truckNo.trim()) {
      toast.error("Truck No is required");
      return;
    }

    if (!regoNo.trim()) {
      toast.error("Rego No is required");
      return;
    }

    if (!modelNo.trim()) {
      toast.error("Model No is required");
      return;
    }

    dispatch(resetTruckState());

    try {
      await dispatch(
        createTruck({
          truckNo,
          regoNo,
          modelNo,
          statusID,
          userID:userId
        }) as any
      );

      setSubmitted(true);
    } catch {
      toast.error("Failed to create truck");
    }
  };

  useEffect(() => {
    if (!submitted) return;

    if (success) {
      toast.success("Truck Added Successfully");

      setTruckNo("");
      setRegoNo("");
      setModelNo("");
      setStatusID("1");
      setSubmitted(false);

      setTimeout(() => navigate("/truckmaster"), 1500);
    }

    if (error) {
      toast.error(error);
      setSubmitted(false);
    }
  }, [success, error, submitted, navigate]);

  return (
    <div className="container-fluid mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="fw-bold fs-5">Masters</span>
          <span className="mx-2 text-muted">&gt;</span>
          <span className="text-muted">Truck Master :</span>
          <span className="fw-semibold text-dark"> Create New</span>
        </div>

        <div>
          <button className="btn btn-dark me-2" onClick={() => navigate("/truckmaster")}>
            View All
          </button>
          <button className="btn btn-dark" onClick={() => navigate("/createtruckmaster")}>
            Create New
          </button>
        </div>
      </div>

      {loading && <p className="text-center py-2">Loading...</p>}

      <div className="card p-4">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-sm-3">
              <label>Truck No *</label>
              <input
                className="form-control"
                value={truckNo}
                onChange={(e) => setTruckNo(e.target.value)}
              />
            </div>

            <div className="col-sm-3">
              <label>Rego No *</label>
              <input
                className="form-control"
                value={regoNo}
                onChange={(e) => setRegoNo(e.target.value)}
              />
            </div>

            <div className="col-sm-3">
              <label>Model No *</label>
              <input
                className="form-control"
                value={modelNo}
                onChange={(e) => setModelNo(e.target.value)}
              />
            </div>

            <div className="col-sm-3">
              <label>Status</label>
              <select
                className="form-control"
                value={statusID}
                onChange={(e) => setStatusID(e.target.value)}
              >
                <option value="1">Active</option>
                <option value="2">Inactive</option>
              </select>
            </div>
          </div>

          <hr className="mt-4" />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving..." : "Save Master"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTruckMaster;
