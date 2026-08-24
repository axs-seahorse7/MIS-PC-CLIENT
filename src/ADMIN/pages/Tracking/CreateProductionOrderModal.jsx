import { useEffect, useState } from "react";
import { Modal, Form, Select, Input, InputNumber, Radio, DatePicker, Alert, message } from "antd";
import dayjs from "dayjs";
import api from "../../../services/API/api";

// ------------------------------------------------------------------
// Endpoints — adjust to match your actual routes / baseURL prefix.
// Products are NOT fetched here anymore — they come in as a prop
// from the parent (ProductionOrdersPage), sourced from /products/admin.
// ------------------------------------------------------------------
const CREATE_ENDPOINT = "/production-orders/create";
const UPDATE_ENDPOINT = (id) => `/production-orders/${id}/update`;
const LINES_ENDPOINT = "/production-lines/all"; // expects [{ id, name }]

const SEQUENCE_MODE_OPTIONS = [
  { label: "Non Sequential", value: "NON_SEQUENTIAL" },
  { label: "Sequential", value: "SEQUENTIAL" },
];

const DEFAULT_SERIAL_WIDTH = 5;
const DEFAULT_SEQUENCE_MODE = "NON_SEQUENTIAL";

/**
 * Create / edit modal for a Production Order.
 *
 * mode="create" → POST a brand new order.
 * mode="edit"   → PUT an existing PLANNED order. Editing regenerates
 *                 the order's serial items + stage rows on the backend,
 *                 so this is only offered for orders that haven't started.
 *
 * `products` is passed down from the parent so every consumer of this
 * modal reads from the same source (/products/admin) instead of each
 * component fetching its own possibly-inconsistent list.
 */
const ProductionOrderFormModal = ({
  open,
  mode = "create",
  record,
  products = [],
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const [lines, setLines] = useState([]);
  const [linesLoading, setLinesLoading] = useState(false);

  // Live-computed target qty, kept in sync with serialStart/serialEnd so
  // the value sent to the backend can never mismatch the serial range.
  const [calculatedQty, setCalculatedQty] = useState(null);

  const isEdit = mode === "edit";

  // Defensive dedupe — collapses duplicate product rows (same erp_no,
  // possibly different ids) regardless of what upstream sends.
  const uniqueProducts = Array.from(
    new Map(products.map((p) => [p.erp_no || p.id, p])).values()
  );

  // ----------------------------------------------------------------
  // Load production lines whenever the modal opens
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    const loadLines = async () => {
      setLinesLoading(true);
      try {
        const res = await api.get(LINES_ENDPOINT);
        setLines(res?.data?.data || res?.data || []);
      } catch (err) {
        message.error("Failed to load production lines");
      } finally {
        setLinesLoading(false);
      }
    };

    loadLines();
  }, [open]);

  // ----------------------------------------------------------------
  // Prefill form when editing, reset when creating
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    if (isEdit && record) {
      form.setFieldsValue({
        productId: record.product_id,
        lineId: record.line_id,
        serialPrefix: record.serial_prefix,
        serialStart: record.serial_start,
        serialEnd: record.serial_end,
        serialWidth: record.serial_width || DEFAULT_SERIAL_WIDTH,
        sequenceMode: record.sequence_mode || DEFAULT_SEQUENCE_MODE,
        plannedDate: record.planned_date ? dayjs(record.planned_date) : null,
      });
      setCalculatedQty(
        record.serial_start != null && record.serial_end != null
          ? record.serial_end - record.serial_start + 1
          : null
      );
    } else {
      form.resetFields();
      form.setFieldsValue({
        serialWidth: DEFAULT_SERIAL_WIDTH,
        sequenceMode: DEFAULT_SEQUENCE_MODE,
      });
      setCalculatedQty(null);
    }
  }, [open, isEdit, record, form]);

  // ----------------------------------------------------------------
  // Keep target qty in sync with the serial range
  // ----------------------------------------------------------------
  const recomputeQty = () => {
    const start = form.getFieldValue("serialStart");
    const end = form.getFieldValue("serialEnd");

    if (start === undefined || start === null || end === undefined || end === null) {
      setCalculatedQty(null);
      return;
    }

    setCalculatedQty(end >= start ? end - start + 1 : null);
  };

  // ----------------------------------------------------------------
  // Submit
  // ----------------------------------------------------------------
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (values.serialStart > values.serialEnd) {
        message.error("Serial start cannot be greater than serial end");
        return;
      }

      const targetQty = values.serialEnd - values.serialStart + 1;

      const payload = {
        productId: values.productId,
        lineId: values.lineId,
        targetQty,
        serialPrefix: values.serialPrefix.trim(),
        serialStart: values.serialStart,
        serialEnd: values.serialEnd,
        serialWidth: values.serialWidth,
        sequenceMode: values.sequenceMode,
        plannedDate: values.plannedDate ? values.plannedDate.format("YYYY-MM-DD") : undefined,
      };

      setSubmitting(true);

      if (isEdit) {
        await api.put(UPDATE_ENDPOINT(record.id), payload);
        message.success("Production order updated");
      } else {
        await api.post(CREATE_ENDPOINT, payload);
        message.success("Production order created");
      }

      onSuccess?.();
    } catch (err) {
      if (err?.errorFields) return; // antd validation error, already shown inline

      message.error(err?.response?.data?.message || `Failed to ${isEdit ? "update" : "create"} order`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? `Edit Production Order — ${record?.order_no || ""}` : "New Production Order"}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={isEdit ? "Save Changes" : "Create Order"}
      destroyOnClose
      width={640}
    >
      {isEdit && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Editing regenerates this order's serial items and stage records."
        />
      )}

      <Form form={form} layout="vertical" onValuesChange={recomputeQty}>
        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item
            label="Product"
            name="productId"
            rules={[{ required: true, message: "Product is required" }]}
            style={{ flex: 1 }}
          >
            <Select
              placeholder="Select product"
              showSearch
              optionFilterProp="label"
              options={uniqueProducts.map((p) => ({
                value: p.id,
                label: p.erp_no ? `${p.name} (${p.erp_no})` : p.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Production Line"
            name="lineId"
            rules={[{ required: true, message: "Production line is required" }]}
            style={{ flex: 1 }}
          >
            <Select
              placeholder="Select line"
              loading={linesLoading}
              showSearch
              optionFilterProp="label"
              options={lines.map((l) => ({ value: l.id, label: l.name }))}
            />
          </Form.Item>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item
            label="Serial Prefix"
            name="serialPrefix"
            rules={[{ required: true, message: "Serial prefix is required" }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="e.g. PCB-A-" />
          </Form.Item>

          <Form.Item
            label="Serial Width"
            name="serialWidth"
            rules={[{ required: true, message: "Serial width is required" }]}
            style={{ width: 140 }}
          >
            <InputNumber min={1} max={12} style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item
            label="Serial Start"
            name="serialStart"
            rules={[{ required: true, message: "Required" }]}
            style={{ flex: 1 }}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Serial End"
            name="serialEnd"
            rules={[{ required: true, message: "Required" }]}
            style={{ flex: 1 }}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Target Qty" style={{ flex: 1 }}>
            <InputNumber
              value={calculatedQty}
              disabled
              style={{ width: "100%" }}
              placeholder="Auto-calculated"
            />
          </Form.Item>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item
            label="Sequence Mode"
            name="sequenceMode"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <Radio.Group options={SEQUENCE_MODE_OPTIONS} optionType="button" buttonStyle="solid" />
          </Form.Item>

          <Form.Item
            label="Planned Date"
            name="plannedDate"
            rules={[{ required: true, message: "Planned date is required" }]}
            style={{ flex: 1 }}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default ProductionOrderFormModal;