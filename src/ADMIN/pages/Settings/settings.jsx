import { useState } from "react";
import {
  SettingOutlined,
  ApiOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
} from "@ant-design/icons";

import GeneralSettings from "./sections/GeneralSettings";
import ApiIntegrationSettings from "./sections/ApiIntegrationSettings";
import ApiSourceMapping from "./Sections/ApiSourceMapping";
import SecuritySettings from "./sections/SecuritySettings";
import NotificationSettings from "./sections/NotificationSettings";
import ManageLines from "./Sections/ManageLine.jsx";
import ManageFactories from "./Sections/ManageFactories.jsx";

const SECTIONS = [
  { key: "general", label: "General", icon: <SettingOutlined />, component: GeneralSettings },
  { key: "extSource", label: "External Sources", icon: <ApiOutlined />, component: ApiIntegrationSettings },
  { key: "api", label: "API Integration", icon: <ApiOutlined />, component: ApiSourceMapping },
  { key: "security", label: "Security", icon: <SafetyCertificateOutlined />, component: SecuritySettings },
  { key: "notifications", label: "Notifications", icon: <BellOutlined />, component: NotificationSettings },
  { key: "factories", label: "Manage Factories", icon: <ApiOutlined />, component: ManageFactories },
  { key: "lines", label: "Manage Lines", icon: <ApiOutlined />, component: ManageLines },
];

const Settings = () => {
  const [activeKey, setActiveKey] = useState("general");

  const ActiveComponent = SECTIONS.find((s) => s.key === activeKey)?.component || GeneralSettings;

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", marginBottom: 16 }}>
        Settings
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Secondary sidebar */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: "#fff",
            border: "1px solid #F1F5F9",
            borderRadius: 16,
            padding: 8,
          }}
        >
          {SECTIONS.map((section) => {
            const isActive = section.key === activeKey;
            return (
              <div
                key={section.key}
                onClick={() => setActiveKey(section.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  marginBottom: 4,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#fff" : "#475569",
                  background: isActive ? "#0F172A" : "transparent",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#F8FAFC";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ fontSize: 16 }}>{section.icon}</span>
                {section.label}
              </div>
            );
          })}
        </div>

        {/* Content space */}
        <div
          style={{
            flex: 1,
            background: "#fff",
            border: "1px solid #F1F5F9",
            borderRadius: 16,
            padding: 24,
            minHeight: 480,
          }}
        >
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default Settings;