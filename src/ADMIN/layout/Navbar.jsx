import {
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Search,
  UserCircle2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import { Avatar, Breadcrumb, Input, Dropdown, Space, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../Authentication/context/AuthContext";

const pageTitles = {
  "/admin/dashboard": "Dashboard",
  "/admin/production": "Production",
  "/admin/tracking": "Tracking",
  "/admin/users": "Users",
  "/admin/masters": "Masters",
  "/admin/reports": "Reports",
  "/admin/settings": "Settings",
};

const Navbar = ({ collapsed, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = pageTitles[location.pathname] || "Dashboard";
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      message.success("Logged out successfully");
      navigate("/login"); // adjust to your actual login route
    } catch (err) {
      message.error("Something went wrong while logging out");
    }
  };

  const profileMenu = {
    items: [
      { key: "1", label: "My Profile" },
      { key: "2", label: "Change Password" },
      { type: "divider" },
      { key: "3", danger: true, label: "Logout" },
    ],
    onClick: ({ key }) => {
      if (key === "3") handleLogout();
      // TODO: hook up "1" / "2" navigation as needed
    },
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 4px",
      }}
    >
      {/* ...styles unchanged... */}

      {/* Left Side unchanged */}

      {/* Right Side */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", justifyContent: "flex-end" }}>
        <Input
          className="simse-search"
          placeholder="Search..."
          prefix={<Search size={15} color="#94A3B8" style={{ marginRight: 2 }} />}
          suffix={<kbd>⌘K</kbd>}
          style={{ width: 240, fontSize: 13 }}
        />

        <div className="simse-icon-btn">
          <Bell size={17} />
          <span className="simse-notif-dot" />
        </div>

        <div style={{ width: 1, height: 28, background: "#F1F5F9" }} />

        <Dropdown menu={profileMenu} trigger={["click"]}>
          <Space className="simse-profile-trigger" size={10} style={{ marginLeft: "auto" }}>
            <div className="simse-avatar-ring">
              <Avatar
                size={32}
                style={{ background: "#fff", color: "#3b5ce2" }}
                icon={<UserCircle2 size={18} />}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", lineHeight: 1.2 }}>
                Admin
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.2 }}>
                System Administrator
              </div>
            </div>
            <ChevronDown size={14} color="#94A3B8" />
          </Space>
        </Dropdown>
      </div>
    </div>
  );
};

export default Navbar;