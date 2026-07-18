import {
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Search,
  UserCircle2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import { Badge, Avatar, Breadcrumb, Input, Dropdown, Space } from "antd";
import { useLocation } from "react-router-dom";

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
  const currentPage = pageTitles[location.pathname] || "Dashboard";

  const profileItems = [
    { key: "1", label: "My Profile" },
    { key: "2", label: "Change Password" },
    { type: "divider" },
    { key: "3", danger: true, label: "Logout" },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <style>{`
        .simse-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          background: #F8FAFC;
          border: 1px solid #F1F5F9;
          transition: background .18s ease;
        }
        .simse-icon-btn:hover { background: #F1F5F9; }
        .simse-search .ant-input-affix-wrapper {
          border-radius: 10px !important;
          border-color: #F1F5F9 !important;
          background: #F8FAFC !important;
          height: 38px;
        }
        .simse-search .ant-input-affix-wrapper:hover,
        .simse-search .ant-input-affix-wrapper-focused {
          border-color: #CBD5E1 !important;
          background: #fff !important;
        }
      `}</style>

      {/* Left Side */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div className="simse-icon-btn" onClick={toggleSidebar}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </div>

        <div >
          <Breadcrumb
            separator={<ChevronRight size={12} />}
            items={[{ title: "Admin" }, { title: currentPage }]}
            style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4, color: "#94A3B8", justifyContent: "center", borderRadius: 10, background: "#F8FAFC" }}
          />
        </div>
      </div>

      {/* Right Side */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Input
          className="simse-search"
          placeholder="Search..."
          prefix={<Search size={15} color="#94A3B8" />}
          style={{ width: 230, fontSize: 13 }}
        />

        <Badge count={5} size="small" color="#111827">
          <div className="simse-icon-btn">
            <Bell size={17} />
          </div>
        </Badge>

        <div style={{ width: 1, height: 28, background: "#F1F5F9" }} />

        <Dropdown menu={{ items: profileItems }} trigger={["click"]}>
          <Space style={{ cursor: "pointer" }} size={8}>
            <Avatar size={36} style={{ background: "#2563EB" }} icon={<UserCircle2 size={18} />} />
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