import {
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Search,
  UserCircle2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import { Avatar, Breadcrumb, Input, Dropdown, Space } from "antd";
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
        padding: "0 4px",
      }}
    >
      <style>{`
        .simse-icon-btn {
          position: relative;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          background: #F8FAFC;
          border: 1px solid #F1F5F9;
          color: #64748B;
          transition: background .18s ease, color .18s ease, border-color .18s ease, transform .12s ease;
        }
        .simse-icon-btn:hover {
          background: #EFF3FF;
          border-color: #DCE4FB;
          color: #3b5ce2;
        }
        .simse-icon-btn:active {
          transform: scale(0.94);
        }

        .simse-notif-dot {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          border: 2px solid #fff;
          box-shadow: 0 0 0 0 rgba(239,68,68,0.6);
          animation: notifPulse 2.2s infinite;
        }
        @keyframes notifPulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.45); }
          70%  { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }

        .simse-search .ant-input-affix-wrapper {
          border-radius: 10px !important;
          border-color: #F1F5F9 !important;
          background: #F8FAFC !important;
          height: 38px;
          transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, width .2s ease;
        }
        .simse-search .ant-input-affix-wrapper:hover {
          border-color: #CBD5E1 !important;
          background: #fff !important;
        }
        .simse-search .ant-input-affix-wrapper-focused {
          border-color: #3b82f6 !important;
          background: #fff !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important;
        }
        .simse-search kbd {
          font-family: inherit;
          font-size: 11px;
          color: #94A3B8;
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 5px;
          padding: 1px 6px;
        }

        .simse-crumb-current {
          font-weight: 600;
          color: #1e293b !important;
        }

        .simse-profile-trigger {
          cursor: pointer;
          padding: 4px 10px 4px 4px;
          border-radius: 12px;
          transition: background .18s ease;
        }
        .simse-profile-trigger:hover {
          background: #F8FAFC;
        }

        .simse-avatar-ring {
          padding: 2px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5b5ce2 0%, #3b82f6 50%, #0ea5e9 100%);
          display: flex;
        }
      `}</style>

      {/* Left Side */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="simse-icon-btn" onClick={toggleSidebar}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </div>

        <div>
          <Breadcrumb
            separator={<ChevronRight size={12} color="#CBD5E1" />}
            items={[
              { title: <span style={{ color: "#94A3B8", fontSize: 12 }}>Admin</span> },
              { title: <span className="simse-crumb-current" style={{ fontSize: 13 }}>{currentPage}</span> },
            ]}
          />
        </div>
      </div>

      {/* Right Side */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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

        <Dropdown menu={{ items: profileItems }} trigger={["click"]}>
          <Space className="simse-profile-trigger" size={10}>
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