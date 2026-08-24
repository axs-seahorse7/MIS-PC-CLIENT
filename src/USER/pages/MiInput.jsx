import React, { useState, useRef, useEffect } from "react";
import { Button, Input, Select, Tag, Card, Divider, Row, Col, Space, Typography, Alert, notification} from "antd";
import { ScanOutlined, PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined, CheckCircleFilled, CloseCircleFilled} from "@ant-design/icons";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useAuth } from "../../Authentication/context/AuthContext"; // adjust path if your folder depth differs
import api from "../../services/API/api";
import formatScanTime from "../../helpers/formatScanTime"


import { printRawZpl } from "../../utils/qzTray";
import { buildBoxLabelZpl } from "../../utils/zplBuilder";

const { Text, Title } = Typography;

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

// server-driven target/achievement snapshot — comes back on every scan
// response (SINGLE / GROUP_CREATE / GROUP_SCAN / Save Group). Drives the
// PLAN / PRODUCTION / ACHIEVED / REMAINS % cards. All read-only in the UI.
const EMPTY_STAGE_STATS = {
  targetQty: 0,
  achievedQty: 0,
  remainingQty: 0,
  achievementPercent: 0,
  production_order_status: "PENDING",
  remainsQty: 0,
};

export default function MIInput() {
  const [mode, setMode] = useState("view"); // "view" | "new" | "edit"
  const [status, setStatus] = useState("SUCCESS");

  // ---- Logged-in operator's assigned stage (from admin dashboard) ----
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);


  const [stageFlowRows, setStageFlowRows] = useState([]); // ALL stages for this product, sorted by sequence_no
  const [stageFlow, setStageFlow] = useState(null); // the ONE row matching the logged-in user's stage

  const STAGES = stageFlowRows.map((r) => r.stage_name);
  const assignedStageIndex = stageFlow ? stageFlow.sequence_no - 1 : -1;

  const [stageStatus, setStageStatus] = useState([]);
  const [flashIndices, setFlashIndices] = useState(new Set());
  const [lastConfirmed, setLastConfirmed] = useState(-1);

  const [groupId, setGroupId] = useState(null);
  const [serialNo, setSerialNo] = useState(null);

  // server-driven target/achievement stats — see EMPTY_STAGE_STATS above
  const [stageStats, setStageStats] = useState(EMPTY_STAGE_STATS);

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // "missing stage" inline banner state
  const [missingStages, setMissingStages] = useState([]); // [{ index, label }]


  //get the latest 10 scans for the current product and stage
  const [recentScans, setRecentScans] = useState([]); 

  const fetchLatestScans = async () => {

    if (!user?.factory?.id || !user?.line?.id || !user?.stage?.id) {
      notification.warning({
        message: "Cannot fetch latest scans",
        description: "Please select a product and ensure factory, line, and stage are assigned.",
        placement: "topRight",
      });

      setRecentScans([]);
      return;
    }

    if(!form.productId) return;

    try {
      const res = await api.get(`/scan-history/latest-scans/${user.factory.id}/${form.productId}/${user.line.id}/${user.stage.id}`);

      const rows = res?.data?.data ?? [];
      setRecentScans(Array.isArray(rows) ? rows : []);
      console.log("Fetched latest scans:",rows);

    } catch (err) {

      console.error(
        "Error fetching latest scans:",
        err
      );

      setRecentScans([]);

      notification.error({
        message: "Failed to load latest scans",
        description:
          err?.response?.data?.message ||
          "Could not fetch the latest scans for this product and stage. Please retry.",
        placement: "topRight",
      });

    }
  };

  useEffect(() => {
    try {
      
      fetchLatestScans();
    } catch (err) {
      console.error("Error in latest scans effect:", err);
    }
  }, [form.productId]);


  // Non-blocking glass popup for scan-related errors (duplicate / missing
  // stage / backward scan / any other scan rejection). Purely decorative —
  // no focusable elements, pointer-events: none — so the WIP bar code field
  // never loses focus while this is on screen.
  const [errorPopup, setErrorPopup] = useState(null); // { type: 'DUPLICATE' | 'MISSING' | 'ERROR', title, message }
  const errorPopupTimeoutRef = useRef(null);

  const showErrorPopup = (popup) => {
    if (errorPopupTimeoutRef.current) clearTimeout(errorPopupTimeoutRef.current);
    setErrorPopup(popup);
    errorPopupTimeoutRef.current = setTimeout(() => {
      setErrorPopup(null);
      errorPopupTimeoutRef.current = null;
    }, 8000);
  };

  useEffect(() => {
    return () => {
      if (errorPopupTimeoutRef.current) clearTimeout(errorPopupTimeoutRef.current);
    };
  }, []);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);


  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const res = await api.get("/products/all");
        console.log("Fetched products:", res?.data);
        setProducts(res?.data?.data || res?.data || []);
      } catch (err) {
        console.error("Error fetching products:", err);
        notification.error({
          message: "Failed to load products",
          description: "Could not fetch the product list. Please retry.",
          placement: "topRight",
        });
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



  //  Generate a UNIQUE id where the code segment is is e.g. AB-TODAY DATE-PRODUCT ID - SERIAL NO. 
  const generateUniqueIdPlanNo = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const currentTimeInMs = Date.now().toString().slice(-6); 
    const productId = form.productId || "UNKNOWN";
    const productFirst3 = form.productName ? form.productName.slice(0, 3).toUpperCase() : "UNK";
    return `${productFirst3}-${today}-${productId}-${currentTimeInMs}`;
  };


 const printBoxLabel = async (packaging) => {
  const printerName = packaging.printer_name;

  if (!printerName) {
    notification.error({
      message: "Print skipped",
      description: "No printer configured for this packaging rule.",
      placement: "topRight",
    });
    return;
  }

  console.log("🖨️ PRINT BOX LABEL CALLED", {
    jobId: packaging.print_job_id,
    barcode: packaging.barcode_data,
    time: new Date().toISOString(),
  });

  try {
    const zpl = buildBoxLabelZpl({
      barcodeData: packaging.barcode_data,
    });

    console.log("Sending clean ZPL payload:", zpl);

    // PRINT ONLY ONCE
    await printRawZpl(printerName, zpl);

    console.log("✅ Print job completely handed over to QZ Tray!");

    // Update DB only after successful handoff
    await api.patch(
      `/print/box-print-jobs/${packaging.print_job_id}`,
      {
        status: "PRINTED",
      }
    );

    notification.success({
      message: "Box label printed",
      description: `Box ${packaging.box_code} — ${packaging.barcode_data}`,
      placement: "topRight",
    });

  } catch (err) {
    console.error("❌ PRINT FAILED:", err);

    await api.patch(
      `/print/box-print-jobs/${packaging.print_job_id}`,
      {
        status: "FAILED",
        error_message: err?.message || "Print failed",
      }
    );

    notification.error({
      message: "Print failed",
      description: err?.message || "Could not send label to printer.",
      placement: "topRight",
    });
  }
};

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
      setStageStats(EMPTY_STAGE_STATS);
      return;
    }

    const fetchStageFlow = async () => {
      try {
        const res = await api.get(`/product-stage-flow/${form.productId}`);
        const payload = res?.data || [];
        const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];

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
        // setStageStats(EMPTY_STAGE_STATS);
      } catch (err) {
        setErrorMessage("Failed to load stage flow for this product");
        notification.error({
          message: "Stage flow load failed",
          description: "Could not load the scan stage sequence for this product.",
          placement: "topRight",
        });
      }

    };

    fetchStageFlow();
  }, [form.productId, user]); 

  // Selecting an ERP number auto-fills the product name / id for scan readiness
  const [selected, setSelected] = useState(null);

  const handleErpSelect = (productId) => {
    const selectedProduct = products.find((p) => p.id === productId);
    setSelected(selectedProduct);

    setForm((f) => ({
      ...f,
      productId,
      erpNo: selectedProduct?.erp_no || "",
      productName: selectedProduct?.name || "",
      station: user?.stage?.name || "",
      itemPlanned: selectedProduct?.erp_no || "",
      planNo: selectedProduct?.production_order_no || "",
      date: new Date().toISOString().slice(0, 10),
      machineName: user?.line?.name || "",
    }));
    setStageStats({
      targetQty: selectedProduct?.target_qty || 0,
      achievedQty: selectedProduct?.achieved_qty || 0,
      remainingQty: selectedProduct?.remaining_qty || 0,
      achievementPercent: selectedProduct?.achievement_percent || 0,
      production_order_status: selectedProduct?.production_order_status || "PENDING",
      remainsQty: selectedProduct?.remaining_qty || 0,
    });
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

 
  const applyStageStatsFromResponse = (responseData) => {
    if (!responseData) return;
    const targetQty = responseData.target_qty ?? responseData.stage_target_qty ?? null;
    const achievedQty = responseData.stage_achieved_qty ?? null;
    const remainingQty = responseData.stage_remaining_qty ?? null;
    const achievementPercent = responseData.stage_achievement_percent ?? null;

    setStageStats((s) => ({
      ...s,
      targetQty: targetQty ?? s.targetQty,
      achievedQty: achievedQty ?? s.achievedQty,
      remainingQty: remainingQty ?? s.remainingQty,
      remainsQty: remainingQty ?? s.remainsQty,
      achievementPercent: achievementPercent ?? s.achievementPercent,
    }));

    setForm((f) => ({
      ...f,
      planQty: targetQty ?? f.planQty,
      doneQty: achievedQty ?? f.doneQty,
    }));
  };

 const handleStageScanned = (index, data) => {
  if (!data.success) {
    switch (data.errorType) {

      // ------------------------------------------------------
      // Already scanned at this stage
      // ------------------------------------------------------

      case "DUPLICATE_STAGE":
        setStageStatus((prev) => {
          const next = [...prev];

          if (index >= 0 && index < next.length) {
            next[index] = "done";
          }

          return next;
        });

        setErrorMessage(data.message);

        showErrorPopup({
          type: "DUPLICATE",
          title: "Already Scanned",
          message: data.message,
        });

        break;


      // ------------------------------------------------------
      // Already completed
      // ------------------------------------------------------

      case "ALREADY_COMPLETED":
        setErrorMessage(data.message);
        showErrorPopup({
          type: "DUPLICATE",
          title: "Already Scanned",
          message: data.message,
        });

        break;


      // ------------------------------------------------------
      // Backward scan
      // ------------------------------------------------------

      case "BACKWARD_SCAN":
        setErrorMessage(data.message);
        showErrorPopup({
          type: "ERROR",
          title: "Scan Rejected",
          message: data.message,
        });

        break;


      // ------------------------------------------------------
      // Missing normal MES stages
      // ------------------------------------------------------

      case "MISSING_STAGES": {
        const missingList = (data.missing || []).map((stage) => ({
          index: stage.sequence_no - 1,
          label: stage.stage_name,
        }));


        setStageStatus((prev) => {
          const next = [...prev];
          missingList.forEach((stage) => {
            if (
              stage.index >= 0 &&
              stage.index < next.length
            ) {
              next[stage.index] = "error";
            }

          });

          return next;
        });


        setMissingStages(missingList);
        setErrorMessage(data.message);
        showErrorPopup({
          type: "MISSING",
          title: "Missing Stage(s)",
          message: data.message,
        });


        // Clear temporary highlight after 10 seconds

        if (missingResetTimeoutRef.current) {
          clearTimeout(missingResetTimeoutRef.current);
        }

        missingResetTimeoutRef.current = setTimeout(
          clearMissingHighlight,
          10000
        );

        break;
      }


      // ------------------------------------------------------
      // External machine validation failed
      //
      // This stage is virtual, but still exists in the
      // production flow. Highlight the actual machine stage
      // that blocked production.
      // ------------------------------------------------------

      case "EXTERNAL_DEPENDENCY_FAILED": {
        const dependency = data.stage;
        if (dependency?.sequence_no != null) {

          const dependencyIndex = Number(dependency.sequence_no) - 1;
          setStageStatus((prev) => {
            const next = [...prev];

            if (
              dependencyIndex >= 0 &&
              dependencyIndex < next.length
            ) {
              next[dependencyIndex] = "error";
            }

            return next;
          });


          // Use the same missing-stage mechanism if your UI
          // already depends on this state for labels/highlights.

          setMissingStages([
            {
              index: dependencyIndex,
              label: dependency.stage_name,
            },
          ]);
        }


        setErrorMessage(data.message);

        showErrorPopup({
          type: "ERROR",
          title: `${dependency?.machine_type || "External Machine"} Validation Failed`,
          message: data.message,
        });


        // Clear temporary error highlight

        if (missingResetTimeoutRef.current) {
          clearTimeout(missingResetTimeoutRef.current);
        }

        missingResetTimeoutRef.current = setTimeout(
          clearMissingHighlight,
          10000
        );

        break;
      }


      // ------------------------------------------------------
      // Unknown error
      // ------------------------------------------------------

      default:

        console.warn("submitScan response missing or unknown errorType:", data);

        setErrorMessage(data.message || "Scan failed.");

        showErrorPopup({
          type: "ERROR",
          title: "Scan Failed",
          message: data.message ||"Scan failed. Please try again.",
        });
    }

    return;
  }


  // ==========================================================
  // SCAN SUCCESS
  // ==========================================================

  // Production target / achievement
  applyStageStatsFromResponse(data.data);


  // Packaging print
  const packaging = data.data?.packaging;

  if (packaging?.print_job_created) {
    printBoxLabel(packaging);
  }


  // Mark current physical MES stage as completed

  setStageStatus((prev) => {
    const next = [...prev];

    if (
      index >= 0 &&
      index < next.length
    ) {
      next[index] = "done";
    }

    return next;
  });


  setLastConfirmed(index);


  // Create group ID if required

  if (!groupId) {

    setGroupId(
      data.group_id ??
      data?.data?.group_id ??
      `GRP-${Date.now().toString().slice(-6)}`
    );

    setSerialNo(
      form.wipBarCode || "—"
    );
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

const submitScanToServer = async (code) => {
  try {
    const res = await api.post("/scan-history/create", {
      scanned_value: code,
      product_id: form.productId,
    });

    const response = res?.data;
    const scanData = response?.data;

    console.log("Scan submission response:", response);

    setErrorMessage(null);

    setSuccessMessage(`${code} has been successfully recorded.`);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 10000);


    // ==========================================================
    // Update production stage statistics
    // ==========================================================

    setStageStats((prev) => ({
      ...prev,

      targetQty:
        scanData?.stage_target_qty ??
        prev.targetQty,

      achievedQty:
        scanData?.stage_achieved_qty ??
        prev.achievedQty,

      remainingQty:
        scanData?.stage_remaining_qty ??
        prev.remainingQty,

      remainsQty:
        scanData?.stage_remaining_qty ??
        prev.remainsQty,

      achievementPercent:
        scanData?.stage_achievement_percent ??
        prev.achievementPercent,
    }));


    // ==========================================================
    // Refresh latest scans
    // ==========================================================

    fetchLatestScans();


    return response;

  } catch (err) {

    console.error(
      "Error submitting scan:",
      err
    );

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
      const msg = "Cannot scan while in New/Edit mode. Save your changes first.";
      setErrorMessage(msg);
      showErrorPopup({ type: "ERROR", title: "Scan Blocked", message: msg });
      setTimeout(() => wipCodeRef.current?.focus(), 0);
      return;
    }

    if (!form.productId) {
      const msg = "Select an ERP number before scanning.";
      setErrorMessage(msg);
      showErrorPopup({ type: "ERROR", title: "Scan Blocked", message: msg });
      setTimeout(() => wipCodeRef.current?.focus(), 0);
      return;
    }
    if (!stageFlow) {
      const msg = "Stage flow not loaded for this product yet.";
      setErrorMessage(msg);
      showErrorPopup({ type: "ERROR", title: "Scan Blocked", message: msg });
      setTimeout(() => wipCodeRef.current?.focus(), 0);
      return;
    }

    if (stageFlow.scan_mode === "GROUP_CREATE") {
      let wasDuplicate = false;
      setPendingGroupScans((prev) => {
        if (prev.some((s) => s.code === code)) {
          wasDuplicate = true;
          const dupeMsg = `"${code}" is already in the pending list.`;
          setErrorMessage(dupeMsg);
          showErrorPopup({ type: "DUPLICATE", title: "Already Scanned", message: dupeMsg });
          return prev;
        }
        const next = [...prev, { code, tempId: `${code}-${Date.now()}` }];
        setErrorMessage(`Scan added (${next.length} pending). Save group when ready.`);
        return next;
      });

      // Only clear on acceptance into the pending list — not on duplicate.
      if (!wasDuplicate) {
        setForm((f) => ({ ...f, wipBarCode: "" }));
      }
      setTimeout(() => wipCodeRef.current?.focus(), 50);
      return;
    }

    // SINGLE or GROUP_SCAN: save directly.
    const result = await submitScanToServer(code);
    const resultIndex = result?.data?.sequence_no
      ? result.data.sequence_no - 1
      : assignedStageIndex;

    if (result.success) {
      setForm((f) => ({ ...f, wipBarCode: "" }));
      addRecentScan(code);
    }
    setTimeout(() => wipCodeRef.current?.focus(), 50);

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
      notification.warning({
        message: "Nothing to save",
        description: "There are no pending scans to group.",
        placement: "topRight",
      });
      return;
    }
    setSavingGroup(true);
    try {
      const res = await api.post("/scan-history/create-group", {
        scanned_values: pendingGroupScans.map((s) => s.code),
        product_id: form.productId,
      });
      if (!res?.data?.success) {
        notification.error({
          message: "Group save failed",
          description: res?.data?.message || "Failed to save group",
          placement: "topRight",
        });
        return;
      }
      setErrorMessage(null);
      setSuccessMessage("Group saved successfully.");
      pendingGroupScans.forEach((s) => addRecentScan(s.code));
      setPendingGroupScans([]);
      notification.success({
        message: "Group saved",
        description: res?.data?.message || "Group saved successfully.",
        placement: "topRight",
      });

      // wire the real server response into stats/targets and stage tiles —
      // previously this was called with no data, so PLAN/PROD/DONE% never
      // updated after a group save.
      await handleStageScanned(assignedStageIndex, res.data);
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
      const msg = err?.response?.data?.message || "Failed to save group";
      setErrorMessage(msg);
      notification.error({
        message: "Group save failed",
        description: msg,
        placement: "topRight",
      });
    } finally {
      setSavingGroup(false);
    }
  };


  const isEditable = mode === "new" || mode === "edit";

  const updateField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // ---- New: full reset, ready for a fresh ERP selection ----
  const handleNew = () => {
    setForm(EMPTY_FORM);
    setSelected(null);
    setStageFlowRows([]);
    setStageFlow(null);
    setStageStatus([]);
    setPendingGroupScans([]);
    setLastConfirmed(-1);
    setGroupId(null);
    setSerialNo(null);
    setStageStats(EMPTY_STAGE_STATS);
    setRecentScans([]);
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
      notification.error({
        message: "Cannot save",
        description: "Select a product first.",
        placement: "topRight",
      });
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
    setSelected(null);
  };

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
    const KEEP_FOCUS_SELECTORS = 'input, textarea, .ant-select-selector, .ant-select-dropdown, .ant-select-item, .ant-picker, .ant-picker-dropdown';

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
        height: "calc(100vh - 120px)",
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

        @keyframes glassPopupIn {
          0% { opacity: 0; transform: translateY(-8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes glassPopupOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes recentScanIn {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .pg-action-btn { transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease; }
        .pg-action-btn:not(:disabled):hover { transform: translateY(-1px); filter: brightness(1.03); }
        .pg-action-btn:not(:disabled):active { transform: translateY(0); }
      `}</style>


      

      {/* ---------- NON-BLOCKING ERROR POPUP ----------
          pointer-events: none on the whole overlay — it cannot receive
          clicks or focus. The WIP bar code field stays focused and
          scannable the entire time this is visible. Solid pastel card,
          matching the app's badge/pill visual language (no glass/blur).
          Covers DUPLICATE (orange), and MISSING / ERROR (red). */}
      {errorPopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 90,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              minWidth: 340,
              maxWidth: 420,
              background: errorPopup.type === "MISSING" || errorPopup.type === "ERROR" ? "#fdeceb" : "#fdf3e2",
              border: `1.5px solid ${errorPopup.type === "MISSING" || errorPopup.type === "ERROR" ? "#f3b4ac" : "#f0cd8a"}`,
              borderRadius: 16,
              boxShadow: "0 12px 32px rgba(15,23,42,0.15)",
              padding: "16px 20px",
              animation: "glassPopupIn 0.25s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: errorPopup.type === "MISSING" || errorPopup.type === "ERROR" ? "#d1483c" : "#c9820a",
                  color: "#fff",
                }}
              >
                <CloseCircleFilled style={{ fontSize: 15 }} />
              </span>
              <div>
                <Text
                  strong
                  style={{
                    fontSize: 13.5,
                    color: errorPopup.type === "MISSING" || errorPopup.type === "ERROR" ? "#b8352a" : "#a8690a",
                    display: "block",
                    marginBottom: 2,
                  }}
                >
                  {errorPopup.title}
                </Text>
                <Text style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                  {errorPopup.message}
                </Text>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- ACTION BAR (sticky, always visible) ---------- */}
      <div
        style={{ 
          position: "sticky",
          top: 0,
          zIndex: 100,
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
              Production Order: {selected?.production_order_no? <span style={{color: "green"}} > {selected?.production_order_no} </span> : <span style={{color: "orange"}} > Not Selected </span> } 
          </Title>
          {selected?.production_order_status && (
            <Tag level={5} 
            variant="filled" 
            style={{ 
              margin: 0,
              color: selected?.production_order_status === "COMPLETED" ? "green" : selected?.production_order_status === "RUNNING" ? "blue" : "orange", 
              backgroundColor: selected?.production_order_status === "COMPLETED" ? "#d1fae5" : selected?.production_order_status === "RUNNING" ? "#dbeafe" : "#fef3c7",
              borderRadius: 6,
              fontWeight: 600, 
              padding: "2px 10px" }}>
              {selected?.production_order_status} 
            </Tag>
        )}
        </Space>
      

        <Space size={10}>
          <ActionButton
            icon={<PlusOutlined />}
            label="New"
            color="#2563eb"
            onClick={handleNew}
            disabled={isEditable}
          />
          <ActionButton
            icon={<EditOutlined />}
            label="Edit"
            color="#c9820a"
            onClick={handleEdit}
            disabled={isEditable}
          />
          <ActionButton
            icon={<SaveOutlined />}
            label="Save"
            color="#16a34a"
            filled
            onClick={handleSave}
            disabled={!isEditable}
          />
          <ActionButton
            icon={<CloseOutlined />}
            label="Cancel"
            color="#dc2626"
            filled
            onClick={handleCancel}
            disabled={!isEditable}
          />
        </Space>
      </div>

      {/* ---------- PLANNED ITEM / ITEM NAME SUMMARY ROW ----------
          Mirrors the header line in the approved layout. Everything else
          that used to live in the field grid (Date, Plan No, Quality,
          Machine Name, Station, Plan/Done Qty) now surfaces in the Navbar
          instead — the underlying `form` values are still tracked here
          so the Navbar can read them once that wiring is in place. */}
        <div
          style={{
            flexShrink: 0,
            background: "#ffffff",
            borderBottom: "1px solid #e3e8ef",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
          }}
        >
          <Tag style={{ borderRadius: 6, fontWeight: 600, padding: "2px 10px" }}>
            STATION : {user?.stage?.name || "—"}
          </Tag>
            {selected && (
              <Divider type="vertical" style={{ height: 20, borderColor: "#e3e8ef" }} />
            )}
            {selected && 
            <Tag style={{ borderRadius: 6, fontWeight: 600, padding: "2px 10px" }}>
              PLANNED ITEM : {selected.erp_no || "—"}
            </Tag>
            } 
            {selected && (
              <Divider type="vertical" style={{ height: 20, borderColor: "#e3e8ef" }} />
            )}
            {selected && (  
              <Tag style={{ borderRadius: 6, fontWeight: 600, padding: "2px 10px" }}>
              ITEM NAME : {selected.name || "—"}
              </Tag>
            )}
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
          <Text
            strong
            style={{
              display: "block",
              fontSize: 10.5,
              color: "#3a6d95",
              letterSpacing: 0.4,
              textTransform: "uppercase",
              marginBottom: 6,
              padding: "0 2px",
            }}
          >
            All Stations
          </Text>
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

        {/* Center - stats + scan workspace */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minHeight: 0,
          }}
        >
          {/* Stats row - fully server-driven from the latest scan response
              (SINGLE / GROUP_CREATE / GROUP_SCAN / Save Group). No hardcoded
              values — falls back to 0 until a scan/target response arrives. */}
          <Row gutter={14} style={{ flexShrink: 0, height: 100 }}>
            <StatCard title="PLAN" value={stageStats.targetQty} color="#3a6d95" />
            <StatCard title="PRODUCTION" value={stageStats.achievedQty} color="#c9820a" />
            <StatCard
              title="ACHIEVED"
              value={stageStats.achievedQty}
              color="#0f9a90"
              chartPercent={stageStats.achievementPercent}
            />
            <StatCard
              title="REMAINS %"
              value={`${stageStats.remainsQty}`}
              color="#d1483c"
              chartPercent={stageStats.targetQty ? (stageStats.remainingQty / stageStats.targetQty) * 100 : 0}
            />
          </Row>

          {/* Scan workspace — left: product select + WIP scan + selected
              product summary (and GROUP_CREATE staging when applicable).
              Right: rolling feed of the most recently recorded scans. */}
          <Row gutter={14} style={{ flex: 1, minHeight: 0 }}>
            <Col span={12} style={{ height: "100%" }}>
              <Card
                styles={{ body: { padding: 18, height: "100%", display: "flex", flexDirection: "column", gap: 16 } }}
                style={{ border: "1px solid #e3e8ef", borderRadius: 10, height: "100%" }}
              >
                <div>
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
                </div>

                <div>
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
                </div>

                <div>
                  <Text
                    strong
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "#16a34a",
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Selected Product
                  </Text>
                  <div
                    style={{
                      border: "1px solid #cfe3d5",
                      background: "#f2faf4",
                      borderRadius: 8,
                      padding: "10px 12px",
                      minHeight: 20,
                    }}
                  >
                    {selected ? (
                      <Text style={{ fontSize: 13, fontWeight: 700, color: "#1b2430" }}>
                        {selected.erp_no || "—"} — {selected.name || "—"}
                      </Text>
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12.5 }}>
                        No product selected yet
                      </Text>
                    )}
                  </div>
                </div>

                {/* ---- GROUP_CREATE staging area: local-only until "Save Group" ---- */}
                {stageFlow?.scan_mode === "GROUP_CREATE" && (
                  <div
                    style={{
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
                )}
              </Card>
            </Col>

            <Col span={12} style={{ height: "100%" }}>
              <Card
                styles={{ body: { padding: 18, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } }}
                style={{ border: "1px solid #e3e8ef", borderRadius: 10, height: "100%" }}
              >
                <Text
                  strong
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "#3a6d95",
                    letterSpacing: 0.3,
                    textTransform: "uppercase",
                    marginBottom: 10,
                    flexShrink: 0,
                  }}
                >
                  Recent Scanned ({recentScans.length} latest)
                </Text>

                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  {recentScans?.length === 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No scans recorded yet.
                    </Text>
                  )}
                  {recentScans?.map((s) => (
                    <div  
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "1px solid #e3e8ef",
                        borderRadius: 8,
                        padding: "8px 12px",
                        background: "#fafbfc",
                        animation: "recentScanIn 0.2s ease-out",
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: 600, color: "#1b2430" }}>{s?.scanned_value?? ""}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{s?.scanned_at? formatScanTime(s.scanned_at) : ""}</Text>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
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

// Header action button — pastel outline for secondary actions (New, Edit),
// solid fill for the primary/destructive actions (Save, Cancel). Matches the
// pill/badge look: light tint background, colored border, bold colored text.
function ActionButton({ icon, label, color, onClick, disabled, filled }) {
  const baseStyle = filled
    ? {
        background: color,
        border: `1.5px solid ${color}`,
        color: "#ffffff",
        boxShadow: `0 4px 12px ${color}40`,
      }
    : {
        background: `${color}14`,
        border: `1.5px solid ${color}45`,
        color,
        boxShadow: "none",
      };

  return (
    <button
      className="pg-action-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseStyle,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 36,
        padding: "0 16px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span style={{ fontSize: 13, display: "flex" }}>{icon}</span>
      {label}
    </button>
  );
}

// Pastel KPI card — solid tinted background + colored border + bold colored
// value, matching the app's badge/pill visual language (no glass/blur).
// Pass `chartPercent` (0-100) to render a small donut ring — used on
// TODAY DONE / DONE % so those two read as progress at a glance.
function StatCard({ title, value, color, chartPercent }) {
  const hasChart = typeof chartPercent === "number" && !Number.isNaN(chartPercent);
  const clamped = hasChart ? Math.min(100, Math.max(0, chartPercent)) : 0;
  const chartData = hasChart
    ? [
        { name: "filled", value: clamped },
        { name: "remaining", value: 100 - clamped },
      ]
    : null;

  return (
    <Col span={6}>
      <div
        style={{
          height: "100%",
          borderRadius: 14,
          padding: "12px 14px",
          background: `${color}12`,
          border: `1.5px solid ${color}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 7,
              background: `${color}22`,
              marginBottom: 8,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 3, background: color }} />
          </div>
          <Text
            style={{
              display: "block",
              color,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.3,
              opacity: 0.85,
              marginBottom: 2,
            }}
          >
            {title}
          </Text>
          <Text style={{ fontSize: 22, fontWeight: 800, color }}>{value}</Text>
        </div>

        {hasChart && (
          <div style={{ width: 50, height: 50, flexShrink: 0, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={14}
                  outerRadius={24}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive
                >
                  <Cell fill={color} />
                  <Cell fill={`${color}25`} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9.5,
                fontWeight: 700,
                color,
              }}
            >
              {clamped}%
            </div>
          </div>
        )}
      </div>
    </Col>
  );
}