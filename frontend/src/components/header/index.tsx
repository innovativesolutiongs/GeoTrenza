import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";

import { fetchDevices } from "../store/deviceSlice";
import { userLogout, signoutUser } from "../store/loginSlice";

interface HeaderProps {
  searchEmployee: string;
  setSearchEmployee: React.Dispatch<React.SetStateAction<string>>;
  toggleSidebar: () => void;
  sidebarOpen: boolean;
}

const HeaderPage: React.FC<HeaderProps> = ({
  searchEmployee,
  setSearchEmployee,
  toggleSidebar,
  sidebarOpen,
}) => {
  const [open, setOpen] = useState(false);
  const [filteredDevices, setFilteredDevices] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const devices = useSelector((state: any) => state.device.devices);

  // ✅ Load devices
  useEffect(() => {
    dispatch(fetchDevices() as any);
  }, [dispatch]);

  // ✅ Clear search on route change
  useEffect(() => {
    setSearchEmployee("");
    setFilteredDevices([]);
  }, [location.pathname]);

  // ✅ Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setFilteredDevices([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Logout
  const handleLogout = async () => {
    try {
      await dispatch(userLogout() as any);
    } catch {
      dispatch(signoutUser());
    }

    toast.success("Logged out successfully!", { autoClose: 1000 });
    navigate("../login");
  };

  // ✅ Search
  const handleSearch = (value: string) => {
    setSearchEmployee(value);

    if (!value) {
      setFilteredDevices([]);
      return;
    }

    const filtered = devices.filter((d: any) =>
      d.deviceName?.toLowerCase().includes(value.toLowerCase()) ||
      d.imei?.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredDevices(filtered);
  };

  // console.log(filteredDevices)

  return (
    <header className="app-header d-flex align-items-center justify-content-between p-2 border-bottom">
      
      {/* Sidebar Toggle */}
      <button onClick={toggleSidebar} className="btn btn-outline-primary me-2">
        ☰ {sidebarOpen ? "" : ""}
      </button>

      {/* Logo */}
      <div style={{ width: "16%" }}>
        <img
          src="../../../src/assets/logo.png"
          alt="Logo"
          style={{ width: 150 }}
        />
      </div>

      {/* Search */}
      <div className="position-relative w-25" ref={searchRef}>
        <input
          type="text"
          className="form-control"
          placeholder="Search Device..."
          value={searchEmployee}
          onChange={(e) => handleSearch(e.target.value)}
        />

        {/* Dropdown */}
        {searchEmployee && filteredDevices.length > 0 && (
          <ul
            className="list-group position-absolute w-100"
            style={{ zIndex: 1000, maxHeight: "200px", overflowY: "auto" }}
          >
            {filteredDevices.map((d: any) => (
              <li
                key={d.id}
                className="list-group-item list-group-item-action"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setSearchEmployee("");       // ✅ clear search
                  setFilteredDevices([]);      // ✅ hide dropdown
                  navigate(`/devicemaster`); // ✅ go to page
                }}
              >
                {d.deviceName} - {d.deviceNo}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* User Dropdown */}
      <div className="dropdown position-relative">
        <button
          onClick={() => setOpen(!open)}
          className="btn btn-light dropdown-toggle fw-bold"
        >
          👤
        </button>

        {open && (
          <ul
            className="dropdown-menu dropdown-menu-end show"
            style={{ position: "absolute", right: 0 }}
          >
            <li>
              <button className="dropdown-item">Profile</button>
            </li>
            <li>
              <button className="dropdown-item">Settings</button>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <button
                className="dropdown-item text-danger"
                onClick={handleLogout}
              >
                Logout
              </button>
            </li>
          </ul>
        )}
      </div>
    </header>
  );
};

export default HeaderPage;