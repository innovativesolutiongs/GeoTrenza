import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import HeaderPage from "../header";
import Sidebar from "../header/sidebar";
import Footer from "../footer/footer";

// CSS imports
import "../../assets/css/bootstrap.min.css";
import "../../assets/css/bootstrap-extended.css";
import "../../assets/css/app.css";
import "../../assets/css/icons.css";
import "../../assets/css/dark-theme.css";
import "../../assets/css/semi-dark.css";
import "../../assets/css/header-colors.css";

const Layout = () => {
  const location = useLocation();

  // State for header + sidebar
  const [searchEmployee, setSearchEmployee] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // Paths where header & footer should be hidden
  const hideHeaderPaths = ["/login"];
  const shouldHideHeaderFooter = hideHeaderPaths.includes(location.pathname);

  return (
    <div className="app-container d-flex flex-column min-vh-100">
      {/* Header */}
      {!shouldHideHeaderFooter && (
        <HeaderPage
          searchEmployee={searchEmployee}
          setSearchEmployee={setSearchEmployee}
          toggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
      )}

      <div className="d-flex flex-grow-1">
        {/* Sidebar */}
        {!shouldHideHeaderFooter && (
          <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        )}

        {/* Main Content */}
        <main className="flex-grow-1 p-3">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      {!shouldHideHeaderFooter && <Footer />}
    </div>
  );
};

export default Layout;
