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
//   - "WIP Bar Code" field has a scan icon button -> wire this up
//     later to your QR scanner / hardware input, then call
//     handleScanResult(code) to populate the rest of the fields
//     from your API response.
//   - Save button -> hook up your real save API in handleSave().
//
//   - ROLE-BASED STAGE ASSIGNMENT (added):
//     Each operator is assigned exactly ONE stage by the admin
//     dashboard (a separate app your other developer is building).
//     ALL stages still show here with the same working/visuals, but
//     this operator can only successfully scan their own assigned
//     stage - scanning any other stage is rejected as INVALID.
//     See `assignedStageIndex` below - it reads `user.assignedStage`
//     from AuthContext (1-indexed stage number, e.g. 1 = "GROUPING OF
//     PCB"). A hardcoded fallback is used only because there's no
//     backend connected yet - remove the fallback once the admin
//     dashboard + login API actually send `assignedStage`.
// -------------------------------------------------------------

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
  Modal,
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
import { useAuth } from "../../Authentication/context/AuthContext";    // adjust path if your folder depth differs

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

  // ---- Logged-in operator's assigned stage (from admin dashboard) ----
  const { user } = useAuth();

  // `user.assignedStage` is expected to be a 1-indexed stage number
  // (1 = STAGES[0], 2 = STAGES[1], etc.) coming from the login/auth API
  // once the admin dashboard assigns it. Falls back to stage 1 ONLY for
  // frontend testing since there's no backend connected yet - remove
  // the `?? 1` fallback once `user.assignedStage` is really populated.
  const assignedStageIndex = (user?.assignedStage ?? 1) - 1;

  // ---- Scanning stage tracker state (frontend-only simulation) ----
  // stageStatus[i]: "pending" | "done" | "error"
  const [stageStatus, setStageStatus] = useState(Array(STAGES.length).fill("pending"));
  // indices currently in their instant "flash" tick (JS-driven, not CSS)
  const [flashIndices, setFlashIndices] = useState(new Set());
  // index of the last stage that was confirmed IN correct sequence order
  const [lastConfirmed, setLastConfirmed] = useState(-1);

  // system-generated identifiers - created automatically on the very
  // first successful scan of a fresh entry (mirrors what your backend
  // will eventually generate and link server-side)
  const [groupId, setGroupId] = useState(null);
  const [serialNo, setSerialNo] = useState(null);

  // "missing stage" popup state
  const [missingModalOpen, setMissingModalOpen] = useState(false);
  const [missingStages, setMissingStages] = useState([]); // [{ index, label }]

  // Flashes a single tile ON/OFF a fixed number of times, then resolves.
  // This gives an EXACT blink count (unlike a looping CSS animation),
  // which is what lets us do "blink once" vs "blink twice" reliably.
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

  // The confirm animation for a successful, in-sequence scan reaching
  // `newIndex`:
  //   1. every already-completed stage before it blinks ONCE together
  //   2. then the just-scanned stage blinks TWICE
  //   3. then everything settles to solid blue
  const playConfirmAnimation = async (newIndex) => {
    const priorRange = Array.from({ length: newIndex }, (_, k) => k);
    if (priorRange.length) {
      await Promise.all(priorRange.map((idx) => flashTile(idx, 1)));
    }
    await flashTile(newIndex, 2);
  };

  // ---- This function represents a SCAN EVENT coming from the scanner/backend ----
  // Do NOT call this from a click handler in production. Wire it up to your
  // real scan source instead (hardware scanner acting as a keyboard, or a
  // WebSocket/backend event once the ERP code -> stage lookup exists there).
  //
  // Rules:
  //  0. Scanning a stage that ISN'T this operator's assigned stage ->
  //     INVALID, rejected with an error toast, no state change.
  //  1. Scanning an already-completed stage again -> DUPLICATE, rejected
  //     with a warning toast, no state change.
  //  2. Scanning the next expected stage in sequence -> success. Group ID
  //     + Serial No are generated on the very first scan of a fresh entry.
  //     Confirm animation plays (see playConfirmAnimation above).
  //  3. Scanning a stage further ahead (one or more got skipped) -> the
  //     skipped stage(s) AND this stage turn red (error), and a popup
  //     tells the operator exactly which stage(s) are missing.
  //  4. Scanning a stage that is currently red (error) -> fixes just that
  //     one stage (accepted / turns blue).
  const handleStageScanned = async (index) => {
    // 0. this operator is only assigned ONE stage - block everything else
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
      setMissingModalOpen(true);
      return;
    }
  };

  // The WIP Bar Code field (in the form, below) is the single scan
  // target. Pressing Enter there (which a real scanner does automatically
  // after typing/scanning the code) resolves which stage it belongs to
  // and advances the stage tracker.
  const wipCodeRef = useRef(null);

  useEffect(() => {
    wipCodeRef.current?.focus();
  }, []);

  // TEMP convention for frontend testing: the last 1-2 digits of the
  // scanned ERP code are treated as the stage number (e.g. a code ending
  // in "...04" -> Stage 4). Once your backend can resolve an ERP code to
  // its real stage (and generate/validate the Group ID), replace this
  // with that lookup instead.
  const resolveStageFromCode = (code) => {
    const match = code.trim().match(/(\d{1,2})$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= STAGES.length) return n - 1;
    }
    return lastConfirmed + 1; // fallback: assume the next expected stage
  };

  const handleWipCodeScanned = () => {
    const code = form.wipBarCode.trim();
    if (!code) return;
    handleStageScanned(resolveStageFromCode(code));

    // Highlight the just-scanned code so the NEXT scan (which just types
    // fresh characters, like any hardware scanner does) automatically
    // overwrites it instead of appending after it. The field still shows
    // this code on screen until that next scan happens.
    setTimeout(() => wipCodeRef.current?.select(), 50);
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
  });

  const isEditable = mode === "new" || mode === "edit";

  const updateField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
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

      {/* ---------- MISSING STAGE POPUP ---------- */}
      <Modal
        open={missingModalOpen}
        onOk={() => setMissingModalOpen(false)}
        onCancel={() => setMissingModalOpen(false)}
        title="⚠️ Missing Stage Detected"
        okText="OK"
        cancelButtonProps={{ style: { display: "none" } }}
      >
        <p style={{ marginBottom: 8 }}>
          The sequence was broken. The following stage(s) were not scanned:
        </p>
        <ul style={{ marginBottom: 0 }}>
          {missingStages.map((s) => (
            <li key={s.index}>
              Stage {s.index + 1}: <strong>{s.label}</strong>
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 12, marginBottom: 0, color: "#64748b", fontSize: 12.5 }}>
          Please scan the missing stage(s) - they're marked red on the left rail.
        </p>
      </Modal>

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
            {STAGES.map((label, index) => {
              const st = stageStatus[index];
              const isFlashing = flashIndices.has(index);

              // Default (non-flashing) look:
              //   - pending -> plain white, shows the stage number
              //   - done    -> plain white/neutral, shows a blue checkmark
              //                (the blue FILL only appears temporarily
              //                during the flash, not permanently after)
              //   - error   -> stays solid red (permanent, needs fixing)
              let bg = "#ffffff";
              let border = "#e3e8ef";
              let color = "#1b2430";
              let iconColor = "#3a6d95";

              if (st === "error") {
                bg = "#d1483c";
                border = "#d1483c";
                color = "#ffffff";
              } else if (st === "done") {
                border = "#3a6d95";
              }

              if (isFlashing) {
                // temporary blue flash - only visible during the blink itself
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
                  ref={wipCodeRef}
                  placeholder="Scan QR / enter code"
                  value={form.wipBarCode}
                  onChange={updateField("wipBarCode")}
                  onPressEnter={handleWipCodeScanned}
                  onBlur={() => setTimeout(() => wipCodeRef.current?.focus(), 50)}
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