import { Button, Space, Typography } from "antd";
import { CalendarDays, RefreshCcw } from "lucide-react";

const { Title, Text } = Typography;

const DashboardHeader = () => {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
      <div>
        <Title level={2} style={{ margin: 0, color: "#0F172A", fontWeight: 700 }}>Dashboard</Title>
        <Text style={{ color: "#64748B", fontSize: 15 }}>Welcome back, Administrator. Monitor your PCB production in real time.</Text>
      </div>

      <Space size={16}>
        <Space style={{ color: "#64748B", fontSize: 14 }}>
          <CalendarDays size={18} />
          {today}
        </Space>

        <Button type="primary" icon={<RefreshCcw size={16} />} style={{ height: 42, borderRadius: 10 }}>
          Refresh
        </Button>
      </Space>
    </div>
  );
};

export default DashboardHeader;