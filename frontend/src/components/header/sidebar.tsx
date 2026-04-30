import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  ShoppingCart,
  Cookie,
  Settings,
} from "lucide-react";
import { Link } from "react-router-dom";

interface SidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

interface DropdownItem {
  label: string;
  href: string;
}

interface NavigationItemProps {
  icon: React.ElementType;
  title: string;
  badge?: number;
  dropdownItems?: DropdownItem[];
  href?: string; // Added href for direct links
}

const NavigationItem: React.FC<NavigationItemProps> = ({
  icon: Icon,
  title,
  badge,
  dropdownItems,
  href,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    if (dropdownItems) {
      setIsOpen((prev) => !prev);
    }
  };

  // Render as direct link if href exists
  if (href) {
    return (
      <div className="nav-item">
        <Link
          to={href}
          className="nav-link d-flex align-items-center justify-content-between w-100"
        >
          <span className="d-flex align-items-center gap-2">
            <Icon size={18} />
            {title}
          </span>
          {badge && <span className="badge bg-primary ms-2">{badge}</span>}
        </Link>
      </div>
    );
  }

  // Render as dropdown if dropdownItems exist
  return (
    <div className="nav-item">
      <button
        className="nav-link d-flex align-items-center justify-content-between w-100"
        onClick={toggleDropdown}
      >
        <span className="d-flex align-items-center gap-2">
          <Icon size={18} />
          {title}
        </span>
        {badge && <span className="badge bg-primary ms-2">{badge}</span>}
        {dropdownItems && <span className="ms-auto">{isOpen ? "▾" : "▸"}</span>}
      </button>

      {isOpen && dropdownItems && (
        <div className="ps-4">
          {dropdownItems.map((item, idx) => (
            <Link key={idx} to={item.href} className="nav-link small">
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, toggleSidebar }) => {
  const user = useSelector((state: any) => state.login.userInfo);
  console.log(user);
  // const mAutoID = user?.mAutoID;

  return (
    <aside
      className={`bg-light border-end transition-all ${sidebarOpen ? "d-block" : "d-none"
        }`}
      style={{ width: "250px", minHeight: "100vh" }}
    >
      <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
        <span className="fw-bold">Navigation</span>
        <button className="btn btn-sm btn-outline-white" onClick={toggleSidebar}></button>
      </div>

      <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
        <span className="fw-bold">Welcome, {user?.userTY === "AD" ? user?.userNM : user?.customerName}</span>
      </div>

      {/* Navigation */}
      <nav className="mt-2 nav flex-column">
        <NavigationItem icon={Cookie} title="Dashboard" href="/dashboard" />

      <NavigationItem
  icon={ShoppingCart}
  title="Masters"
  dropdownItems={
    user?.userTY === "AD"
      ? [
          { label: "All Customers", href: "/customer" },
          { label: "All Trucks", href: "/truckmaster" },
          { label: "All Devices", href: "/devicemaster" },
          { label: "All Allocations", href: "/allocationmaster" },
          { label: "Live Location", href: "/livelocation" },
          // { label: "Truck Routes", href: "/truckroutes" },
        ]
      : [
          { label: "All Trucks", href: "/truckmaster" },
          { label: "All Devices", href: "/devicemaster" },
        ]
  }
/>

        {user?.userTY === "AD" && (
          <NavigationItem
            icon={Settings}
            title="Settings"
            dropdownItems={[
              { label: "Change Password", href: "/changepassword" },
            ]}
          />
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
