import { Card, Typography, Tag, Space } from "antd";
import { Cpu, CircleAlert, CircleCheckBig } from "lucide-react";
import { lineStatus } from "../../dashboardData";

const { Title, Text } = Typography;

const statusColor = {
  Running: "success",
  Maintenance: "warning",
  Fault: "error",
  Idle: "default",
};

const statusIcon = {
  Running: <CircleCheckBig size={18} color="#16A34A" />,
  Maintenance: <CircleAlert size={18} color="#F59E0B" />,
  Fault: <CircleAlert size={18} color="#DC2626" />,
  Idle: <Cpu size={18} color="#64748B" />,
};

const LineStatus = () => {
  return (
    <Card
      style={{
        borderRadius: 18,
        height: "100%",
        border: "1px solid #E2E8F0",
        boxShadow: "0 8px 24px rgba(15,23,42,.05)",
      }}
      bodyStyle={{ padding: 24 }}
    >
      <Title level={4} style={{ marginBottom: 22 }}>
        Today's Line Status
      </Title>

      {lineStatus.map((line) => (
        <div
          key={line.line}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 0",
            borderBottom: "1px solid #F1F5F9",
          }}
        >
          <Space size={12}>
            {statusIcon[line.status]}
            <div>
              <Text strong>{line.line} Line</Text>
              <br />
              <Text type="secondary">Production Line</Text>
            </div>
          </Space>

          <Tag color={statusColor[line.status]}>
            {line.status}
          </Tag>
        </div>
      ))}
    </Card>
  );
};

export default LineStatus;