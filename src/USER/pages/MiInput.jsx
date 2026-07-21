import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Input,
  Select,
  Tag,
  Card,
  Statistic,
  Row,
  Col,
  Space,
  Typography,
  Alert,
  message,
} from "antd";
import {
  ScanOutlined,
  PlusOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from "@ant-design/icons";
import { useAuth } from "../../Authentication/context/AuthContext"; // adjust path if your folder depth differs
import api from "../../services/API/api";

const { Text, Title } = Typography;

// Status -> Tag color map
const STATUS_COLOR = {
  "SAVED/ACCEPTED": "green",
  PENDING: "orange",
  REJECTED: "red",
  DRAFT: "default",
};

const LINE_OPTIONS = [{ value: "102:MI LINE 02", label: "102: MI LINE 02" }];
const QUALITY_OPTIONS = [
  { value: "OK", label: "OK" },
  { value: "HOLD", label: "HOLD" },
  { value: "REJECT", label: "REJECT" },
];

const EMPTY_FORM = {
  entryNo: "",
  productId: null,
  erpNo: null,
  wipBarCode: "",
  itemPlanned: "",
  date: "",
  planNo: "",
  quality: "OK",
  machineName: "",
  station: "",
  productName: "",
  planQty: 0,
  doneQty: 0,
};

export default function MIInput() {
  const [mode, setMode] = useState("view"); // "view" | "new" | "edit"
  const [status, setStatus] = useState("SAVED/ACCEPTED");

  // ---- Logged-in operator's assigned stage (from admin dashboard) ----
  const { user } = useAuth();

  const [stageFlowRows, setStageFlowRows] = useState([]); // ALL stages for this product, sorted by sequence_no
  const [stageFlow, setStageFlow] = useState(null); // the ONE row matching the logged-in user's stage

  const STAGES = stageFlowRows.map((r) => r.stage_name);
  const assignedStageIndex = stageFlow ? stageFlow.sequence_no - 1 : -1;

  const [stageStatus, setStageStatus] = useState([]);
  const [flashIndices, setFlashIndices] = useState(new Set());
  const [lastConfirmed, setLastConfirmed] = useState(-1);

  const [groupId, setGroupId] = useState(null);
  const [serialNo, setSerialNo] = useState(null);

  // "missing stage" inline banner state
  const [missingStages, setMissingStages] = useState([]); // [{ index, label }]

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const res = await api.get("/products/all");
        setProducts(res?.data?.data || res?.data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
        message.error("Failed to load products");
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // ---- GROUP_CREATE staging: scans collected here are LOCAL ONLY.
  // Nothing hits scan_history until "Save Group" is clicked, at which
  // point the whole batch of codes is sent to the server together.
  const [pendingGroupScans, setPendingGroupScans] = useState([]); // [{ code, tempId }]
  const [savingGroup, setSavingGroup] = useState(false);

  // fetch stage-flow info when product changes
  useEffect(() => {
    if (!form.productId) {
      setStageFlowRows([]);
      setStageFlow(null);
      setPendingGroupScans([]);
      setStageStatus([]);
      setLastConfirmed(-1);
      return;
    }

    const fetchStageFlow = async () => {
      try {
        const res = await api.get(`/product-stage-flow/${form.productId}`);
        const payload = res?.data || [];
        const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];

        const sorted = [...rows].sort((a, b) => a.sequence_no - b.sequence_no);
        setStageFlowRows(sorted);

        // Confirm this matches your real /auth/me shape — using stage.id here
        // per your latest user object.
        const matched = sorted.find((r) => r.stage_id === user?.stage?.id) || null;

        if (!matched) {
          console.warn("No matching stage-flow row found for this user's assigned stage.");
        }
        setStageFlow(matched);

        setStageStatus(Array(sorted.length).fill("pending"));
        setPendingGroupScans([]);
        setLastConfirmed(-1);
        setGroupId(null);
        setSerialNo(null);
      } catch (err) {
        message.error("Failed to load stage flow for this product");
      }
    };

    fetchStageFlow();
  }, [form.productId, user]);

  // Selecting an ERP number auto-fills the product name / id for scan readiness
  const handleErpSelect = (productId) => {
    const selected = products.find((p) => p.id === productId);
    setForm((f) => ({
      ...f,
      productId,
      erpNo: selected?.erp_no || "",
      productName: selected?.name || "",
    }));
  };

  const flashTile = (index, times) => {
    return new Promise((resolve) => {
      let toggles = 0;
      const totalToggles = times * 2; // each blink = 1 "on" + 1 "off"
      const timer = setInterval(() => {
        setFlashIndices((prev) => {
          const next = new Set(prev);
          if (next.has(index)) next.delete(index);
          else next.add(index);
          return next;
        });
        toggles += 1;
        if (toggles >= totalToggles) {
          clearInterval(timer);
          setFlashIndices((prev) => {
            const next = new Set(prev);
            next.delete(index);
            return next;
          });
          resolve();
        }
      }, 220);
    });
  };

  const playConfirmAnimation = async (newIndex) => {
    const priorRange = Array.from({ length: newIndex }, (_, k) => k);
    if (priorRange.length) {
      await Promise.all(priorRange.map((idx) => flashTile(idx, 1)));
    }
    await flashTile(newIndex, 2);
  };

  const handleStageScanned = async (index) => {
    if (index !== assignedStageIndex) {
      message.error(
        `Invalid: "${STAGES[index]}" is not your assigned stage. You are assigned to "${STAGES[assignedStageIndex]}".`
      );
      return;
    }

    const expectedNext = lastConfirmed + 1;

    // 1. duplicate scan
    if (stageStatus[index] === "done") {
      message.warning(`Duplicate scan: "${STAGES[index]}" is already completed.`);
      return;
    }

    // 4. fixing a previously flagged/missing stage
    if (stageStatus[index] === "error") {
      setStageStatus((prev) => {
        const next = [...prev];
        next[index] = "done";
        return next;
      });
      if (index > lastConfirmed) setLastConfirmed(index);
      setMissingStages((prev) => prev.filter((s) => s.index !== index));
      await flashTile(index, 2);
      return;
    }

    // 2. correct, in-sequence scan
    if (index === expectedNext) {
      if (lastConfirmed === -1) {
        // first scan of this entry -> system generates Group ID + Serial No
        setGroupId(`GRP-${Date.now().toString().slice(-6)}`);
        setSerialNo(form.wipBarCode || "—");
      }
      setStageStatus((prev) => {
        const next = [...prev];
        next[index] = "done";
        return next;
      });
      setLastConfirmed(index);
      await playConfirmAnimation(index);
      return;
    }

    // 3. sequence broken - one or more stages skipped
    if (index > expectedNext) {
      const missing = [];
      for (let i = expectedNext; i < index; i++) {
        missing.push({ index: i, label: STAGES[i] });
      }
      setStageStatus((prev) => {
        const next = [...prev];
        for (let i = expectedNext; i <= index; i++) next[i] = "error";
        return next;
      });
      setLastConfirmed(index);
      setMissingStages(missing);
      return;
    }
  };

  const wipCodeRef = useRef(null);
  const groupResetTimeoutRef = useRef(null);

  useEffect(() => {
    wipCodeRef.current?.focus();
  }, []);

  // clear any pending auto-reset if the component unmounts mid-timeout
  useEffect(() => {
    return () => {
      if (groupResetTimeoutRef.current) clearTimeout(groupResetTimeoutRef.current);
    };
  }, []);

  // ---- direct save path, used for SINGLE / GROUP_SCAN only ----
  const submitScanToServer = async (code) => {
    try {
      const res = await api.post("/scan-history/create", {
        scanned_value: code,
        product_id: form.productId,
      });
      return res.data; // { success, message, data: { id, sequence_no, scan_mode } }
    } catch (err) {
      message.error(err?.response?.data?.message || "Scan submission failed");
      return null;
    }
  };

  const handleWipCodeScanned = async () => {
    const code = form.wipBarCode.trim();
    if (!code) return;

    if (!form.productId) {
      message.warning("Select an ERP number before scanning.");
      return;
    }
    if (!stageFlow) {
      message.warning("Stage flow not loaded for this product yet.");
      return;
    }

    // Clear the field immediately after every attempt so a rejected/duplicate
    // scan can't linger and get concatenated with the next scanner read.
    setForm((f) => ({ ...f, wipBarCode: "" }));
    setTimeout(() => wipCodeRef.current?.focus(), 50);

    if (stageFlow.scan_mode === "GROUP_CREATE") {
      // ---- LOCAL ONLY: no server call here. Item just gets staged. ----
      setPendingGroupScans((prev) => {
        if (prev.some((s) => s.code === code)) {
          message.warning(`"${code}" is already in the pending list.`);
          return prev;
        }
        const next = [...prev, { code, tempId: `${code}-${Date.now()}` }];
        message.success(`Scan added (${next.length} pending). Save group when ready.`);
        return next;
      });
      return;
    }

    // SINGLE or GROUP_SCAN: save directly, as before.
    const result = await submitScanToServer(code);
    if (!result || !result.success) return;
    handleStageScanned(result.data.sequence_no - 1);
  };

  // remove a mistakenly-scanned item from the pending GROUP_CREATE list
  const handleRemovePendingScan = (tempId) => {
    setPendingGroupScans((prev) => prev.filter((s) => s.tempId !== tempId));
  };

  // send the whole staged batch to the server at once; server validates
  // sequence for every code, creates the group, and inserts all rows
  // together in one transaction.
  const handleSaveGroup = async () => {
    if (!pendingGroupScans.length) {
      message.warning("No pending scans to group.");
      return;
    }
    setSavingGroup(true);
    try {
      const res = await api.post("/scan-history/create-group", {
        scanned_values: pendingGroupScans.map((s) => s.code),
        product_id: form.productId,
      });
      if (!res?.data?.success) {
        message.error(res?.data?.message || "Failed to save group");
        return;
      }
      message.success(`Group created with ${pendingGroupScans.length} items`);
      setPendingGroupScans([]);
      await handleStageScanned(assignedStageIndex);

      // GROUP_CREATE tiles represent "a group was just saved", not permanent
      // progress on a single item — reset the tile so it's ready to animate
      // the next PCB group instead of staying stuck on "done".
      if (groupResetTimeoutRef.current) clearTimeout(groupResetTimeoutRef.current);
      groupResetTimeoutRef.current = setTimeout(() => {
        setStageStatus((prev) => {
          const next = [...prev];
          next[assignedStageIndex] = "pending";
          return next;
        });
        setLastConfirmed(-1);
        setGroupId(null);
        setSerialNo(null);
        groupResetTimeoutRef.current = null;
      }, 3000);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save group");
    } finally {
      setSavingGroup(false);
    }
  };

  // Module quick-access buttons (left side of action bar)
  const MODULE_BUTTONS = [
    "SM-ICT",
    "ICT REQD",
    "FCT REQD",
    "SM FCT",
    "FT REQD",
    "SM FT",
    "CUST SFN",
    "PS11400",
    "FIND SFN",
  ];
  const [activeModule, setActiveModule] = useState(MODULE_BUTTONS[0]);

  const isEditable = mode === "new" || mode === "edit";

  const updateField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // ---- New: full reset, ready for a fresh ERP selection ----
  const handleNew = () => {
    setForm(EMPTY_FORM);
    setStageFlowRows([]);
    setStageFlow(null);
    setStageStatus([]);
    setPendingGroupScans([]);
    setLastConfirmed(-1);
    setGroupId(null);
    setSerialNo(null);
    setMode("new");
    setStatus("DRAFT");
  };

  // ---- Edit: unlock fields only, keep everything currently on screen ----
  const handleEdit = () => {
    setMode("edit");
    setStatus("PENDING");
  };

  // ---- Save: does NOT hit the server. Scans already persisted themselves
  // (SINGLE/GROUP_SCAN on each scan, GROUP_CREATE via "Save Group"). This
  // button only locks the form fields back down and returns focus to the
  // barcode input so the operator can keep scanning the next unit. ----
  const handleSave = () => {
    setMode("view");
    setStatus("SAVED/ACCEPTED");
    setTimeout(() => wipCodeRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setMode("view");
  };

  const todayDonePercent = ((2055 / 5000) * 100).toFixed(1);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#f4f6f9",
        overflow: "hidden",
      }}
    >
      {/* ---------- ACTION BAR (fixed, directly below the main Navbar) ---------- */}
      <div
        style={{
          height: 56,
          flexShrink: 0,
          background: "#ffffff",
          borderBottom: "1px solid #e3e8ef",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
        }}
      >
        <Space size={6} wrap={false}>
          {MODULE_BUTTONS.map((item) => (
            <Button
              key={item}
              size="small"
              type={activeModule === item ? "primary" : "default"}
              onClick={() => setActiveModule(item)}
              style={{ fontSize: 11 }}
            >
              {item}
            </Button>
          ))}
        </Space>

        <Space size={8}>
          <Button icon={<PlusOutlined />} onClick={handleNew} disabled={isEditable}>
            New
          </Button>
          <Button icon={<EditOutlined />} onClick={handleEdit} disabled={isEditable}>
            Edit
          </Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} disabled={!isEditable}>
            Save
          </Button>
          <Button danger icon={<CloseOutlined />} onClick={handleCancel} disabled={!isEditable}>
            Cancel
          </Button>
        </Space>
      </div>

      {/* ---------- MISSING STAGE INLINE BANNER (below action bar) ---------- */}
      {missingStages.length > 0 && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setMissingStages([])}
          message={
            <span style={{ fontSize: 12.5 }}>
              <strong>Missing stage(s):</strong>{" "}
              {missingStages.map((s) => s.label).join(", ")} must be scanned before this stage.
              They're marked red on the left rail.
            </span>
          }
          style={{
            flexShrink: 0,
            borderRadius: 0,
            padding: "6px 20px",
            border: "none",
            borderBottom: "1px solid #f5c6c0",
          }}
        />
      )}

      {/* ---------- SUB HEADER (fixed) ---------- */}
      <div
        style={{
          height: 52,
          flexShrink: 0,
          background: "#ffffff",
          borderBottom: "1px solid #e3e8ef",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
        }}
      >
        <Space size={14} align="center">
          <Title level={5} style={{ margin: 0, color: "#1b2430" }}>
            MI Input
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            STATUS
          </Text>
          <Tag color={STATUS_COLOR[status] || "default"}>{status}</Tag>

          {groupId && (
            <>
              <Text type="secondary" style={{ fontSize: 12 }}>
                GROUP ID
              </Text>
              <Tag color="blue">{groupId}</Tag>
            </>
          )}

          {serialNo && (
            <>
              <Text type="secondary" style={{ fontSize: 12 }}>
                SERIAL NO
              </Text>
              <Tag color="purple">{serialNo}</Tag>
            </>
          )}
        </Space>
      </div>

      {/* ---------- BODY (fills remaining height, no scroll) ---------- */}
      <div style={{ flex: 1, display: "flex", padding: 14, gap: 14, minHeight: 0 }}>
        {/* Left rail - production scanning stages */}
        <div
          style={{
            width: 150,
            flexShrink: 0,
            background: "#ffffff",
            border: "1px solid #e3e8ef",
            borderRadius: 10,
            padding: 8,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Space direction="vertical" size={6} style={{ width: "100%", flex: 1 }}>
            {STAGES.length === 0 && (
              <Text type="secondary" style={{ fontSize: 11, padding: "6px 4px" }}>
                Select an ERP number to load stages.
              </Text>
            )}
            {STAGES.map((label, index) => {
              const st = stageStatus[index];
              const isFlashing = flashIndices.has(index);
              const isMyStage = index === assignedStageIndex;

              let bg = "#ffffff";
              let border = "#e3e8ef";
              let color = "#1b2430";
              let iconColor = "#3a6d95";

              // Persistent "this is your stage" marker — applies whenever the
              // tile isn't already done/error, so the operator can always
              // find their station regardless of scan progress.
              if (isMyStage && st !== "done" && st !== "error") {
                bg = "#eaf2f8";
                border = "#3a6d95";
              }

              if (st === "error") {
                bg = "#d1483c";
                border = "#d1483c";
                color = "#ffffff";
              } else if (st === "done") {
                border = "#3a6d95";
              }

              if (isFlashing) {
                bg = "#3a6d95";
                border = "#3a6d95";
                color = "#ffffff";
                iconColor = "#ffffff";
              }

              return (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: `1px solid ${border}`,
                    background: bg,
                    color,
                    fontSize: 10.5,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    userSelect: "none",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: isFlashing ? "rgba(255,255,255,0.25)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                    }}
                  >
                    {st === "done" ? (
                      <CheckCircleFilled style={{ fontSize: 12, color: isFlashing ? "#ffffff" : iconColor }} />
                    ) : st === "error" ? (
                      <CloseCircleFilled style={{ fontSize: 12 }} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {isMyStage && st !== "done" && st !== "error" && (
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        color: "#3a6d95",
                        letterSpacing: 0.3,
                      }}
                    >
                      YOU
                    </span>
                  )}
                </div>
              );
            })}
          </Space>
        </div>

        {/* Center - form + stats */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minHeight: 0,
          }}
        >
          {/* Stats row - frozen at top, fixed compact height */}
          <Row gutter={14} style={{ flexShrink: 0, height: 100 }}>
            <StatCard title="PLAN" value={form.planQty} color="#3a6d95" />
            <StatCard title="PROD" value={form.doneQty} color="#c9820a" />
            <StatCard title="TODAY DONE" value={130} color="#0f9a90" />
            <StatCard title="DONE %" value={`${todayDonePercent}%`} color="#d1483c" />
          </Row>

          <Card
            styles={{ body: { padding: 18 } }}
            style={{ border: "1px solid #e3e8ef", borderRadius: 10, flex: 1, minHeight: 0, overflow: "hidden" }}
          >
            <Row gutter={[16, 14]}>
              <Col span={8}>
                <FieldLabel text="Entry No" />
                <Input value={form.entryNo} disabled={!isEditable} onChange={updateField("entryNo")} />
              </Col>
              <Col span={8}>
                <FieldLabel text="Select ERP Number" />
                <Select
                  style={{ width: "100%" }}
                  placeholder="Search ERP number or product"
                  value={form.productId}
                  disabled={!isEditable}
                  loading={productsLoading}
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    option.label.toLowerCase().includes(input.toLowerCase())
                  }
                  options={products.map((p) => ({
                    value: p.id,
                    label: `${p.erp_no || "—"} — ${p.name}`,
                  }))}
                  onChange={handleErpSelect}
                />
              </Col>
              <Col span={8}>
                <FieldLabel text="WIP Bar Code" />
                <Input
                  ref={wipCodeRef}
                  placeholder="Scan QR / enter code"
                  value={form.wipBarCode}
                  onChange={updateField("wipBarCode")}
                  onPressEnter={handleWipCodeScanned}
                  suffix={<ScanOutlined style={{ color: "#3a6d95" }} />}
                />
              </Col>

              <Col span={8}>
                <FieldLabel text="Item Planned" />
                <Input value={form.itemPlanned} disabled={!isEditable} onChange={updateField("itemPlanned")} />
              </Col>
              <Col span={8}>
                <FieldLabel text="Date" />
                <Input value={form.date} disabled />
              </Col>
              <Col span={8}>
                <FieldLabel text="Plan No" />
                <Input value={form.planNo} disabled={!isEditable} onChange={updateField("planNo")} />
              </Col>

              <Col span={8}>
                <FieldLabel text="Quality" />
                <Select
                  style={{ width: "100%" }}
                  value={form.quality}
                  disabled={!isEditable}
                  options={QUALITY_OPTIONS}
                  onChange={(val) => setForm((f) => ({ ...f, quality: val }))}
                />
              </Col>
              <Col span={8}>
                <FieldLabel text="Machine Name" />
                <Input value={form.machineName} disabled={!isEditable} onChange={updateField("machineName")} />
              </Col>
              <Col span={8}>
                <FieldLabel text="Station" />
                <Input value={form.station} disabled={!isEditable} onChange={updateField("station")} />
              </Col>

              <Col span={16}>
                <FieldLabel text="Product Name" />
                <Input value={form.productName} disabled={!isEditable} onChange={updateField("productName")} />
              </Col>
              <Col span={4}>
                <FieldLabel text="Plan Qty" />
                <Input value={form.planQty} disabled={!isEditable} onChange={updateField("planQty")} />
              </Col>
              <Col span={4}>
                <FieldLabel text="Done Qty" />
                <Input value={form.doneQty} disabled={!isEditable} onChange={updateField("doneQty")} />
              </Col>

              {/* ---- GROUP_CREATE staging area: local-only until "Save Group" ---- */}
              {stageFlow?.scan_mode === "GROUP_CREATE" && (
                <Col span={24}>
                  <div
                    style={{
                      marginTop: 6,
                      padding: 12,
                      border: "1px solid #e3e8ef",
                      borderRadius: 8,
                      background: "#fafbfc",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: pendingGroupScans.length ? 10 : 0 }}>
                      <Tag color="orange">{pendingGroupScans.length} scanned, pending group save</Tag>
                      <Button
                        type="primary"
                        size="small"
                        disabled={!pendingGroupScans.length}
                        loading={savingGroup}
                        onClick={handleSaveGroup}
                      >
                        Save Group
                      </Button>
                    </div>

                    {pendingGroupScans.length > 0 && (
                      <Space size={[6, 6]} wrap>
                        {pendingGroupScans.map((s) => (
                          <Tag
                            key={s.tempId}
                            closable
                            onClose={(e) => {
                              e.preventDefault();
                              handleRemovePendingScan(s.tempId);
                            }}
                          >
                            {s.code}
                          </Tag>
                        ))}
                      </Space>
                    )}
                  </div>
                </Col>
              )}
            </Row>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ text }) {
  return (
    <Text
      style={{
        display: "block",
        fontSize: 11.5,
        color: "#64748b",
        marginBottom: 4,
        letterSpacing: 0.2,
      }}
    >
      {text}
    </Text>
  );
}

function StatCard({ title, value, color }) {
  return (
    <Col span={6}>
      <Card
        styles={{ body: { padding: "12px 16px", height: "100%" } }}
        style={{
          border: "1px solid #e3e8ef",
          borderRadius: 10,
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%" }}>
          <div
            style={{
              width: 30,
              height: 3,
              borderRadius: 2,
              background: color,
              marginBottom: 6,
            }}
          />
          <Statistic
            title={<span style={{ color: "#64748b", fontSize: 11.5 }}>{title}</span>}
            value={value}
            valueStyle={{ color: "#1b2430", fontWeight: 700, fontSize: 22 }}
          />
        </div>
      </Card>
    </Col>
  );
}