import { useEffect, useState } from "react";
import { notification } from "antd";
import { EMPTY_FORM, EMPTY_STAGE_STATS } from "../constants/form";

// Form fields, product selection, and the New/Edit/Save/Cancel mode
// machinery. Deliberately knows nothing about scanning, stage flow, or the
// server round-trips for a scan — see useScanSubmission for that.
export default function useProductionForm({ user }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState("view"); // "view" | "new" | "edit"
  const [status, setStatus] = useState("SUCCESS");
  const [selected, setSelected] = useState(null);
  const [stageStats, setStageStats] = useState(EMPTY_STAGE_STATS);

  const isEditable = mode === "new" || mode === "edit";

  // Mirrors the original behavior: deselecting the product (New/Cancel,
  // or clearing the Select) always drops back to zeroed KPI stats.
  useEffect(() => {
    if (!form.productId) {
      setStageStats(EMPTY_STAGE_STATS);
    }
  }, [form.productId]);

  const updateField = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const generateUniqueIdPlanNo = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const currentTimeInMs = Date.now().toString().slice(-6);
    const productId = form.productId || "UNKNOWN";
    const productFirst3 = form.productName ? form.productName.slice(0, 3).toUpperCase() : "UNK";
    return `${productFirst3}-${today}-${productId}-${currentTimeInMs}`;
  };

  const handleErpSelect = (productId, products) => {
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

  const handleNew = () => {
    setForm(EMPTY_FORM);
    setSelected(null);
    setStageStats(EMPTY_STAGE_STATS);
    setMode("new");
    setStatus("DRAFT");
  };

  const handleEdit = () => {
    setMode("edit");
    setStatus("PENDING");
  };

  const handleSave = () => {
    if (!form.productId) {
      notification.error({ message: "Cannot save", description: "Select a product first.", placement: "topRight" });
      return;
    }
    setMode("view");
    setStatus("SAVED/ACCEPTED");
    const uniqueId = generateUniqueIdPlanNo();
    setForm((f) => ({ ...f, planNo: uniqueId }));
  };

  const handleCancel = () => {
    setMode("view");
    setForm(EMPTY_FORM);
    setSelected(null);
  };

  return {
    form,
    setForm,
    mode,
    status,
    selected,
    isEditable,
    stageStats,
    setStageStats,
    updateField,
    handleErpSelect,
    handleNew,
    handleEdit,
    handleSave,
    handleCancel,
  };
}
