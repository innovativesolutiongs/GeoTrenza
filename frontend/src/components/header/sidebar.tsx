import React from "react";
import { useSelector } from "react-redux";
import {
  LayoutDashboard,
  Users,
  Cpu,
  MapPin,
  Settings,
  Bell,
} from "lucide-react";
import { Link } from "react-router-dom";

interface SidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

interface DropdownItem { label: string; href: string }
interface NavigationItemProps {
  icon: React.ElementType;
  title: string;
  badge?: number;
  dropdownItems?: DropdownItem[];
  href?: string;
}

const NavigationItem: React.FC<NavigationItemProps> = ({ icon: Icon, title, badge, dropdownItems, href }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  if (href) {
    return (
      <div className="nav-item">
        <Link to={href} className="nav-link d-flex align-items-center justify-content-between w-100">
          <span className="d-flex align-items-center gap-2"><Icon size={18} />{title}</span>
          {badge && <span className="badge bg-primary ms-2">{badge}</span>}
        </Link>
      </div>
    );
  }
  return (
    <div className="nav-item">
      <button className="nav-link d-flex align-items-center justify-content-between w-100" onClick={() => setIsOpen((p) => !p)}>
        <span className="d-flex align-items-center gap-2"><Icon size={18} />{title}</span>
        {dropdownItems && <span className="ms-auto">{isOpen ? "▾" : "▸"}</span>}
      </button>
      {isOpen && dropdownItems && (
        <div className="ps-4">
          {dropdownItems.map((item, idx) => (
            <Link key={idx} to={item.href} className="nav-link small">{item.label}</Link>
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, toggleSidebar }) => {
  const user = useSelector((state: any) => state.login.userInfo);
  const isAdmin = user?.userTY === "AD";

  return (
    <aside
      className={`bg-light border-end transition-all ${sidebarOpen ? "d-block" : "d-none"}`}
      style={{ width: "250px", minHeight: "100vh" }}
    >
      <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
        <span className="fw-bold">Navigation</span>
        <button className="btn btn-sm btn-outline-white" onClick={toggleSidebar}></button>
      </div>

      <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
        <span className="fw-bold">Welcome, {isAdmin ? user?.userNM : user?.customerName}</span>
      </div>

      <nav className="mt-2 nav flex-column">
        <NavigationItem icon={LayoutDashboard} title="Dashboard" href="/dashboard" />
        <NavigationItem icon={MapPin} title="Live Location" href="/livelocation" />

        {/* Stage 3e admin CRUD — vehicles live nested under customers now,
            so the top-level "All Trucks" entry is gone. "All Allocations"
            disappears entirely (concept replaced by gateway-to-vehicle assignment
            inside the customer detail page). */}
        {isAdmin && (
          <>
            <NavigationItem icon={Users} title="Customers" href="/customers" />
            <NavigationItem icon={Cpu} title="Gateways" href="/gateways" />
          </>
        )}

        {/* Stage 3d Phase 1: alert framework UI */}
        <NavigationItem
          icon={Bell}
          title="Alerts"
          dropdownItems={[
            { label: "Active alerts", href: "/alerts" },
            { label: "Rules", href: "/alert-rules" },
            { label: "My subscriptions", href: "/alert-subscriptions" },
          ]}
        />

        <NavigationItem
          icon={Settings}
          title="Settings"
          dropdownItems={[{ label: "Change Password", href: "/changepassword" }]}
        />
      </nav>
    </aside>
  );
};

export default Sidebar;
