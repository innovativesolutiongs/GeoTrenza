import type { Dispatch, SetStateAction } from "react";

export interface HeaderProps {
  searchEmployee: string;
  setSearchEmployee: Dispatch<SetStateAction<string>>;
  toggleSidebar: () => void;
}

export interface SidebarProps {
  sidebarOpen: boolean;
  searchPhone: string;
  setSearchPhone: Dispatch<SetStateAction<string>>;
  dropdownStates: Record<string, boolean>;
  toggleDropdown: (key: string) => void;
}

export interface TicketData {
  employee: string;
  shift: string;
  technical: { created: number; closed: number; both: number };
  management: { created: number; closed: number; both: number };
  mayaCalls: { notPicked: number; picked: number };
}

export interface NavigationItemProps {
  icon: React.ComponentType<any>;
  title: string;
  badge?: number;
  dropdownKey?: string;
  dropdownItems?: { label: string; href: string }[];
  dropdownStates: Record<string, boolean>;
  toggleDropdown: (key: string) => void;
}
