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

const { Header } = Layout;
const { Text } = Typography;

export default function Navbar({ collapsed, setCollapsed, userName = "User", onLogout }) {
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
      {/* Left: collapse toggle + search */}
      <Space size={16} align="center">
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{ color: "#64748b", fontSize: 18, cursor: "pointer", display: "flex" }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
        <Input
          prefix={<SearchOutlined style={{ color: "#7c8898" }} />}
          placeholder="Search..."
          style={{
            width: 260,
            background: "#f4f6f9",
            borderColor: "#e3e8ef",
          }}
        />
      </Space>

      {/* Right: notifications + profile */}
      <Space size={20} align="center">
        <Badge count={3} size="small" color="#c9820a">
          <BellOutlined style={{ fontSize: 18, color: "#8b96a8", cursor: "pointer" }} />
        </Badge>

        <Dropdown menu={profileMenu} placement="bottomRight" trigger={["click"]}>
          <Space style={{ cursor: "pointer" }}>
            <Avatar
              size={34}
              style={{ background: "rgba(58,109,149,0.15)", color: "#1b2430", border: "1px solid #e3e8ef" }}
            >
              {userName?.charAt(0)?.toUpperCase() || "U"}
            </Avatar>
            <Text style={{ color: "#1b2430", fontSize: 13 }}>{userName}</Text>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
}