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
      key: "/ADMIN/dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "/ADMIN/production",
      icon: <AppstoreOutlined />,
      label: "Production",
    },
    {
      key: "/ADMIN/tracking",
      icon: <NodeIndexOutlined />,
      label: "Tracking",
    },
    {
      key: "/ADMIN/users",
      icon: <TeamOutlined />,
      label: "Users",
    },
    {
      key: "/ADMIN/masters",
      icon: <DatabaseOutlined />,
      label: "Masters",
    },
    {
    
      key: "/ADMIN/reports",
      icon: <FileTextOutlined />,
      label: "Reports",
    },
    {
      key: "/ADMIN/settings",
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