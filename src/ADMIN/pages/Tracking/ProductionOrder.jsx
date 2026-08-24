import { useEffect, useMemo, useState } from "react";
import { Input, Select, Drawer, Descriptions, Modal, message, Spin } from "antd";
import { Search, Eye, Pencil, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import api from "../../../services/API/api";
import MasterHeader from "../Masters/components/MasterHeader"; // adjust paths to wherever these actually live
import MasterTable from "../Masters/components/MasterTable";
import ProductionOrderFormModal from "./createProductionOrderModal";

// ------------------------------------------------------------------
// Endpoints. If your `api` instance's baseURL already includes "/api",
// drop the "/api" prefix below to avoid a double prefix.
// ------------------------------------------------------------------
const LIST_ENDPOINT = "/production-orders/all";
const LIST_PRODUCTS_ENDPOINT = "/products/admin"; // expects [{ id, name, erp_no }]
const DETAIL_ENDPOINT = (id) => `/production-orders/${id}`;
const DELETE_ENDPOINT = (id) => `/production-orders/${id}`;
const TRANSITION_ENDPOINT = (id, action) => `/production-orders/${id}/${action}`;

const STATUS_FILTER_OPTIONS = [
  { value: "All", label: "All Status" },
  { value: "PLANNED", label: "Planned" },
  { value: "RUNNING", label: "Running" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// production_orders.status / production_order_stages.status can differ
// (order statuses vs stage statuses) — this map covers both, unknown
// values fall back to the PLANNED/slate style.
const STATUS_STYLES = {
  PLANNED: { bg: "#EFF6FF", text: "#2563EB", dot: "#3B82F6" },
  PENDING: { bg: "#EFF6FF", text: "#2563EB", dot: "#3B82F6" },
  RUNNING: { bg: "#ECFDF5", text: "#16A34A", dot: "#22C55E" },
  IN_PROGRESS: { bg: "#ECFDF5", text: "#16A34A", dot: "#22C55E" },
  PAUSED: { bg: "#FFFBEB", text: "#D97706", dot: "#F59E0B" },
  COMPLETED: { bg: "#F0FDFA", text: "#0D9488", dot: "#14B8A6" },
  CANCELLED: { bg: "#FEF2F2", text: "#DC2626", dot: "#EF4444" },
};

const StatusPill = ({ status }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.PLANNED;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 20,
        background: style.bg,
        color: style.text,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: style.dot }} />
      {status}
    </span>
  );
};

// Small text/icon action button used in the Actions column.
// tone controls the color; icon-only buttons (no label) render as a square.
const ACTION_TONES = {
  neutral: { bg: "#F8FAFC", color: "#64748B", border: "#F1F5F9" },
  start: { bg: "#ECFDF5", color: "#16A34A", border: "#DCFCE7" },
  pause: { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  resume: { bg: "#EFF6FF", color: "#2563EB", border: "#DBEAFE" },
  cancel: { bg: "#FEF2F2", color: "#DC2626", border: "#FEE2E2" },
  edit: { bg: "#EFF6FF", color: "#2563EB", border: "#DBEAFE" },
  delete: { bg: "#FEF2F2", color: "#DC2626", border: "#FEE2E2" },
};

const ActionButton = ({ label, icon: Icon, tone = "neutral", onClick, title }) => {
  const style = ACTION_TONES[tone];
  const iconOnly = Icon && !label;
  return (
    <button
      onClick={onClick}
      title={title || label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        height: 28,
        width: iconOnly ? 28 : "auto",
        padding: iconOnly ? 0 : "0 10px",
        borderRadius: 7,
        border: `1px solid ${style.border}`,
        background: style.bg,
        color: style.color,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
};

// Number of "real" data columns after S.No (Order No through Actions).
// Used to merge a product group row into a single spanning cell.
const DATA_COLUMN_COUNT = 8;

// For every column except the anchor ("Order No"), a group row's cell
// collapses to nothing so the anchor cell's colSpan can take over the
// whole row width.
const hideForGroup = () => ({ children: null, props: { colSpan: 0 } });

const ProductionOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Single form modal drives both create and edit — `formMode` +
  // `editRecord` decide which one it renders as.
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [editRecord, setEditRecord] = useState(null);

  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [products, setProducts] = useState([]);

  // add near fetchOrders
  const fetchProducts = async () => {
    try {
      const res = await api.get(LIST_PRODUCTS_ENDPOINT);
      console.log("Fetched products:", res?.data?.data || res?.data || []);
      setProducts(res?.data?.data || res?.data || []);
    } catch (err) {
      message.error("Failed to load products");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ----------------------------------------------------------------
  // Fetch list (debounced on search, immediate on status change)
  // ----------------------------------------------------------------
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(LIST_ENDPOINT, {
        params: {
          search: search.trim() || undefined,
          status: statusFilter !== "All" ? statusFilter : undefined,
        },
      });
      setOrders(res?.data?.data || res?.data || []);
    } catch (err) {
      message.error("Failed to load production orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchOrders, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  // Build once, keyed by id, whenever products changes
  const productsById = useMemo(() => {
    const map = new Map();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // ----------------------------------------------------------------
  // Group flat orders into product → orders. Each group row carries
  // a `children` array, which is all antd's Table needs to render an
  // expand/collapse [+] toggle automatically — no extra config.
  // ----------------------------------------------------------------
  const groupedOrders = useMemo(() => {
  const groups = new Map();

  orders.forEach((order) => {
    const key = order.product_id ?? "unassigned";
    const canonicalProduct = productsById.get(order.product_id);

    if (!groups.has(key)) {
      groups.set(key, {
        id: `group-${key}`,
        isGroup: true,
        product_id: order.product_id,
        // Prefer the live product record; fall back to the order's
        // denormalized snapshot only if the product lookup isn't ready yet
        // or the product was deleted/deactivated since.
        product_name: canonicalProduct?.name || order.product_name || "Unassigned Product",
        product_erp_no: canonicalProduct?.erp_no || order.product_erp_no,
        children: [],
      });
    }

    groups.get(key).children.push(order);
  });

  return Array.from(groups.values());
}, [orders, productsById]);

  // ----------------------------------------------------------------
  // Create / Edit
  // ----------------------------------------------------------------
  const openCreate = () => {
    setFormMode("create");
    setEditRecord(null);
    setFormOpen(true);
  };

  // List rows already carry serial_prefix / serial_start / serial_end /
  // serial_width / product_id / line_id (see getProductionOrders), so
  // editing can open straight from the row — no extra fetch needed.
  const openEdit = (record) => {
    setFormMode("edit");
    setEditRecord(record);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditRecord(null);
  };

  // ----------------------------------------------------------------
  // View
  // ----------------------------------------------------------------
  const handleView = async (record) => {
    setViewDrawerOpen(true);
    setViewLoading(true);
    try {
      const res = await api.get(DETAIL_ENDPOINT(record.id));
      setViewOrder(res?.data?.data || res?.data || null);
    } catch (err) {
      message.error("Failed to load order details");
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewDrawer = () => {
    setViewDrawerOpen(false);
    setViewOrder(null);
  };

  // ----------------------------------------------------------------
  // Start / Pause / Resume — plain status transitions, no confirm needed
  // ----------------------------------------------------------------
  const TRANSITION_LABELS = { start: "started", pause: "paused", resume: "resumed" };

  const handleTransition = async (record, action) => {
    try {
      await api.patch(TRANSITION_ENDPOINT(record.id, action));
      message.success(`Order ${TRANSITION_LABELS[action] || "updated"}`);
      fetchOrders();
    } catch (err) {
      message.error(err?.response?.data?.message || `Failed to ${action} order`);
    }
  };

  // ----------------------------------------------------------------
  // Cancel — destructive-ish, so confirm first. Flips status to
  // CANCELLED rather than deleting the row (history should stay).
  // ----------------------------------------------------------------
  const handleCancel = (record) => {
    Modal.confirm({
      title: "Cancel production order?",
      content: `${record.order_no} will be marked CANCELLED. This cannot be undone.`,
      okText: "Cancel Order",
      okButtonProps: { danger: true },
      cancelText: "Keep Order",
      onOk: async () => {
        try {
          await api.patch(TRANSITION_ENDPOINT(record.id, "cancel"));
          message.success("Production order cancelled");
          fetchOrders();
        } catch (err) {
          message.error(err?.response?.data?.message || "Failed to cancel order");
        }
      },
    });
  };

  // ----------------------------------------------------------------
  // Delete — actually removes the row (+ its items/stages) from the
  // DB. Only offered for PLANNED / CANCELLED orders in renderActions;
  // the backend re-enforces that rule regardless.
  // ----------------------------------------------------------------
  const handleDelete = (record) => {
    Modal.confirm({
      title: "Delete production order?",
      content: `${record.order_no} and all of its generated serial items will be permanently deleted. This cannot be undone.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Keep Order",
      onOk: async () => {
        try {
          await api.delete(DELETE_ENDPOINT(record.id));
          message.success("Production order deleted");
          fetchOrders();
        } catch (err) {
          message.error(err?.response?.data?.message || "Failed to delete order");
        }
      },
    });
  };

  // ----------------------------------------------------------------
  // Status-driven action set:
  // PLANNED:   View, Edit, Start, Delete
  // RUNNING:   View, Pause, Cancel
  // PAUSED:    View, Resume, Cancel
  // COMPLETED: View only (kept as history)
  // CANCELLED: View, Delete (cleanup)
  // ----------------------------------------------------------------
  const renderActions = (record) => {
    const buttons = [
      <ActionButton key="view" icon={Eye} title="View" onClick={() => handleView(record)} />,
    ];

    if (record.status === "PLANNED") {
      buttons.push(
        <ActionButton key="edit" icon={Pencil} tone="edit" title="Edit" onClick={() => openEdit(record)} />,
        <ActionButton key="start" label="Start" tone="start" onClick={() => handleTransition(record, "start")} />,
        <ActionButton key="delete" icon={Trash2} tone="delete" title="Delete" onClick={() => handleDelete(record)} />
      );
    } else if (record.status === "RUNNING") {
      buttons.push(
        <ActionButton key="pause" label="Pause" tone="pause" onClick={() => handleTransition(record, "pause")} />,
        <ActionButton key="cancel" label="Cancel" tone="cancel" onClick={() => handleCancel(record)} />
      );
    } else if (record.status === "PAUSED") {
      buttons.push(
        <ActionButton key="resume" label="Resume" tone="resume" onClick={() => handleTransition(record, "resume")} />,
        <ActionButton key="cancel" label="Cancel" tone="cancel" onClick={() => handleCancel(record)} />
      );
    } else if (record.status === "CANCELLED") {
      buttons.push(
        <ActionButton key="delete" icon={Trash2} tone="delete" title="Delete" onClick={() => handleDelete(record)} />
      );
    }
    // COMPLETED → View only, nothing more to push

    return <div style={{ display: "flex", gap: 6 }}>{buttons}</div>;
  };

  // ----------------------------------------------------------------
  // Table columns. Every column except "Order No" collapses to
  // nothing on a group row; "Order No" spans the full row width and
  // shows the product name + a running-order-count badge instead.
  // ----------------------------------------------------------------
  const columns = [
    {
      title: "Order No",
      dataIndex: "order_no",
      key: "order_no",
      render: (v, r) => {
        if (r.isGroup) {
          const runningCount = r.children.filter((o) => o.status === "RUNNING").length;
          return {
            children: (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 13.5 }}>
                  {r.product_name}
                  {r.product_erp_no ? ` (${r.product_erp_no})` : ""}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#2563EB",
                    background: "#EFF6FF",
                    borderRadius: 20,
                    padding: "2px 10px",
                  }}
                >
                  {r.children.length} order{r.children.length > 1 ? "s" : ""}
                </span>
                {runningCount > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#16A34A",
                      background: "#ECFDF5",
                      borderRadius: 20,
                      padding: "2px 10px",
                    }}
                  >
                    {runningCount} running
                  </span>
                )}
              </div>
            ),
            props: { colSpan: DATA_COLUMN_COUNT },
          };
        }
        return v;
      },
    },
    {
      title: "Product",
      key: "product",
      render: (_, r) => {
        if (r.isGroup) return hideForGroup();
        return r.product_name ? `${r.product_name}${r.product_erp_no ? ` (${r.product_erp_no})` : ""}` : "—";
      },
    },
    {
      title: "Line",
      dataIndex: "line_name",
      key: "line_name",
      render: (v, r) => (r.isGroup ? hideForGroup() : v || "—"),
    },
    {
      title: "Target Qty",
      dataIndex: "target_qty",
      key: "target_qty",
      render: (v, r) => (r.isGroup ? hideForGroup() : v),
    },
    {
      title: "Sequence",
      dataIndex: "sequence_mode",
      key: "sequence_mode",
      render: (v, r) => (r.isGroup ? hideForGroup() : v),
    },
    {
      title: "Status",
      key: "status",
      render: (_, r) => (r.isGroup ? hideForGroup() : <StatusPill status={r.status} />),
    },
    {
      title: "Planned Date",
      dataIndex: "planned_date",
      key: "planned_date",
      render: (v, r) => (r.isGroup ? hideForGroup() : v ? dayjs(v).format("DD MMM YYYY") : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 230,
      render: (_, r) => (r.isGroup ? hideForGroup() : renderActions(r)),
    },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 5, border: "1px solid #F1F5F9" }}>
      <style>{`
        .po-group-row > td { background: #FAFBFD !important; cursor: pointer; }
        .po-group-row:hover > td { background: #F4F6F8 !important; }
      `}</style>

      <div style={{ padding: "20px 20px 0" }}>
        <MasterHeader
          title="Production Orders"
          description="Create and track serial-tagged production orders across lines"
          buttonLabel="New Production Order"
          onAddClick={openCreate}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          borderTop: "1px solid #F1F5F9",
          borderBottom: "1px solid #F1F5F9",
          background: "#FBFCFD",
          flexWrap: "wrap",
        }}
      >
        <Input
          placeholder="Search by order no..."
          prefix={<Search size={15} color="#94A3B8" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 260, borderRadius: 10, fontSize: 13 }}
          allowClear
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={STATUS_FILTER_OPTIONS}
        />
      </div>

      <div style={{ padding: "0 4px" }}>
        <MasterTable
          columns={columns}
          data={groupedOrders}
          loading={loading}
          rowKey="id"
          rowClassName={(record) => (record.isGroup ? "po-group-row" : "")}
          expandable={{
            defaultExpandAllRows: false,
            indentSize: 18,
          }}
        />
      </div>

      <ProductionOrderFormModal
        open={formOpen}
        mode={formMode}
        record={editRecord}
        products={products}          // <-- new prop, [{ id, name, erp_no, ... }]
        onCancel={closeForm}
        onSuccess={() => {
          closeForm();
          fetchOrders();
        }}
      />

      <Drawer
        title={viewOrder ? `Order ${viewOrder.order_no}` : "Production Order"}
        open={viewDrawerOpen}
        onClose={closeViewDrawer}
        width={460}
      >
        {viewLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : (
          viewOrder && (
            <>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Product">
                  {viewOrder.product_name}
                  {viewOrder.product_erp_no ? ` (${viewOrder.product_erp_no})` : ""}
                </Descriptions.Item>
                <Descriptions.Item label="Line">{viewOrder.line_name || "—"}</Descriptions.Item>
                <Descriptions.Item label="Target Qty">{viewOrder.target_qty}</Descriptions.Item>
                <Descriptions.Item label="Serial Range">
                  {viewOrder.serial_prefix}
                  {String(viewOrder.serial_start).padStart(viewOrder.serial_width, "0")}
                  {" → "}
                  {viewOrder.serial_prefix}
                  {String(viewOrder.serial_end).padStart(viewOrder.serial_width, "0")}
                </Descriptions.Item>
                <Descriptions.Item label="Sequence Mode">{viewOrder.sequence_mode}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <StatusPill status={viewOrder.status} />
                </Descriptions.Item>
                <Descriptions.Item label="Planned Date">
                  {viewOrder.planned_date ? dayjs(viewOrder.planned_date).format("DD MMM YYYY") : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Items Generated">{viewOrder.item_count ?? "—"}</Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 22, fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
                Stage Flow
              </div>
              <div style={{ marginTop: 8 }}>
                {(viewOrder.stages || []).map((stage) => (
                  <div
                    key={stage.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #F1F5F9",
                      fontSize: 13,
                      color: "#334155",
                    }}
                  >
                    <span>
                      {stage.sequence_order}. {stage.stage_name}
                    </span>
                    <StatusPill status={stage.status} />
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </Drawer>
    </div>
  );
};

export default ProductionOrdersPage;