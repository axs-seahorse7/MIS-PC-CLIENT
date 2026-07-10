import { Layout, Avatar, Space, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";

const { Header } = Layout;
const { Text } = Typography;

const Navbar = () => {
  return (
    <Header
      style={{
        background: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
      }}
    >
      <Text strong style={{ fontSize: 18 }}>
        PCB Production Tracking System
      </Text>

      <Space>
        <Avatar icon={<UserOutlined />} />
        <Text strong>ADMIN</Text>
      </Space>
    </Header>
  );
};

export default Navbar;