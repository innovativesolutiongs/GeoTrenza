import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createDevice, resetDeviceState } from "../store/deviceSlice";
import { toast } from "react-toastify";
import type { DevicePayload } from "../services/deviceService";
import { ENABLE_MUTATIONS } from "../config/features";
import MutationsDisabledNotice from "../utils/MutationsDisabledNotice";

const CreateDeviceMaster = () => {
  if (!ENABLE_MUTATIONS) {
    return <MutationsDisabledNotice resourceLabel="Device" backTo="/devicemaster" />;
  }

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { success, error, loading } = useSelector((state: any) => state.device);
  const user = useSelector((state: any) => state.login.userInfo);
  const userId = user?.userID;

  const [deviceNo, setDeviceNo] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [statusID, setstatusID] = useState("1"); // "1" = Active
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!deviceNo.trim()) {
      toast.error("Device No is required");
      return;
    }

    if (!deviceName.trim()) {
      toast.error("Device Name is required");
      return;
    }

    dispatch(resetDeviceState());

    try {
      const payload: DevicePayload = {
        deviceNo,
        deviceName,
        statusID,
        userID: userId,
      };

      console.log(payload)

      await dispatch(createDevice(payload) as any);
      setSubmitted(true);
    } catch {
      toast.error("Failed to create device");
    }
  };

  useEffect(() => {
    if (!submitted) return;

    if (success) {
      toast.success("Device Added Successfully");

      setDeviceNo("");
      setDeviceName("");
      setstatusID("1");
      setSubmitted(false);

      setTimeout(() => navigate("/devicemaster"), 1500);
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
          <span className="text-muted">Device Master :</span>
          <span className="fw-semibold text-dark"> Create New</span>
        </div>

        <div>
          <button className="btn btn-dark me-2" onClick={() => navigate("/devicemaster")}>
            View All
          </button>
          <button className="btn btn-dark" onClick={() => navigate("/create-device")}>
            Create New
          </button>
        </div>
      </div>

      {loading && <p className="text-center py-2">Loading...</p>}

      <div className="card p-4">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-sm-4">
              <label>Device No *</label>
              <input
                className="form-control"
                value={deviceNo}
                onChange={(e) => setDeviceNo(e.target.value)}
              />
            </div>

            <div className="col-sm-4">
              <label>Device Name *</label>
              <input
                className="form-control"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>

            <div className="col-sm-4">
              <label>statusID</label>
              <select
                className="form-control"
                value={statusID}
                onChange={(e) => setstatusID(e.target.value)}
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

export default CreateDeviceMaster;
