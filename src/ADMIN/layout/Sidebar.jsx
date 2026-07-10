import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  TeamOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

import { useNavigate, useLocation } from "react-router-dom";

const { Sider } = Layout;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    {
      key: "/admin/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "/admin/production",
      icon: <AppstoreOutlined />,
      label: "Production",
    },
    {
      key: "/admin/tracking",
      icon: <NodeIndexOutlined />,
      label: "Tracking",
    },
    {
      key: "/admin/users",
      icon: <TeamOutlined />,
      label: "Users",
    },
    {
      key: "/admin/masters",
      icon: <DatabaseOutlined />,
      label: "Masters",
    },
    {
    
      key: "/admin/reports",
      icon: <FileTextOutlined />,
      label: "Reports",
    },
    {
      key: "/admin/settings",
      icon: <SettingOutlined />,
      label: "Settings",
    },
    {
      key: "/logout",
      icon: <LogoutOutlined />,
      label: "Logout",
    },
  ];

  return (
    <Sider width={250}>
      <div
        style={{
          color: "white",
          fontSize: 20,
          fontWeight: 600,
          textAlign: "center",
          padding: "20px",
        }}
      >
        PCB Tracking
      </div>

      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={items}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
};

export default Sidebar;