import { useState, useEffect } from "react";
import { Tag, Modal, message } from "antd";
import { QrCode, Workflow, User, Clock } from "lucide-react";

import MasterHeader from "../Masters/components/MasterHeader";
import MasterToolbar from "../Masters/components/MasterToolbar";
import MasterTable from "../Masters/components/MasterTable";

import api from "../../../services/API/api";

// scan_history table: id, item_id, stage_id, user_id, scanned_at, status (enum), remarks
// Routes — read-only, no create/update/delete on this table:
//   GET /api/scan-history/all            ⚠ ASSUMED base path — confirm your real app.use(...) line
//   GET /api/scan-history/item/:itemId    (used for the "View" drill-down modal)
//   GET /api/scan-history/stage/:stageId  (not used in UI yet — available for future stage-level views)
//
// Lookups:
//   GET /api/items/all
//   GET /api/stages/all
//   GET /api/users/all   ⚠ ASSUMED base path — confirm your real Users module route

const SCAN_HISTORY_BASE = "/scan-history";

const statusConfig = {
  SUCCESS: { color: "success", label: "Success" },
  REJECTED: { color: "error", label: "Rejected" },
  SKIPPED_STAGE: { color: "warning", label: "Skipped Stage" },
};

const statusOptions = [
  { value: "All", label: "All Status" },
  { value: "SUCCESS", label: "Success" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SKIPPED_STAGE", label: "Skipped Stage" },
];

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Defensive array extraction — handles whichever wrapper shape the backend actually returns.
const extractList = (res, label) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.history)) return data.history;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.stages)) return data.stages;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.rows)) return data.rows;
  if (data && typeof data === "object") {
    const firstArray = Object.values(data).find((v) => Array.isArray(v));
    if (firstArray) return firstArray;
  }
  console.error(`[ScanHistory] Could not find an array in the "${label}" response. Raw payload:`, data);
  return [];
};

const normalizeHistory = (row) => ({
  id: row.id,
  itemId: row.item_id,
  stageId: row.stage_id,
  userId: row.user_id,
  scannedAt: row.scanned_at,
  status: row.status || "SUCCESS",
  remarks: row.remarks || "",
});

const ScanHistory = () => {
  const [history, setHistory] = useState([]);
  const [items, setItems] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [viewItemId, setViewItemId] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewHistory, setViewHistory] = useState([]);

  const getItemLabel = (id) => {
    const item = items.find((i) => i.id === id);
    return item ? item.label : id ? `Item #${id}` : "-";
  };

  const getStageLabel = (id) => {
    const stage = stages.find((s) => s.id === id);
    return stage ? stage.name : id ? `Stage #${id}` : "-";
  };

  const getUserLabel = (id) => {
    const user = users.find((u) => u.id === id);
    return user ? user.name : id ? `User #${id}` : "-";
  };

  const fetchAll = async () => {
    setLoading(true);

    const results = await Promise.allSettled([
      api.get(`${SCAN_HISTORY_BASE}/all`),
      api.get("/items/all"),
      api.get("/stages/all"),
      api.get("/users/all"),
    ]);

    const [historyResult, itemsResult, stagesResult, usersResult] = results;
    const failedLabels = [];

    if (historyResult.status === "fulfilled") {
      const list = extractList(historyResult.value, "scan history");
      setHistory(list.map(normalizeHistory));
    } else {
      failedLabels.push("scan history");
      console.error(`Failed: GET ${SCAN_HISTORY_BASE}/all`, historyResult.reason);
    }

    if (itemsResult.status === "fulfilled") {
      const list = extractList(itemsResult.value, "items");
      setItems(list.map((i) => ({ id: i.id, label: `Item #${i.id}` })));
    } else {
      failedLabels.push("items");
      console.error("Failed: GET /items/all", itemsResult.reason);
    }

    if (stagesResult.status === "fulfilled") {
      const list = extractList(stagesResult.value, "stages");
      setStages(list.map((s) => ({ id: s.id, name: s.name || s.stage_name || `Stage #${s.id}` })));
    } else {
      failedLabels.push("stages");
      console.error("Failed: GET /stages/all", stagesResult.reason);
    }

    if (usersResult.status === "fulfilled") {
      const list = extractList(usersResult.value, "users");
      setUsers(list.map((u) => ({ id: u.id, name: u.name || u.fullName || u.username || `User #${u.id}` })));
    } else {
      failedLabels.push("users");
      console.error("Failed: GET /users/all", usersResult.reason);
    }

    if (failedLabels.length > 0) {
      message.error(`Failed to load: ${failedLabels.join(", ")}. Check console for details.`);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filteredData = history.filter((row) => {
    const term = search.toLowerCase();
    const matchesSearch =
      getItemLabel(row.itemId).toLowerCase().includes(term) ||
      getStageLabel(row.stageId).toLowerCase().includes(term) ||
      getUserLabel(row.userId).toLowerCase().includes(term) ||
      (row.remarks || "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "All" || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openItemHistory = async (record) => {
    try {
      setViewLoading(true);
      setViewItemId(record.itemId);
      const res = await api.get(`${SCAN_HISTORY_BASE}/item/${record.itemId}`);
      const list = extractList(res, "item scan history");
      const normalized = list.map(normalizeHistory).sort((a, b) => new Date(a.scannedAt) - new Date(b.scannedAt));
      setViewHistory(normalized);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load item history");
    } finally {
      setViewLoading(false);
    }
  };

  const columns = [
    { title: "Item", dataIndex: "itemId", key: "itemId", render: (v) => getItemLabel(v) },
    { title: "Stage", dataIndex: "stageId", key: "stageId", render: (v) => getStageLabel(v) },
    { title: "Scanned By", dataIndex: "userId", key: "userId", render: (v) => getUserLabel(v) },
    { title: "Scanned At", dataIndex: "scannedAt", key: "scannedAt", render: (v) => formatDateTime(v) },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => {
        const cfg = statusConfig[v] || { color: "default", label: v };
        return <Tag color={cfg.color} style={{ borderRadius: 20, fontWeight: 600 }}>{cfg.label}</Tag>;
      },
    },
    { title: "Remarks", dataIndex: "remarks", key: "remarks", ellipsis: true, render: (v) => v || "-" },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <MasterHeader
          title="Scan History"
          description="Full audit trail of every QR scan across the production floor"
        />
      </div>

      <MasterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by item, stage, user or remarks..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={statusOptions}
      />

      <MasterTable
        columns={columns}
        data={filteredData}
        loading={loading}
        onView={openItemHistory}
      />

      <Modal
        open={!!viewItemId}
        onCancel={() => setViewItemId(null)}
        footer={null}
        centered
        width={480}
        confirmLoading={viewLoading}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
          Scan Journey — {getItemLabel(viewItemId)}
        </div>
        <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 18 }}>
          Every recorded scan for this item, in chronological order
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0, maxHeight: 400, overflowY: "auto" }}>
          {viewHistory.length === 0 && !viewLoading && (
            <div style={{ fontSize: 13, color: "#94A3B8", textAlign: "center", padding: "24px 0" }}>
              No scan records found for this item.
            </div>
          )}

          {viewHistory.map((entry, index) => {
            const cfg = statusConfig[entry.status] || { color: "default", label: entry.status };
            const isLast = index === viewHistory.length - 1;
            return (
              <div key={entry.id} style={{ display: "flex", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: "#2563EB",
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />
                  {!isLast && <div style={{ width: 1.5, flex: 1, background: "#E2E8F0", marginTop: 2 }} />}
                </div>

                <div style={{ paddingBottom: isLast ? 0 : 18, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>
                      <Workflow size={13} style={{ marginRight: 5, verticalAlign: -2 }} />
                      {getStageLabel(entry.stageId)}
                    </span>
                    <Tag color={cfg.color} style={{ borderRadius: 20, fontWeight: 600, margin: 0 }}>
                      {cfg.label}
                    </Tag>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B", marginTop: 6 }}>
                    <User size={12} />
                    {getUserLabel(entry.userId)}
                    <span style={{ color: "#CBD5E1" }}>·</span>
                    <Clock size={12} />
                    {formatDateTime(entry.scannedAt)}
                  </div>

                  {entry.remarks && (
                    <div style={{ fontSize: 12.5, color: "#475569", marginTop: 6, background: "#F8FAFC", borderRadius: 8, padding: "6px 10px" }}>
                      {entry.remarks}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default ScanHistory;