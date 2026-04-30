import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  changePassword,
  resetChangePasswordState,
} from "../../store/changePasswordSlice";
import { toast } from "react-toastify";

const ChangePassword: React.FC = () => {
  const dispatch = useDispatch<any>();

  const { loading, success, error } = useSelector(
    (state: any) => state.changePassword
  );

  const customerID = useSelector(
    (state: any) => state.login.userInfo?.customerID
  );

  console.log(customerID);

  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { oldPassword, newPassword, confirmPassword } = formData;

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill all required fields!");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (!customerID) {
      toast.error("Customer ID not found!");
      return;
    }

    dispatch(
      changePassword({
        customerID,
        oldPassword,
        newPassword,
        confirmPassword,
      })
    );
  };

  useEffect(() => {
    if (success) {
      toast.success("Password updated successfully!");
      setFormData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      dispatch(resetChangePasswordState());
    }

    if (error) {
      toast.error(error);
      dispatch(resetChangePasswordState());
    }
  }, [success, error, dispatch]);

  useEffect(() => {
    if (success) {
      toast.success("Password updated successfully!");
      setFormData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      dispatch(resetChangePasswordState());
    }

    if (error) {
      toast.error(error);
      dispatch(resetChangePasswordState());
    }
  }, [success, error, dispatch]);

  return (
    <div className="row">
      <div className="col-12 py-4 px-4">
        <div className="card shadow-sm">
          <div className="card-header bg-secondary text-white">
            <h5 className="mb-0 fw-semibold">Change Password</h5>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Old Password <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  className="form-control w-50"
                  name="oldPassword"
                  value={formData.oldPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  New Password <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  className="form-control w-50"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">
                  Confirm Password <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  className="form-control w-50"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              <hr />

              <button
                type="submit"
                className="btn btn-secondary px-4"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
