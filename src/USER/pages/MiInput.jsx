// src/User/pages/MIInput/MIInput.jsx
// -------------------------------------------------------------
// MI Input - shop floor entry screen (Ant Design, frontend only)
//
// Layout:
//   1. Top header  (fixed) - company logo + "PG MES" | USER + icon
//   2. Sub header  (fixed) - "MI INPUT" title + STATUS tag
//                            | New / Edit / Save / Cancel buttons
//   3. Body (fills remaining height, no page scroll)
//      - Left rail: quick module tabs (SM-ICT, ICT REQD, ...)
//      - Center: entry form fields (Entry No, Line, WIP Bar Code,
//        Item Planned, Date, Plan No, Quality, Machine, Station,
//        Product Name, Plan Qty, Done Qty)
//      - Bottom: PLAN / PROD / TODAY DONE / DONE% stat cards
//
// NOTE: Frontend only, as requested.
//   - Action bar now shows the module tab buttons (SM ICT, ICT REQD,
//     FCT REQD, SM FCT, FT REQD, SM FT, CUST SFN, PS11400, FIND SFN)
//     instead of the scan barcode input. No onClick logic wired yet -
//     tell me what each button should do and I'll hook it up.
//   - "WIP Bar Code" field (inside the form) still has a scan icon
//     button -> wire this up later to your QR scanner / hardware
//     input, then call handleScanResult(code) to populate the rest
//     of the fields from your API response.
//   - Save button -> hook up your real save API in handleSave().
//
//   - Data flow (IMPORTANT for backend hookup):
//     All numbers shown on screen (Plan Qty, Done Qty, Today Done,
//     Done %) are now DERIVED from `form` state only - nothing is a
//     separately hardcoded literal anymore. So the moment `fetchEntryData()`
//     below is pointed at your real API, every card/field on this page
//     will update correctly with zero further edits.
//   - `fetchEntryData()` and `fetchStageStatus()` are stubbed with a
//     TODO and are NOT called anywhere yet (kept frontend-only, as
//     asked). Wire the `useEffect` at the bottom of the component when
//     the backend is ready.
// -------------------------------------------------------------

import React, { useState } from "react";
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

const { Text, Title } = Typography;

// Left rail - production scanning stages (in expected sequence order)
const STAGES = [
  "GROUPING OF PCB",
  "SMT INPUT",
  "SMI INPUT",
  "SOLDERING",
  "AI INPUT SCANNING",
  "SCANNING OF THE OUTPUT",
  "MI INPUT SCANNING",
  "PROGRAMMING STAGE",
  "FCT STAGE",
  "OUTPUT STAGE",
];

// Action-bar module tabs
const MODULE_TABS = [
  "SM ICT",
  "ICT REQD",
  "FCT REQD",
  "SM FCT",
  "FT REQD",
  "SM FT",
  "CUST SFN",
  "PS11400",
  "FIND SFN",
];

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

export default function MIInput() {
  const [mode, setMode] = useState("view"); // "view" | "new" | "edit"
  const [status, setStatus] = useState("SAVED/ACCEPTED");

  // ---- Scanning stage tracker state (frontend-only simulation) ----
  // stageStatus[i]: "pending" | "done" | "error"
  const [stageStatus, setStageStatus] = useState(Array(STAGES.length).fill("pending"));
  // indices currently in their 2s blink window
  const [blinkSet, setBlinkSet] = useState([]);
  // index of the last stage that was confirmed IN correct sequence order
  const [lastConfirmed, setLastConfirmed] = useState(-1);

  // ---- This function represents a SCAN EVENT coming from the scanner/backend ----
  // Wire it up to your real scan source, e.g.:
  //   - a hardware barcode/QR scanner acting as a keyboard, or
  //   - a WebSocket/socket.io message from your backend: socket.on("stageScanned",
  //     (stageIndex) => handleStageScanned(stageIndex))
  //
  // Rules:
  //  1. Scanning the next expected stage in sequence -> success (all
  //     confirmed stages so far blink blue for 2s, then stay solid blue).
  //  2. Scanning a stage further ahead (one got skipped) -> the skipped
  //     stage(s) AND this stage turn red (error).
  //  3. Scanning a stage that is currently red -> fixes just that stage
  //     (turns it blue / accepted).
  //  4. Anything else (e.g. the same stage scanned again after being done)
  //     is ignored - it does not count as a scan.
  const handleStageScanned = (index) => {
    const expectedNext = lastConfirmed + 1;

    if (stageStatus[index] === "error") {
      // fixing a previously missed/flagged stage
      setStageStatus((prev) => {
        const next = [...prev];
        next[index] = "done";
        return next;
      });
      setBlinkSet([index]);
      setTimeout(() => setBlinkSet([]), 2000);
      if (index > lastConfirmed) setLastConfirmed(index);
      return;
    }

    if (index === expectedNext) {
      const doneRange = Array.from({ length: index + 1 }, (_, i) => i);
      setStageStatus((prev) => {
        const next = [...prev];
        doneRange.forEach((i) => (next[i] = "done"));
        return next;
      });
      setLastConfirmed(index);
      setBlinkSet(doneRange);
      setTimeout(() => setBlinkSet([]), 2000);
      return;
    }

    if (index > expectedNext) {
      const skippedRange = [];
      for (let i = expectedNext; i <= index; i++) skippedRange.push(i);
      setStageStatus((prev) => {
        const next = [...prev];
        skippedRange.forEach((i) => (next[i] = "error"));
        return next;
      });
      setLastConfirmed(index);
      return;
    }

    // already-done stage scanned again -> not a valid scan, ignore
  };

  const [form, setForm] = useState({
    entryNo: "6A",
    line: "102:MI LINE 02",
    wipBarCode: "",
    itemPlanned: "0710S881324",
    date: "10/07/2026",
    planNo: "20260709-0C",
    quality: "OK",
    machineName: "68/01MI & CTL LIN",
    station: "1006:MI01.A001",
    productName: "70020206:IDU PCB CVTE INV 12K & 18K REV_01 (S.KFNSI)",
    planQty: 5000,
    doneQty: 2055,
    todayDone: 130,
  });

  const isEditable = mode === "new" || mode === "edit";

  const updateField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // TODO: hook up real QR/barcode scanner -> call this with the scanned code
  const handleScanResult = (code) => {
    setForm((f) => ({ ...f, wipBarCode: code }));
    // then fetch item details from your API and setForm(...) with the response
  };

  const handleNew = () => {
    setMode("new");
    setStatus("DRAFT");
  };
  const handleEdit = () => setMode("edit");
  const handleSave = () => {
    // TODO: call your real save API here
    setMode("view");
    setStatus("SAVED/ACCEPTED");
  };
  const handleCancel = () => {
    setMode("view");
  };

  // TODO: replace with real API call, e.g.:
  //   const res = await fetch(`/api/mi-input/${entryId}`);
  //   const data = await res.json();
  //   setForm(data);
  // Then call this inside a useEffect on mount / on entryId change.
  const fetchEntryData = async () => {
    // stub only - not called anywhere yet, kept frontend-only for now
  };

  // TODO: replace with real API call to get which stages are already
  // scanned for this entry (so the left-rail tracker doesn't reset on
  // every page refresh), e.g.:
  //   const res = await fetch(`/api/mi-input/${entryId}/stages`);
  //   const data = await res.json(); // { stageStatus: [...], lastConfirmed: n }
  //   setStageStatus(data.stageStatus);
  //   setLastConfirmed(data.lastConfirmed);
  const fetchStageStatus = async () => {
    // stub only - not called anywhere yet, kept frontend-only for now
  };

  // All figures below are derived from `form` state, NOT hardcoded
  // literals - so wiring fetchEntryData() to a real API is enough to
  // make every stat card / field on this page reflect real data.
  const todayDonePercent =
    form.planQty > 0 ? ((form.doneQty / form.planQty) * 100).toFixed(1) : "0.0";

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
        <Space size={6} wrap>
          {MODULE_TABS.map((label) => (
            <Button key={label} size="small">
              {label}
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
            overflowY: "auto",
          }}
        >
          <style>{`
            @keyframes stageBlinkBlue {
              0%, 100% { background: #3a6d95; border-color: #3a6d95; }
              50% { background: #bcd3e6; border-color: #3a6d95; }
            }
            .stage-tile-blink {
              animation: stageBlinkBlue 0.5s ease-in-out infinite;
            }
          `}</style>

          <Space direction="vertical" size={6} style={{ width: "100%", flex: 1 }}>
            {STAGES.map((label, index) => {
              const st = stageStatus[index];
              const isBlinking = blinkSet.includes(index);

              let bg = "#ffffff";
              let border = "#e3e8ef";
              let color = "#1b2430";
              if (st === "done") {
                bg = "#3a6d95";
                border = "#3a6d95";
                color = "#ffffff";
              } else if (st === "error") {
                bg = "#d1483c";
                border = "#d1483c";
                color = "#ffffff";
              }

              return (
                <div
                  key={label}
                  className={isBlinking ? "stage-tile-blink" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: `1px solid ${border}`,
                    background: isBlinking ? undefined : bg,
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
                      background: "rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                    }}
                  >
                    {st === "done" ? (
                      <CheckCircleFilled style={{ fontSize: 11 }} />
                    ) : st === "error" ? (
                      <CloseCircleFilled style={{ fontSize: 11 }} />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>{label}</span>
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
          {/* Stats row - frozen at top, does not scroll away, fixed compact height */}
          <Row gutter={14} style={{ flexShrink: 0, height: 100, position: "sticky", top: 0, zIndex: 1 }}>
            <StatCard title="PLAN" value={form.planQty} color="#3a6d95" />
            <StatCard title="PROD" value={form.doneQty} color="#c9820a" />
            <StatCard title="TODAY DONE" value={form.todayDone} color="#0f9a90" />
            <StatCard title="DONE %" value={`${todayDonePercent}%`} color="#d1483c" />
          </Row>
 
          <Card
            styles={{ body: { padding: 18, height: "100%", overflowY: "auto" } }}
            style={{ border: "1px solid #e3e8ef", borderRadius: 10, flex: 1, minHeight: 0, overflow: "hidden" }}
          >
            <Row gutter={[16, 14]}>
              <Col span={8}>
                <FieldLabel text="Entry No" />
                <Input value={form.entryNo} disabled={!isEditable} onChange={updateField("entryNo")} />
              </Col>
              <Col span={8}>
                <FieldLabel text="Line" />
                <Select
                  style={{ width: "100%" }}
                  value={form.line}
                  disabled={!isEditable}
                  options={LINE_OPTIONS}
                  onChange={(val) => setForm((f) => ({ ...f, line: val }))}
                />
              </Col>
              <Col span={8}>
                <FieldLabel text="WIP Bar Code" />
                <Input
                  placeholder="Scan QR / enter code"
                  value={form.wipBarCode}
                  disabled={!isEditable}
                  onChange={updateField("wipBarCode")}
                  suffix={
                    <ScanOutlined
                      style={{ color: "#3a6d95", cursor: isEditable ? "pointer" : "not-allowed" }}
                      onClick={() => isEditable && handleScanResult(form.wipBarCode)}
                    />
                  }
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