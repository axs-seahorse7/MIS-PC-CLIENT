import { Card, Row, Col, Progress, Tag, Typography } from "antd";
import { ArrowRight, Circle } from "lucide-react";
import { productionPipeline } from "../../dashboardData";

const { Title, Text } = Typography;

const lineColors = {
  SMT: "#2563EB",
  AI: "#16A34A",
  DIP: "#F59E0B",
};

const lineTitles = [
  { key: "SMT", title: "SMT Line" },
  { key: "AI", title: "AI Process Line" },
  { key: "DIP", title: "DIP MI Line" },
];

const statusColor = {
  Running: "success",
  Waiting: "warning",
  Completed: "processing",
  Hold: "error",
};

const ProductionPipeline = () => {
  return (
    <Card
      style={{
        marginTop: 24,
        borderRadius: 18,
        border: "1px solid #E2E8F0",
        boxShadow: "0 8px 24px rgba(15,23,42,.05)",
      }}
      bodyStyle={{ padding: 28 }}
    >
      <Title level={4} style={{ marginBottom: 30 }}>
        Live PCB Manufacturing Pipeline
      </Title>

      {lineTitles.map((line) => {
        const stages = productionPipeline.filter(
          (item) => item.line === line.key
        );

        return (
          <div key={line.key} style={{ marginBottom: 45 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 22,
              }}
            >
              <Circle
                size={12}
                fill={lineColors[line.key]}
                color={lineColors[line.key]}
              />

              <Title
                level={5}
                style={{
                  margin: "0 0 0 10px",
                  color: lineColors[line.key],
                }}
              >
                {line.title}
              </Title>
            </div>

            <Row gutter={[18, 18]} align="middle">
              {stages.map((stage, index) => (
                <Col flex="1" key={stage.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Card
                      hoverable
                      style={{
                        width: "100%",
                        borderRadius: 16,
                        border: "1px solid #E2E8F0",
                        minHeight: 235,
                      }}
                      bodyStyle={{
                        padding: 18,
                      }}
                    >
                      <Text
                        style={{
                          color: "#64748B",
                          fontSize: 13,
                        }}
                      >
                        {stage.stage}
                      </Text>

                      <Title
                        level={5}
                        style={{
                          marginTop: 6,
                          marginBottom: 12,
                        }}
                      >
                        {stage.name}
                      </Title>

                      <Title
                        level={2}
                        style={{
                          margin: 0,
                          color: "#0F172A",
                        }}
                      >
                        {stage.count}
                      </Title>

                      <Text type="secondary">
                        PCB Count
                      </Text>

                      <Progress
                        percent={stage.progress}
                        strokeColor={stage.color}
                        showInfo={false}
                        style={{
                          marginTop: 18,
                        }}
                      />

                      <div
                        style={{
                          marginTop: 16,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Tag color={statusColor[stage.status]}>
                          {stage.status}
                        </Tag>

                        <Text
                          style={{
                            fontWeight: 600,
                            color: stage.color,
                          }}
                        >
                          {stage.progress}%
                        </Text>
                      </div>
                    </Card>

                    {index !== stages.length - 1 && (
                      <ArrowRight
                        size={28}
                        color="#94A3B8"
                        style={{
                          margin: "0 10px",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        );
      })}
    </Card>
  );
};

export default ProductionPipeline;