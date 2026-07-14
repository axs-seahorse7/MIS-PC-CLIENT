// src/User/layout/Navbar/Navbar.jsx
import React from "react";
import { Layout, Input, Badge, Avatar, Dropdown, Space, Typography } from "antd";
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../../Authentication/context/AuthContext"; // adjust path if your folder depth differs

const { Header } = Layout;
const { Text, Title } = Typography;

const LOGO_URL =
  "https://cms-complaint-avidence.s3.eu-north-1.amazonaws.com/pg-logo-Photoroom.png";

export default function Navbar({ collapsed, setCollapsed, userName = "User", onLogout }) {
  // Logged-in operator's real name + assigned stage (from AuthContext,
  // populated by your login API / admin dashboard assignment).
  // Falls back to the `userName` prop, then "User", if not available yet.
  const { user } = useAuth();
  const displayName = user?.name || userName || "User";
  const assignedStage = user?.assignedStage;

  const profileMenu = {
    items: [
      {
        key: "profile",
        icon: <UserOutlined />,
        label: "My Profile",
      },
      {
        key: "settings",
        icon: <SettingOutlined />,
        label: "Settings",
      },
      { type: "divider" },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Logout",
        danger: true,
      },
    ],
    onClick: ({ key }) => {
      if (key === "logout") onLogout?.();
      // TODO: hook up "profile" / "settings" navigation as needed
    },
  };

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: "#ffffff",
        borderBottom: "1px solid #e3e8ef",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Left: logo + collapse toggle + search */}
      <Space size={20} align="center">
        <Space size={8} align="center">
          <img src={LOGO_URL} alt="PG logo" style={{ height: 26 }} />
          <Title level={5} style={{ margin: 0, color: "#1b2430" }}>
            PG MIS
          </Title>
        </Space>

        
        
      </Space>

      {/* Right: notifications + profile + name/stage */}
      <Space size={20} align="center">
        <Badge count={3} size="small" color="#c9820a">
          <BellOutlined style={{ fontSize: 18, color: "#8b96a8", cursor: "pointer" }} />
        </Badge>

        

        <Space
          size={6}
          align="center"
          style={{ paddingLeft: 14, borderLeft: "1px solid #e3e8ef" }}
        >
          <UserOutlined style={{ fontSize: 16, color: "#3a6d95" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <Text strong style={{ color: "#1b2430", fontSize: 13 }}>
              {displayName}
            </Text>
            {assignedStage != null && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                Stage {assignedStage}
              </Text>
            )}
          </div>
        </Space>
      </Space>
    </Header>
  );
}