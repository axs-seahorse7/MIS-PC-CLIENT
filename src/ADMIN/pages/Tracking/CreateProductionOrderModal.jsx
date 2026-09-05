import { useEffect, useState } from "react";
import { Modal, Form, Select, InputNumber, Radio, DatePicker, Alert, message } from "antd";
import dayjs from "dayjs";
import api from "../../../services/API/api";

const CREATE_ENDPOINT = "/production-orders/create";
const UPDATE_ENDPOINT = (id) => `/production-orders/${id}/update`;
const LINES_ENDPOINT = "/production-lines/all";

const SEQUENCE_MODE_OPTIONS = [
  { label: "Non Sequential", value: "NON_SEQUENTIAL" },
  { label: "Sequential", value: "SEQUENTIAL" },
];

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

  const isEdit = mode === "edit";

  const uniqueProducts = Array.from(
    new Map(products.map((p) => [p.id, p])).values()
  );

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

  useEffect(() => {
    if (!open) return;

    if (isEdit && record) {
      form.setFieldsValue({
        productId: record.product_id,
        lineId: record.line_id,
        targetQty: Number(record.target_qty || 0),
        sequenceMode: record.sequence_mode || "NON_SEQUENTIAL",
        plannedDate: record.planned_date
          ? dayjs(record.planned_date)
          : null,
      });
    } else {
      form.resetFields();

      form.setFieldsValue({
        sequenceMode: "NON_SEQUENTIAL",
        plannedDate: dayjs(),
      });
    }
  }, [open, isEdit, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        productId: values.productId,
        lineId: values.lineId,
        targetQty: Number(values.targetQty),
        sequenceMode: values.sequenceMode,
        plannedDate: values.plannedDate
          ? values.plannedDate.format("YYYY-MM-DD")
          : undefined,
      };

      setSubmitting(true);

      if (isEdit) {
        await api.put(
          UPDATE_ENDPOINT(record.id),
          payload
        );

        message.success("Production order updated");
      } else {
        await api.post(
          CREATE_ENDPOINT,
          payload
        );

        message.success("Production order created");
      }

      onSuccess?.();

    } catch (err) {
      if (err?.errorFields) return;

      message.error(
        err?.response?.data?.message ||
        `Failed to ${isEdit ? "update" : "create"} production order`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        isEdit
          ? `Edit Production Order — ${record?.order_no || ""}`
          : "New Production Order"
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={isEdit ? "Save Changes" : "Create Order"}
      destroyOnClose
      width={800}
    >
      {isEdit && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Editing will reassign Product QR identities for this order."
        />
      )}

      <Form
        form={form}
        layout="vertical"
      >
        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item
            label="Product"
            name="productId"
            rules={[
              {
                required: true,
                message: "Product is required",
              },
            ]}
            style={{ flex: 1 }}
          >
            <Select
              placeholder="Select product"
              showSearch
              optionFilterProp="label"
              options={uniqueProducts.map((product) => ({
                value: product.id,
                label: product.erp_no
                  ? `${product.name} (${product.erp_no})`
                  : product.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Production Line"
            name="lineId"
            rules={[
              {
                required: true,
                message: "Production line is required",
              },
            ]}
            style={{ flex: 1 }}
          >
            <Select
              placeholder="Select production line"
              loading={linesLoading}
              showSearch
              optionFilterProp="label"
              options={lines.map((line) => ({
                value: line.id,
                label: line.code
                  ? `${line.name} (${line.code})`
                  : line.name,
              }))}
            />
          </Form.Item>
        </div>

        <Form.Item
          label="Target Quantity"
          name="targetQty"
          rules={[
            {
              required: true,
              message: "Target quantity is required",
            },
            {
              validator: (_, value) => {
                if (
                  value === undefined ||
                  value === null ||
                  value === ""
                ) {
                  return Promise.resolve();
                }

                if (
                  !Number.isInteger(Number(value)) ||
                  Number(value) < 1
                ) {
                  return Promise.reject(
                    new Error(
                      "Target quantity must be a positive whole number"
                    )
                  );
                }

                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            min={1}
            precision={0}
            style={{ width: "100%" }}
            placeholder="Enter production quantity"
          />
        </Form.Item>

        <div
          style={{
            marginBottom: 20,
            padding: "14px 16px",
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#64748B",
              marginBottom: 4,
            }}
          >
            Product QR Assignment
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#334155",
              lineHeight: 1.5,
            }}
          >
            Product QR identities are assigned automatically from the
            generated Product QR pool when the order is created.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <Form.Item
            label="Sequence Mode"
            name="sequenceMode"
            rules={[
              {
                required: true,
                message: "Sequence mode is required",
              },
            ]}
            style={{ flex: 1 }}
          >
            <Radio.Group
              options={SEQUENCE_MODE_OPTIONS}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>

          <Form.Item
            label="Planned Date"
            name="plannedDate"
            rules={[
              {
                required: true,
                message: "Planned date is required",
              },
            ]}
            style={{ flex: 1 }}
          >
            <DatePicker
              style={{ width: "100%" }}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default ProductionOrderFormModal;