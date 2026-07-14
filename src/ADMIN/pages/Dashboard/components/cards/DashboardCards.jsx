import { Card, Col, Row, Typography, Tag } from "antd";
import {
  Factory,
  Activity,
  CircleCheckBig,
  CircleX,
  Gauge,
  TrendingUp,
} from "lucide-react";

const { Text, Title } = Typography;

const dashboardData = [
  {
    title: "Today's Production",
    value: "2,560",
    unit: "PCB",
    icon: Factory,
    color: "#2563EB",
    trend: "+8.5%",
    bg: "#EFF6FF",
  },
  {
    title: "In Progress",
    value: "542",
    unit: "PCB",
    icon: Activity,
    color: "#F59E0B",
    trend: "+3.2%",
    bg: "#FFF7ED",
  },
  {
    title: "Completed",
    value: "2,018",
    unit: "PCB",
    icon: CircleCheckBig,
    color: "#16A34A",
    trend: "+11%",
    bg: "#F0FDF4",
  },
  {
    title: "Rejected",
    value: "12",
    unit: "PCB",
    icon: CircleX,
    color: "#DC2626",
    trend: "-1.1%",
    bg: "#FEF2F2",
  },
  {
    title: "Efficiency",
    value: "98.7",
    unit: "%",
    icon: Gauge,
    color: "#7C3AED",
    trend: "+2.4%",
    bg: "#F5F3FF",
  },
];

const DashboardCards = () => {
  return (
    <Row gutter={[20, 20]}>
      {dashboardData.map((item, index) => {
        const Icon = item.icon;

        return (
          <Col key={index} xs={24} sm={12} md={12} lg={8} xl={4.8} flex="1">
            <Card
              hoverable
              style={{
                borderRadius: 18,
                border: "1px solid #E2E8F0",
                boxShadow: "0 6px 20px rgba(15,23,42,.05)",
                height: 175,
              }}
              bodyStyle={{
                padding: 22,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#64748B",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {item.title}
                </Text>

                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: item.bg,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Icon color={item.color} size={24} />
                </div>
              </div>

              <div>
                <Title
                  level={2}
                  style={{
                    margin: "10px 0 0",
                    color: "#0F172A",
                  }}
                >
                  {item.value}
                </Title>

                <Text
                  style={{
                    color: "#94A3B8",
                    fontSize: 14,
                  }}
                >
                  {item.unit}
                </Text>
              </div>

              <Tag
                color="green"
                icon={<TrendingUp size={13} />}
                style={{
                  width: "fit-content",
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontWeight: 500,
                }}
              >
                {item.trend}
              </Tag>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default DashboardCards;