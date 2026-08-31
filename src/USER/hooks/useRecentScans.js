import { useCallback, useEffect, useState } from "react";
import { notification } from "antd";
import api from "../../services/API/api"; // adjust path if your folder depth differs

export default function useRecentScans({ user, productId }) {
  const [recentScans, setRecentScans] = useState([]);

  const fetchLatestScans = useCallback(async () => {
    if (!user?.factory?.id || !user?.line?.id || !user?.stage?.id) {
      notification.warning({
        message: "Cannot fetch latest scans",
        description: "Please select a product and ensure factory, line, and stage are assigned.",
        placement: "topRight",
      });
      setRecentScans([]);
      return;
    }

    if (!productId) return;

    try {
      const res = await api.get(
        `/scan-history/latest-scans/${user.factory.id}/${productId}/${user.line.id}/${user.stage.id}`
      );
      const rows = res?.data?.data ?? [];
      setRecentScans(Array.isArray(rows) ? rows : []);
      console.log("Fetched latest scans:", rows);
    } catch (err) {
      console.error("Error fetching latest scans:", err);
      setRecentScans([]);
      notification.error({
        message: "Failed to load latest scans",
        description:
          err?.response?.data?.message || "Could not fetch the latest scans for this product and stage. Please retry.",
        placement: "topRight",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, productId]);

  useEffect(() => {
    try {
      fetchLatestScans();
    } catch (err) {
      console.error("Error in latest scans effect:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  return { recentScans, setRecentScans, fetchLatestScans };
}
