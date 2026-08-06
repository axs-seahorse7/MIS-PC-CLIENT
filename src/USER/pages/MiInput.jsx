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
  SUCCESS: "green",
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
  const [status, setStatus] = useState("SUCCESS");

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

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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
        console.log("Fetched products:", res?.data);
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

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null)
        setSuccessMessage(null)
      }, 10000);
      return () => clearTimeout(timer);
    } 

  }, [errorMessage, successMessage]);

  useEffect(() => {
    async function fetchProductionTargets() {
      const res = await api.get(`/production-targets/by-line-and-product/${user?.line?.id}/${form.productId}`);
      console.log("Fetched production targets:", res?.data);
      setForm((f) => ({ ...f, planQty: res?.data?.data?.[0]?.target_quantity || 0 }));
    }

    fetchProductionTargets();
}, [user?.line?.id, form.productId]);

  //  Generate a UNIQUE id where the code segment is is e.g. AB-TODAY DATE-PRODUCT ID - SERIAL NO. 
  const generateUniqueIdPlanNo = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const currentTimeInMs = Date.now().toString().slice(-6); 
    const productId = form.productId || "UNKNOWN";
    const productFirst3 = form.productName ? form.productName.slice(0, 3).toUpperCase() : "UNK";
    return `${productFirst3}-${today}-${productId}-${currentTimeInMs}`;
  };

  // ---- GROUP_CREATE staging: scans collected here are LOCAL ONLY.
  // Nothing hits scan_history until "Save Group" is clicked, at which
  // point the whole batch of codes is sent to the server together.
  const [pendingGroupScans, setPendingGroupScans] = useState([]); 
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
        console.log("Fetched stage flow rows:", rows);

        const sorted = [...rows].sort((a, b) => a.sequence_no - b.sequence_no);
        setStageFlowRows(sorted);

        
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
        setErrorMessage("Failed to load stage flow for this product");
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
      station: user?.stage?.name || "",
      itemPlanned: selected?.erp_no || "",
      date: new Date().toISOString().slice(0, 10), 
      machineName: user?.line?.name || "",
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

  const handleStageScanned = (index, data) => {
    if (!data.success) {
      switch (data.errorType) {
        case "DUPLICATE_STAGE":
          setStageStatus((prev) => {
            const next = [...prev];
            if (index >= 0) next[index] = "done";
            return next;
          });
          setErrorMessage(data.message);
          break;

        case "ALREADY_COMPLETED":
          setErrorMessage(data.message);
          break;

        case "BACKWARD_SCAN":
          setErrorMessage(data.message);
          break;

        case "MISSING_STAGES": {
          const missingList = (data.missing || []).map((m) => ({
            index: m.sequence_no - 1,
            label: m.stage_name,
          }));

          setStageStatus((prev) => {
            const next = [...prev];
            missingList.forEach((m) => {
              if (m.index >= 0 && m.index < next.length) next[m.index] = "error";
            });
            return next;
          });
          setMissingStages(missingList);
          setErrorMessage(data.message);

          if (missingResetTimeoutRef.current) clearTimeout(missingResetTimeoutRef.current);
          missingResetTimeoutRef.current = setTimeout(clearMissingHighlight, 10000);
          break;
        }

        default:
          console.warn("submitScan response missing errorType:", data);
          setErrorMessage(data.message || "Scan failed.");
      }
      return;
    }

    // success
    setStageStatus((prev) => {
      const next = [...prev];
      next[index] = "done";
      return next;
    });
    setLastConfirmed(index);
    if (!groupId) {
      setGroupId(data.group_id ?? `GRP-${Date.now().toString().slice(-6)}`);
      setSerialNo(form.wipBarCode || "—");
    }
    playConfirmAnimation(index);
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
      setErrorMessage(null);
      setSuccessMessage(`${code} scan submitted successfully.`);
      return res.data; // { success: true, data: { sequence_no, ... } }
    } catch (err) {
      // Return the server's actual error payload (errorType, missing, message)
      // instead of discarding it — this is what was getting lost.
      return (
        err?.response?.data || {
          success: false,
          errorType: "NETWORK_ERROR",
          message: "Scan submission failed",
        }
      );
    }
  };

  const handleWipCodeScanned = async () => {
    const code = form.wipBarCode.trim();
    if (!code) return;

    clearMissingHighlight(); 
    
    if (mode !== "view") {
      setErrorMessage("Cannot scan while in New/Edit mode. Save your changes first.");
      return;
    }

    if (!form.productId) {
      setErrorMessage("Select an ERP number before scanning.");
      return;
    }
    if (!stageFlow) {
      setErrorMessage("Stage flow not loaded for this product yet.");
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
          setErrorMessage(`"${code}" is already in the pending list.`);
          return prev;
        }
        const next = [...prev, { code, tempId: `${code}-${Date.now()}` }];
        setErrorMessage(`Scan added (${next.length} pending). Save group when ready.`);
        return next;
      });
      return;
    }

    // SINGLE or GROUP_SCAN: save directly.
    const result = await submitScanToServer(code);
    const resultIndex = result?.data?.sequence_no
      ? result.data.sequence_no - 1
      : assignedStageIndex; // fall back to the operator's own stage for error highlighting
    handleStageScanned(resultIndex, result);
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
      setErrorMessage("No pending scans to group.");
      return;
    }
    setSavingGroup(true);
    try {
      const res = await api.post("/scan-history/create-group", {
        scanned_values: pendingGroupScans.map((s) => s.code),
        product_id: form.productId,
      });
      if (!res?.data?.success) {
        setErrorMessage(res?.data?.message || "Failed to save group");
        return;
      }
      setErrorMessage(null);
      setSuccessMessage("Group saved successfully.");
      setPendingGroupScans([]);
      await handleStageScanned(assignedStageIndex);
      setTimeout(() => wipCodeRef.current?.focus(), 50); 

   
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
      setErrorMessage(err?.response?.data?.message || "Failed to save group");
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

  
  const handleSave = () => {
    if(!form.productId ) {
      setErrorMessage("Cannot save: select a product first.");
      return;
    }
    if(!form.planQty || form.planQty <= 0) {
      setErrorMessage("Cannot save: enter a valid plan quantity.");
      return;
    }
    setMode("view");
    setStatus("SAVED/ACCEPTED");
    setTimeout(() => wipCodeRef.current?.focus(), 50);
    const uniqueId = generateUniqueIdPlanNo();
    form.planNo = uniqueId;
  };

  const handleCancel = () => {
    setMode("view");
    setForm(EMPTY_FORM);
  };

  const todayDonePercent = ((2055 / 5000) * 100).toFixed(1);


  const missingResetTimeoutRef = useRef(null);

  const clearMissingHighlight = () => {
    if (missingResetTimeoutRef.current) {
      clearTimeout(missingResetTimeoutRef.current);
      missingResetTimeoutRef.current = null;
    }
    setMissingStages((prevMissing) => {
      if (prevMissing.length) {
        const indexesToReset = new Set(prevMissing.map((m) => m.index));
        setStageStatus((prevStatus) =>
          prevStatus.map((s, i) => (indexesToReset.has(i) && s === "error" ? "pending" : s))
        );
      }
      return [];
    });
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (missingResetTimeoutRef.current) clearTimeout(missingResetTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const KEEP_FOCUS_SELECTORS =
      'input, textarea, .ant-select-selector, .ant-select-dropdown, .ant-select-item, .ant-picker, .ant-picker-dropdown';

    const handleDocumentClick = (e) => {
      const wipInputEl = wipCodeRef.current?.input;
      if (!wipInputEl) return;

      const target = e.target;
      if (wipInputEl.contains(target)) return; // already the field itself
      if (target.closest(KEEP_FOCUS_SELECTORS)) return; // let other real inputs keep focus

      // Buttons (New/Edit/Save Group/Alert close/Tag close, etc.) still fire
      // their own React onClick first — this native document listener runs
      // after it in the bubble phase — so we just reclaim focus afterward.
      window.setTimeout(() => wipInputEl.focus(), 0);
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

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
      <style>{`
        @keyframes missingStagePulse {
          0%, 100% { background-color: #d1483c; border-color: #d1483c; }
          50% { background-color: #ff8a75; border-color: #ff8a75; }
        }
        .missing-stage-blink { animation: missingStagePulse 0.9s ease-in-out infinite; }
      `}</style>
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

        <Space size={8}>
          <Title level={5} style={{ margin: 0, color: "#1b2430" }}>
            MI Input
          </Title>
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
          <Text type="secondary" style={{ fontSize: 12 }}>
            STATUS : 
          </Text>
         {errorMessage && <Tag color="orange">{errorMessage || status}</Tag>}
         {successMessage && <Tag color="green">{successMessage}</Tag>}

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
                const isMissingBlinking = missingStages.some((m) => m.index === index); // add this


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
                    className={isMissingBlinking ? "missing-stage-blink" : undefined}
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
             
              <Col span={12}>
                <FieldLabel text="Select product" />
                <Select
                  style={{ width: "100%" }}
                  placeholder="Search product..."
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
              <Col span={12}>
                <FieldLabel text="WIP Bar Code" />
                <Input
                  disabled={!form.productId || mode !== "view"}
                  ref={wipCodeRef}
                  placeholder={!form.productId ? "Select a product first" : "Scan QR / enter code"}
                  value={form.wipBarCode}
                  onChange={updateField("wipBarCode")}
                  onPressEnter={handleWipCodeScanned}
                  suffix={<ScanOutlined style={{ color: "#3a6d95" }} />}
                />
              </Col>

              <Col span={8}>
                <FieldLabel text="Item Planned" />
                <Input disabled value={form.itemPlanned} />
              </Col>
              <Col span={8}>
                <FieldLabel text="Date" />
                <Input value={form.date} disabled />
              </Col>
              <Col span={8}>
                <FieldLabel text="Plan No" />
                <Input value={form.planNo} disabled={!isEditable} onChange={updateField("planNo")} disabled />
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
                <Input value={form.machineName} disabled={!isEditable}/>
              </Col>
              <Col span={8}>
                <FieldLabel text="Station" />
                <Input value={form.station} disabled onChange={updateField("station")} />
              </Col>

              <Col span={16}>
                <FieldLabel text="Product Name" />
                <Input value={form.productName} disabled  />
              </Col>
              <Col span={4}>
                <FieldLabel text="Plan Qty" />
                <Input value={form.planQty} disabled={!isEditable} onChange={updateField("planQty")} />
              </Col>
              <Col span={4}>
                <FieldLabel text="Done Qty" />
                <Input value={form.doneQty} />
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