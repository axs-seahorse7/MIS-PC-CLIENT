


import { Card, Table, Tag, Typography } from "antd";
import { recentActivity } from "../../dashboardData";

const { Title } = Typography;

const columns = [
  {
    title: "QR Code",
    dataIndex: "qr",
  },
  {
    title: "Current Stage",
    dataIndex: "stage",
  },
  {
    title: "Line",
    dataIndex: "line",
  },
  {
    title: "Time",
    dataIndex: "time",
  },
  {
    title: "Status",
    dataIndex: "status",
    render: (status) => (
      <Tag color={status === "Completed" ? "success" : status === "Running" ? "processing" : "warning"}>
        {status}
      </Tag>
    ),
  },
];

const RecentActivity = () => {
  return (
    <Card
      style={{
        borderRadius: 18,
        border: "1px solid #E2E8F0",
        boxShadow: "0 8px 24px rgba(15,23,42,.05)",
      }}
      bodyStyle={{ padding: 24 }}
    >
      <Title level={4}>Recent QR Activity</Title>

      <Table
        rowKey="qr"
        columns={columns}
        dataSource={recentActivity}
        pagination={false}
        size="middle"
      />
    </Card>
  );
};

export default RecentActivity;