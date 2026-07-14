import { Card, Progress, Tag, Typography, Row, Col } from "antd";
import { ArrowRight } from "lucide-react";

const { Title, Text } = Typography;

const productionStages = [
  {
    line: "SMD Line",
    stage: "Completed",
    progress: 100,
    count: 2560,
    color: "#16A34A",
    status: "Completed",
  },
  {
    line: "AI Process",
    stage: "Running",
    progress: 72,
    count: 1845,
    color: "#2563EB",
    status: "Running",
  },
  {
    line: "DIP MIS",
    stage: "Processing",
    progress: 48,
    count: 1218,
    color: "#F59E0B",
    status: "In Progress",
  },
  {
    line: "Final Inspection",
    stage: "Waiting",
    progress: 20,
    count: 510,
    color: "#9333EA",
    status: "Waiting",
  },
];

const ProductionFlow = () => {
  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>Production Flow</Title>}
      style={{
        marginTop: 24,
        borderRadius: 18,
        border: "1px solid #E2E8F0",
        boxShadow: "0 6px 18px rgba(15,23,42,.05)",
      }}
    >
      <Row gutter={[20, 20]}>
        {productionStages.map((item, index) => (
          <Col xs={24} md={12} xl={6} key={index}>
            <Card
              bordered={false}
              style={{
                background: "#F8FAFC",
                borderRadius: 16,
                height: 220,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text strong>{item.line}</Text>

                <Tag color={item.color}>
                  {item.status}
                </Tag>
              </div>

              <Title level={2} style={{ marginTop: 18, marginBottom: 0 }}>
                {item.count}
              </Title>

              <Text type="secondary">
                PCB Processed
              </Text>

              <Progress
                percent={item.progress}
                strokeColor={item.color}
                showInfo={false}
                style={{ marginTop: 20 }}
              />

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text>{item.stage}</Text>

                {index !== productionStages.length - 1 && (
                  <ArrowRight size={18} color="#94A3B8" />
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default ProductionFlow;