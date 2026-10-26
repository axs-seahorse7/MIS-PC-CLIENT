
import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";

import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  ClipboardList,
  Clock,
  Cpu,
  Layers,
  MessageSquare,
  Package,
  Search,
  SkipForward,
  User,
  Workflow,
  XCircle,
} from "lucide-react";

import api from "../../../services/API/api";

const { Title, Text } = Typography;

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const resultTag = (value) => {
  const result = String(value || "UNKNOWN").toUpperCase();

  const colors = {
    PASS: "success",
    SUCCESS: "success",
    FAIL: "error",
    REJECTED: "error",
    SKIPPED_STAGE: "warning",
    COMPLETED: "success",
    PACKED: "success",
    DISPATCHED: "blue",
    IN_PROGRESS: "processing",
    ON_HOLD: "warning",
    REWORK: "warning",
    ACTIVE: "processing",
    OPEN: "processing",
    PACKING: "processing",
    HOLD: "warning",
    CANCELLED: "default",
  };

  return (
    <Tag color={colors[result] || "default"}>
      {result.replaceAll("_", " ")}
    </Tag>
  );
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

const panelStyle = {
  borderRadius: 14,
  border: "1px solid #E8EDF5",
  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.025)",
};

const SectionTitle = ({ icon: Icon, title, count }) => (
  <Space style={{ marginBottom: 16 }}>
    <Icon size={18} color="#2563EB" />
    <Title level={5} style={{ margin: 0 }}>
      {title}
    </Title>
    {count !== undefined && (
      <Tag>{count}</Tag>
    )}
  </Space>
);

const EmptySection = ({ text = "No records found." }) => (
  <Empty
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description={text}
  />
);

const getMachineTests = (data) => {
  const tests = data?.machine_tests || {};

  // The backend may provide a combined attempts list or
  // separate ICT and FCT lists. Avoid double-counting rows.
  if (Array.isArray(tests.attempts)) {
    return tests.attempts;
  }

  return [
    ...(tests.ict || []),
    ...(tests.fct || []),
  ];
};

const getMachineName = (row) =>
  row.machine_name ||
  row.machine_code ||
  row.station_code ||
  row.machine_type ||
  "Unknown machine";

const getAttemptDate = (row) =>
  row.attempted_at ||
  row.imported_at ||
  row.created_at ||
  row.updated_at;

const normalizeFailureSummary = (data) => {
  const summary = data?.failure_summary || {};
  const attempts = getMachineTests(data);

  const totalAttempts = summary.total_attempts ?? attempts.length;
  const totalPasses = summary.total_passes ?? attempts.filter( (row) => String(row.result || row.status).toUpperCase() === "PASS").length;
  const totalFailures = summary.total_recorded_machine_failures ??attempts.filter((row) => String(row.result || row.status).toUpperCase() === "FAIL").length;

  return {
    totalAttempts,
    totalPasses,
    totalFailures,
  };
};

const ScanHistory = () => {
  const [mode, setMode] = useState("serial");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchedValue, setSearchedValue] = useState("");
  const [error, setError] = useState("");

  const searchTraceability = async (value = query) => {
    const searchValue = String(value || "").trim();

    if (!searchValue) {
      message.warning(
        mode === "serial"
          ? "Enter a PCB serial number."
          : "Enter a box code."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSearchedValue(searchValue);

    try {
      const response =
        mode === "serial"
          ? await api.get("/serial-history/serial", {
              params: { serial: searchValue },
            })
          : await api.get("/serial-history/box", {
              params: { boxCode: searchValue },
            });

      const payload = response?.data;

      if (payload?.success === false) {
        throw new Error(
          payload.message || "Traceability search failed."
        );
      }

      if (!payload?.data) {
        throw new Error(
          "The API returned no traceability data."
        );
      }

      setResult(payload.data);
    } catch (err) {
      const status = err?.response?.status;

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to retrieve traceability.";

      setError(
        status === 404
          ? errorMessage
          : status === 401 || status === 403
            ? errorMessage
            : errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (key) => {
    setMode(key);
    setQuery("");
    setResult(null);
    setError("");
    setSearchedValue("");
  };

  const resetSearch = () => {
    setQuery("");
    setResult(null);
    setError("");
    setSearchedValue("");
  };

  const renderMachineTests = (data) => {
    const tests = getMachineTests(data);
    const summary = normalizeFailureSummary(data);

    const machineColumns = [
      {
        title: "Machine / Station",
        key: "machine",
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{getMachineName(row)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.machine_code || row.station_code || "-"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Type",
        key: "type",
        render: (_, row) =>
          row.machine_type ||
          row.source_table?.replace("_results", "").toUpperCase() ||
          "-",
      },
      {
        title: "Program",
        dataIndex: "program",
        key: "program",
        render: (value) => displayValue(value),
      },

      {
        title: "Result",
        key: "result",
        render: (_, row) =>
          resultTag(row.result || row.status),
      },
      {
        title: "Attempted At",
        key: "attempted_at",
        render: (_, row) =>
          formatDate(getAttemptDate(row)),
      },
    ];

    const failureColumns = [
      {
        title: "Machine",
        key: "machine",
        render: (_, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{getMachineName(row)}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.machine_code || "-"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Attempts",
        dataIndex: "attempts",
        key: "attempts",
      },
      {
        title: "Passes",
        dataIndex: "passes",
        key: "passes",
        render: (value) => (
          <Text type="success">{value ?? 0}</Text>
        ),
      },
      {
        title: "Failures",
        dataIndex: "failures",
        key: "failures",
        render: (value) => (
          <Text type={Number(value) > 0 ? "danger" : "secondary"}>
            {value ?? 0}
          </Text>
        ),
      },
    ];

    const failureRows = data?.machine_tests?.failures_by_machine || [];

    return (
      <Space
        direction="vertical"
        size={20}
        style={{ width: "100%" }}
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <Card style={panelStyle}>
              <Statistic
                title="Total Attempts"
                value={summary.totalAttempts}
                prefix={<Activity size={18} />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card style={panelStyle}>
              <Statistic
                title="Passes"
                value={summary.totalPasses}
                valueStyle={{ color: "#16A34A" }}
                prefix={<CheckCircle2 size={18} />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card style={panelStyle}>
              <Statistic
                title="Recorded Failures"
                value={summary.totalFailures}
                valueStyle={{
                  color:
                    summary.totalFailures > 0 ? "#DC2626" : "#16A34A",
                }}
                prefix={<AlertTriangle size={18} />}
              />
            </Card>
          </Col>
        </Row>

        {data?.failure_summary?.note && (
          <Alert
            type="info"
            showIcon
            message="Failure counting note"
            description={data.failure_summary.note}
          />
        )}

        <Card style={panelStyle}>
          <SectionTitle
            icon={Activity}
            title="Machine Test Attempts"
            count={tests.length}
          />

          <Table
            rowKey={(row, index) =>
              `${row.source_table || row.machine_type || "test"}-${row.id ?? index}`
            }
            columns={machineColumns}
            dataSource={tests}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 850 }}
            locale={{
              emptyText: (
                <EmptySection text="No machine test records found for this PCB." />
              ),
            }}
          />
        </Card>

        <Card style={panelStyle}>
          <SectionTitle
            icon={AlertTriangle}
            title="Failures by Machine"
            count={failureRows.length}
          />

          <Table
            rowKey={(row, index) =>
              `${row.machine_code || row.machine_name || "machine"}-${index}`
            }
            columns={failureColumns}
            dataSource={failureRows}
            pagination={false}
            scroll={{ x: 600 }}
            locale={{
              emptyText: (
                <EmptySection text="No machine failure summary available." />
              ),
            }}
          />
        </Card>
      </Space>
    );
  };


  // Status -> colours + icon used for the timeline dot and the remarks box
  const JOURNEY_STATUS = {
    REJECTED: { main: "#DC2626", soft: "#FEF2F2", border: "#FECACA", icon: XCircle, label: "Rejected" },
    SKIPPED_STAGE: { main: "#D97706", soft: "#FFFBEB", border: "#FDE68A", icon: SkipForward, label: "Skipped" },
    DEFAULT: { main: "#16A34A", soft: "#F0FDF4", border: "#BBF7D0", icon: CheckCircle2, label: "Passed" },
  };

  const getJourneyStatus = (status) => JOURNEY_STATUS[status] || JOURNEY_STATUS.DEFAULT;

  // Colourful icon tile + label + value
  const InfoItem = ({ icon: Icon, bg, color, label, value }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: bg,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>
          {label}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#0F172A",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </div>
      </div>
    </div>
  );

  // Small summary chip shown above the timeline
  const SummaryChip = ({ icon: Icon, bg, color, value, label }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px 8px 8px",
        borderRadius: 12,
        border: "1px solid #F1F5F9",
        background: "#FBFCFD",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          background: bg,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: "#64748B" }}>{label}</div>
      </div>
    </div>
  );

  // ------------------------------------------------------------------
  // Replacement for renderScanJourney (goes inside the component)
  // ------------------------------------------------------------------
  const renderScanJourney = (data) => {
    const scans = data?.scan_history || [];

    const rejectedCount = scans.filter((s) => s.status === "REJECTED").length;
    const skippedCount = scans.filter((s) => s.status === "SKIPPED_STAGE").length;
    const passedCount = scans.length - rejectedCount - skippedCount;

    const timelineItems = scans.map((scan, index) => {
      const st = getJourneyStatus(scan.status);
      const StatusIcon = st.icon;

      return {
        // custom dot: coloured circle with the status icon
        dot: (
          <div
            style={{
              width: 25,
              height: 25,
              aspectRatio: 1,
              // padding: "8px 2px",
              borderRadius: "50%",
              background: st.main,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 0 4px ${st.soft}`,
            }}
          >
            <StatusIcon size={16} />
          </div>
        ),
        color: st.main,
        children: (
          <div
            style={{
              marginLeft: 6,
              marginBottom: 14,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              borderLeft: `4px solid ${st.main}`,
              background: "#fff",
            }}
          >
            {/* Header: step no + stage name + result, time on the right */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Space wrap size={10}>
                <span
                  style={{
                    minWidth: 24,
                    height: 24,
                    padding: "0 7px",
                    borderRadius: 7,
                    background: "#F1F5F9",
                    color: "#475569",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {index + 1}
                </span>

                <Text strong style={{ fontSize: 14.5 }}>
                  {scan.stage_name || `Stage ${scan.stage_id ?? "-"}`}
                </Text>

                {resultTag(scan.status)}
              </Space>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  color: "#64748B",
                  fontWeight: 500,
                }}
              >
                <Clock size={14} />
                {formatDate(scan.scanned_at)}
              </span>
            </div>

            {/* Details grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 14,
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px dashed #E2E8F0",
              }}
            >
              <InfoItem
                icon={Cpu}
                bg="#EFF6FF"
                color="#2563EB"
                label="Machine"
                value={scan.machine_code || "Not specified"}
              />

              <InfoItem
                icon={User}
                bg="#F5F3FF"
                color="#7C3AED"
                label="Scanned by"
                value={scan.scanned_by_name || scan.scanned_by || "-"}
              />

              <InfoItem
                icon={Layers}
                bg="#ECFEFF"
                color="#0891B2"
                label="Conveyor line"
                value={scan.line_name || "-"}
              />

              {scan.production_order_no && (
                <InfoItem
                  icon={ClipboardList}
                  bg="#FFF7ED"
                  color="#EA580C"
                  label="Order"
                  value={scan.production_order_no}
                />
              )}
            </div>

            {/* Remarks */}
            {scan.remarks && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  marginTop: 14,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: st.soft,
                  border: `1px solid ${st.border}`,
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: st.main,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MessageSquare size={14} />
                </div>

                <Text style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{scan.remarks}</Text>
              </div>
            )}
          </div>
        ),
      };
    });

    return (
      <Card style={panelStyle}>
        <SectionTitle icon={Workflow} title="Production Journey" count={scans.length} />

        {timelineItems.length ? (
          <>
            {/* Summary strip */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "4px 0 20px" }}>
              <SummaryChip icon={Workflow} bg="#EFF6FF" color="#2563EB" value={scans.length} label="Total scans" />
              <SummaryChip icon={CheckCircle2} bg="#ECFDF5" color="#16A34A" value={passedCount} label="Passed" />
              {rejectedCount > 0 && (
                <SummaryChip icon={XCircle} bg="#FEF2F2" color="#DC2626" value={rejectedCount} label="Rejected" />
              )}
              {skippedCount > 0 && (
                <SummaryChip icon={SkipForward} bg="#FFFBEB" color="#D97706" value={skippedCount} label="Skipped" />
              )}
            </div>

            <Timeline items={timelineItems} />
          </>
        ) : (
          <EmptySection text="No MES scan history was found. Machine results may still be available below." />
        )}
      </Card>
    );
  };

  const renderSerialResult = (data) => {
    const production = data.production;
    const orders = data.production_orders || [];
    const boxes = data.boxes || [];
    const summary = normalizeFailureSummary(data);

    const boxColumns = [
      {
        title: "Box Code",
        dataIndex: "box_code",
        key: "box_code",
      },
      {
        title: "Box Status",
        dataIndex: "status",
        key: "status",
        render: resultTag,
      },
      {
        title: "Quantity",
        dataIndex: "actual_quantity",
        key: "actual_quantity",
      },
      {
        title: "Packed At",
        dataIndex: "packed_at",
        key: "packed_at",
        render: formatDate,
      },
    ];

    const orderColumns = [
      {
        title: "Production Order",
        dataIndex: "production_order_no",
        key: "production_order_no",
      },
      {
        title: "Sequence",
        dataIndex: "production_sequence",
        key: "production_sequence",
      },
      {
        title: "Item Status",
        dataIndex: "item_status",
        key: "item_status",
        render: resultTag,
      },
      {
        title: "Order Status",
        dataIndex: "production_order_status",
        key: "production_order_status",
        render: resultTag,
      },
    ];

    return (
      <Space
        direction="vertical"
        size={20}
        style={{ width: "100%" }}
      >
        <Card style={panelStyle}>
          <Row gutter={[20, 16]} align="middle">
            <Col flex="auto">
              <Space align="start">
                <div
                  style={{
                    background: "#EFF6FF",
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <Package size={26} color="#2563EB" />
                </div>

                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {data.serial_no || searchedValue}
                  </Title>

                  <Space wrap style={{ marginTop: 6 }}>
                    {resultTag(production?.status || "NO PRODUCTION RECORD")}
                    {data.customer_qr && (
                      <Tag color="blue">
                        Customer QR: {data.customer_qr}
                      </Tag>
                    )}
                  </Space>
                </div>
              </Space>
            </Col>

            <Col>
              <Button onClick={resetSearch}>
                New Search
              </Button>
            </Col>
          </Row>

          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
            style={{ marginTop: 24 }}
          >
            <Descriptions.Item label="PCB Serial Number">
              <Text strong>{data.serial_no || searchedValue}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Production Status">
              {resultTag(production?.status || "NO RECORD")}
            </Descriptions.Item>

            <Descriptions.Item label="Product">
              <Space direction="vertical" size={0}>
                <Text strong>{production?.product_name || "Not available"}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {production?.product_code || "-"}
                </Text>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="ERP Product Number">
              {displayValue(production?.product_erp_no)}
            </Descriptions.Item>

            <Descriptions.Item label="Factory">
              <Space direction="vertical" size={0}>
                <Text strong>{production?.factory_name || "Not available"}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {production?.factory_code || "-"}
                </Text>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Production Line">
              {production?.line_name || "Not available"}
              {production?.line_code ? ` (${production.line_code})` : ""}
            </Descriptions.Item>

            <Descriptions.Item label="Current Stage">
              {production?.current_stage_name || "Not available"}
            </Descriptions.Item>

            <Descriptions.Item label="Current Sequence">
              {displayValue(production?.current_sequence_no)}
            </Descriptions.Item>

            <Descriptions.Item label="Customer QR">
              {displayValue(data.customer_qr)}
            </Descriptions.Item>

            <Descriptions.Item label="Created At">
              {formatDate(production?.created_at)}
            </Descriptions.Item>

            <Descriptions.Item label="Last Updated">
              {formatDate(production?.updated_at)}
            </Descriptions.Item>

            <Descriptions.Item label="Completed At">
              {formatDate(production?.completed_at)}
            </Descriptions.Item>

            <Descriptions.Item label="Packed At">
              {formatDate(production?.packed_at)}
            </Descriptions.Item>

            <Descriptions.Item label="Dispatched At">
              {formatDate(production?.dispatched_at)}
            </Descriptions.Item>

            <Descriptions.Item label="Production Records">
              {(data.productions || []).length}
            </Descriptions.Item>
          </Descriptions>

          {!production && (
            <Alert
              style={{ marginTop: 16 }}
              type="warning"
              showIcon
              message="No production record found"
              description="Other scan, machine-test or box records may still be available."
            />
          )}
        </Card>

        
        <Card style={panelStyle}>
          <SectionTitle
            icon={Workflow}
            title="Production Records"
            count={(data.productions || []).length}
          />

          <Table
            rowKey={(row) => row.production_record_id}
            dataSource={data.productions || []}
            pagination={false}
            scroll={{ x: 1000 }}
            columns={[
              {
                title: "Product",
                key: "product",
                render: (_, row) => (
                  <Space direction="vertical" size={0}>
                    <Text strong>{row.product_name || "Not available"}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {row.product_code || "-"}
                    </Text>
                  </Space>
                ),
              },
              {
                title: "Factory",
                key: "factory",
                render: (_, row) => row.factory_name || "Not available",
              },
              {
                title: "Line",
                key: "line",
                render: (_, row) => row.line_name || "Not available",
              },
              {
                title: "Current Stage",
                key: "stage",
                render: (_, row) => row.current_stage_name || "Not available",
              },
              {
                title: "Sequence",
                dataIndex: "current_sequence_no",
                key: "sequence",
                render: displayValue,
              },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: resultTag,
              },
              {
                title: "Created At",
                dataIndex: "created_at",
                key: "created_at",
                render: formatDate,
              },
              {
                title: "Completed At",
                dataIndex: "completed_at",
                key: "completed_at",
                render: formatDate,
              },
            ]}
            locale={{
              emptyText: (
                <EmptySection text="No production records found for this serial." />
              ),
            }}
          />
        </Card>


        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <Card style={panelStyle}>
              <Statistic
                title="Machine Attempts"
                value={summary.totalAttempts}
                prefix={<Activity size={18} />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card style={panelStyle}>
              <Statistic
                title="Recorded Failures"
                value={summary.totalFailures}
                valueStyle={{
                  color:
                    summary.totalFailures > 0
                      ? "#DC2626"
                      : "#16A34A",
                }}
                prefix={<XCircle size={18} />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={8}>
            <Card style={panelStyle}>
              <Statistic
                title="Boxes"
                value={boxes.length}
                prefix={<Box size={18} />}
              />
            </Card>
          </Col>
        </Row>

        <Card style={panelStyle}>
          <SectionTitle
            icon={Workflow}
            title="Production Orders"
            count={orders.length}
          />

          <Table
            rowKey={(row, index) => `${row.production_order_id || "order"}-${index}`}
            columns={orderColumns}
            dataSource={orders}
            pagination={false}
            scroll={{ x: 650 }}
            locale={{
              emptyText: (
                <EmptySection text="No production order linked to this serial." />
              ),
            }}
          />
        </Card>

        {renderScanJourney(data)}

        {renderMachineTests(data)}

        <Card style={panelStyle}>
          <SectionTitle
            icon={Package}
            title="Box Mapping"
            count={boxes.length}
          />

          <Table
            rowKey={(row, index) =>
              `${row.id || row.box_code}-${index}`
            }
            columns={boxColumns}
            dataSource={boxes}
            pagination={false}
            scroll={{ x: 650 }}
            locale={{
              emptyText: (
                <EmptySection text="This PCB is not linked to a box in the returned records." />
              ),
            }}
          />
        </Card>
      </Space>
    );
  };

  const renderBoxResult = (data) => {
    const box = data.box || {};
    const items = data.items || [];

    const itemColumns = [
      {
        title: "PCB Serial Number",
        dataIndex: "serial_no",
        key: "serial_no",
        render: (value) => (
          <Text strong>{value}</Text>
        ),
      },
      {
        title: "Packed At",
        dataIndex: "packed_at",
        key: "packed_at",
        render: formatDate,
      },
      {
        title: "Production Status",
        key: "production_status",
        render: (_, item) =>
          resultTag(item.history?.production?.status || "NO RECORD"),
      },
      {
        title: "Attempts",
        key: "attempts",
        render: (_, item) =>
          getMachineTests(item.history).length,
      },
      {
        title: "Failures",
        key: "failures",
        render: (_, item) => {
          const failures = normalizeFailureSummary(item.history).totalFailures;

          return (
            <Text type={failures > 0 ? "danger" : "secondary"}>
              {failures}
            </Text>
          );
        },
      },
    ];

    const expandedRowRender = (item) => {
      const history = item.history;

      if (!history) {
        return (
          <EmptySection text="No individual PCB history returned." />
        );
      }

      const tests = getMachineTests(history);
      const scans = history.scan_history || [];

      return (
        <Space
          direction="vertical"
          size={16}
          style={{ width: "100%" }}
        >
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
          >
            <Descriptions.Item label="Product ID">
              {displayValue(history.production?.product_id)}
            </Descriptions.Item>

            <Descriptions.Item label="Line ID">
              {displayValue(history.production?.line_id)}
            </Descriptions.Item>

            <Descriptions.Item label="PCB Status">
              {resultTag(history.production?.status)}
            </Descriptions.Item>
          </Descriptions>

          <Title level={5}>Machine Attempts</Title>

          <Table
            size="small"
            rowKey={(row, index) =>
              `${row.source_table || row.machine_type || "test"}-${row.id ?? index}`
            }
            pagination={false}
            dataSource={tests}
            columns={[
              {
                title: "Machine",
                key: "machine",
                render: (_, row) => getMachineName(row),
              },
              {
                title: "Result",
                key: "result",
                render: (_, row) =>
                  resultTag(row.result || row.status),
              },
              {
                title: "Time",
                key: "time",
                render: (_, row) =>
                  formatDate(getAttemptDate(row)),
              },
            ]}
            scroll={{ x: 500 }}
            locale={{
              emptyText: "No machine attempts.",
            }}
          />

          <Title level={5}>Scan Journey</Title>

          {scans.length ? (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={scans}
              columns={[
                {
                  title: "Stage",
                  dataIndex: "stage_name",
                  key: "stage_name",
                },
                {
                  title: "Machine",
                  dataIndex: "machine_code",
                  key: "machine_code",
                  render: (value) => value || "-",
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: resultTag,
                },
                {
                  title: "Scanned At",
                  dataIndex: "scanned_at",
                  key: "scanned_at",
                  render: formatDate,
                },
              ]}
              scroll={{ x: 500 }}
            />
          ) : (
            <EmptySection text="No MES scan history for this PCB." />
          )}
        </Space>
      );
    };

    return (
      <Space
        direction="vertical"
        size={20}
        style={{ width: "100%" }}
      >
        <Card style={panelStyle}>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <Title level={4} style={{ margin: 0 }}>
                {box.box_code || searchedValue}
              </Title>
              <div style={{ marginTop: 8 }}>
                {resultTag(box.status)}
              </div>
            </Col>

            <Col>
              <Button onClick={resetSearch}>
                New Search
              </Button>
            </Col>
          </Row>

          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
            style={{ marginTop: 24 }}
          >
            <Descriptions.Item label="Product">
              {displayValue(box.product_name || box.product_id)}
            </Descriptions.Item>

            <Descriptions.Item label="Packaging Stage">
              {displayValue(box.packaging_stage_name || box.packaging_stage_id)}
            </Descriptions.Item>

            <Descriptions.Item label="Box Size">
              {displayValue(box.box_size)}
            </Descriptions.Item>

            <Descriptions.Item label="Actual Quantity">
              {displayValue(box.actual_quantity)}
            </Descriptions.Item>

            <Descriptions.Item label="Items Returned">
              {items.length}
            </Descriptions.Item>

            <Descriptions.Item label="Created At">
              {formatDate(box.created_at)}
            </Descriptions.Item>

            <Descriptions.Item label="Packed At">
              {formatDate(box.packed_at)}
            </Descriptions.Item>

            <Descriptions.Item label="Closed At">
              {formatDate(box.closed_at)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card style={panelStyle}>
          <SectionTitle
            icon={Package}
            title="PCB Serial Traceability"
            count={items.length}
          />

          <Text type="secondary">
            Expand any PCB row to inspect its machine attempts and scan journey.
          </Text>

          <Table
            style={{ marginTop: 16 }}
            rowKey={(row, index) =>
              `${row.serial_no}-${index}`
            }
            columns={itemColumns}
            dataSource={items}
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => Boolean(record.history),
            }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 750 }}
            locale={{
              emptyText: (
                <EmptySection text="No PCB serials are mapped to this box." />
              ),
            }}
          />
        </Card>
      </Space>
    );
  };

  return (
    <div
      style={{
        padding: 24,
        background: "#F8FAFC",
        minHeight: "100%",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Space align="center" size={12}>
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "#EAF2FF",
            }}
          >
            <Workflow size={26} color="#2563EB" />
          </div>

          <div>
            <Title level={3} style={{ margin: 0 }}>
              Scan History & Traceability
            </Title>

            <Text type="secondary">
              Trace PCB production stages, machine tests, failures,
              retests and box mapping.
            </Text>
          </div>
        </Space>
      </div>

      <Card style={{ ...panelStyle, marginBottom: 24 }}>
        <Tabs
          activeKey={mode}
          onChange={handleModeChange}
          items={[
            {
              key: "serial",
              label: (
                <Space>
                  <Search size={16} />
                  PCB Serial Search
                </Space>
              ),
            },
            {
              key: "box",
              label: (
                <Space>
                  <Package size={16} />
                  Box Traceability
                </Space>
              ),
            },
          ]}
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            searchTraceability();
          }}
        >
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={16} lg={18}>
              <Input
                size="large"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  mode === "serial"
                    ? "Scan or enter a PCB serial number..."
                    : "Enter the exact box code..."
                }
                allowClear
                prefix={<Search size={17} color="#94A3B8" />}
                maxLength={255}
              />
            </Col>

            <Col xs={24} md={8} lg={6}>
              <Space style={{ width: "100%" }}>
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  loading={loading}
                  icon={<Search size={16} />}
                  style={{ minWidth: 140 }}
                >
                  Search
                </Button>

                <Button
                  size="large"
                  onClick={resetSearch}
                  disabled={loading}
                >
                  Clear
                </Button>
              </Space>
            </Col>
          </Row>
        </form>
      </Card>

      {error && (
        <Alert
          style={{ marginBottom: 20 }}
          type="error"
          showIcon
          closable
          onClose={() => setError("")}
          message="Traceability search failed"
          description={error}
        />
      )}

      {loading && (
        <Card style={panelStyle}>
          <div style={{ padding: 48, textAlign: "center" }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                Retrieving production and machine records...
              </Text>
            </div>
          </div>
        </Card>
      )}

      {!loading && result && mode === "serial" &&
        renderSerialResult(result)}

      {!loading && result && mode === "box" &&
        renderBoxResult(result)}

      {!loading && !result && !error && (
        <Card style={panelStyle}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={4}>
                <Text strong>
                  Search for a PCB or box
                </Text>
                <Text type="secondary">
                  Enter a serial number to view its production journey,
                  or a box code to trace all mapped PCBs.
                </Text>
              </Space>
            }
          />
        </Card>
      )}

      <div
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#94A3B8",
          fontSize: 12,
        }}
      >
        <Clock size={13} />
          Results reflect the records currently returned by the SMES Server.
      </div>
    </div>
  );
};

export default ScanHistory;
