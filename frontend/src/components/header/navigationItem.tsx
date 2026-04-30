import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { NavigationItemProps } from "./types";

const NavigationItem: React.FC<NavigationItemProps> = ({
  icon: Icon,
  title,
  badge,
  dropdownKey,
  dropdownItems,
  dropdownStates,
  toggleDropdown,
}) => {
  const hasDropdown = dropdownItems && dropdownItems.length > 0;
  const isDropdownOpen = dropdownKey ? dropdownStates[dropdownKey] : false;

  return (
    <div>
      <div
        className={`nav-item d-flex align-items-center justify-content-between px-3 py-2 text-light ${
          title === "Dashboard" ? "active bg-secondary" : ""
        }`}
        onClick={() => hasDropdown && dropdownKey ? toggleDropdown(dropdownKey) : undefined}
        style={{ cursor: hasDropdown ? "pointer" : "default" }}
      >
        <div className="d-flex align-items-center">
          <Icon size={20} />
          <span className="ms-2">{title}</span>
        </div>
        <div className="d-flex align-items-center">
          {badge && <span className="badge bg-danger me-2">{badge}</span>}
          {hasDropdown && (isDropdownOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </div>
      </div>

      {hasDropdown && isDropdownOpen && dropdownItems && (
        <div className="ms-4 border-start border-secondary">
          {dropdownItems.map((item, index) => (
            <div
              key={index}
              className="nav-item px-3 py-2 text-muted d-flex align-items-center"
            >
              <ChevronRight size={14} />
              <span className="ms-2 small">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavigationItem;
