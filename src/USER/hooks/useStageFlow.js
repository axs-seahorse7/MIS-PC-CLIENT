import { useEffect, useState } from "react";
import { notification } from "antd";
import api from "../../services/API/api"; // adjust path if your folder depth differs

// Loads every stage row for the selected product (sorted by sequence_no),
// and picks out the one row matching the logged-in operator's assigned
// stage. Re-runs whenever the product or user changes. Pure data fetch —
// resetting scan-in-progress state on product change is handled by
// useScanSubmission, which watches `stageFlowRows` itself.
export default function useStageFlow({ productId, user }) {
  const [stageFlowRows, setStageFlowRows] = useState([]);
  const [stageFlow, setStageFlow] = useState(null);

  const STAGES = stageFlowRows.map((r) => r.stage_name);
  const assignedStageIndex = stageFlow ? stageFlow.sequence_no - 1 : -1;

  useEffect(() => {
    if (!productId) {
      setStageFlowRows([]);
      setStageFlow(null);
      return;
    }

    const fetchStageFlow = async () => {
      try {
        const res = await api.get(`/product-stage-flow/${productId}`);
        const payload = res?.data || [];
        const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];

        const sorted = [...rows].sort((a, b) => a.sequence_no - b.sequence_no);
        setStageFlowRows(sorted);

        const matched = sorted.find((r) => r.stage_id === user?.stage?.id) || null;
        if (!matched) {
          console.warn("No matching stage-flow row found for this user's assigned stage.");
        }
        setStageFlow(matched);
      } catch (err) {
        notification.error({
          message: "Stage flow load failed",
          description: "Could not load the scan stage sequence for this product.",
          placement: "topRight",
        });
      }
    };

    fetchStageFlow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, user]);

  return { stageFlowRows, stageFlow, STAGES, assignedStageIndex };
}
