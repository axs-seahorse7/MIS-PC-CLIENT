import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Select, InputNumber, Switch, message, Tag, Popconfirm, Button, Space } from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import api from "../../../services/API/api";
import MasterHeader from "../../pages/Masters/components/MasterHeader";
import MasterToolbar from "../../pages/Masters/components/MasterToolbar";
import MasterTable from "../../pages/Masters/components/MasterTable";
import MasterFormModal from "../../pages/Masters/components/MasterFormModal";

const BARCODE_FORMATS = ["CODE128", "QR", "EAN13", "DATAMATRIX"];

export default function PackagingRuleManager() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [search, setSearch] = useState("");
  const selectedProductId = Form.useWatch("product_id", form);

  // ---- data ----
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["packaging-config"],
    queryFn: async () => (await api.get("/packaging-config")).data,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await api.get("/products/all")).data,
  });

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: async () => (await api.get("/printers")).data,
  });

  
  const { data: allStages = [] } = useQuery({
    queryKey: ["product-stage-flow", selectedProductId],
    queryFn: async () =>
      (await api.get(`/product-stage-flow/${selectedProductId}`)).data,
    enabled: !!selectedProductId,
  });

  // Only offer the PACKAGING stage in this dropdown — packaging rules attach
  // to the packaging step of the flow, not every step (per the flow diagram:
  // SMT-GROUPING -> SMT INPUT LOADER -> ICT-SCANNING -> PACKAGING).
  const stages = useMemo(
    () =>
      allStages.filter((s) =>
        (s.stage_name || s.name || "").toUpperCase().includes("PACKAGING")
      ),
    [allStages]
  );

  const productMap = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p.name])),
    [products]
  );

  const printerMap = useMemo(
    () => Object.fromEntries(printers.map((p) => [p.id, p.printer_name || p.name])),
    [printers]
  );

  const stageMap = useMemo(() =>
      Object.fromEntries(
        allStages.map((s) => [
          s.stage_id,
          s.stage_name || s.name
        ])
      ),
    [allStages]
  );

  // ---- mutations ----
  const saveMutation = useMutation({
    mutationFn: async (values) => {
      if (editingRecord) {
        return api.put(`/packaging-config/${editingRecord.id}`, values);
      }
      return api.post("/packaging-config", values);
    },
    onSuccess: () => {
      message.success(editingRecord ? "Rule updated" : "Rule created");
      queryClient.invalidateQueries({ queryKey: ["packaging-config"] });
      closeModal();
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Save failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/packaging-config/${id}`),
    onSuccess: () => {
      message.success("Rule deleted");
      queryClient.invalidateQueries({ queryKey: ["packaging-config"] });
    },
    onError: (err) => {
      message.error(err?.response?.data?.message || "Delete failed");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }) =>
      api.patch(`/packaging-config/${id}`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packaging-config"] });
    },
    onError: () => message.error("Failed to toggle status"),
  });

  // ---- modal helpers ----
  const openCreateModal = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      product_id: record.product_id,
      stage_id: record.stage_id,
      box_size: record.box_size,
      printer_id: record.printer_id,
      barcode_format: record.barcode_format,
      is_active: !!record.is_active,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    saveMutation.mutate(values);
  };

  // ---- table ----
  const filteredRules = useMemo(() => {
    if (!search) return rules;
    const q = search.toLowerCase();
    return rules.filter((r) =>
      [productMap[r.product_id], stageMap[r.stage_id], printerMap[r.printer_id], r.barcode_format]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [rules, search, productMap, stageMap, printerMap]);

  const columns = [
    {
      title: "Product",
      dataIndex: "product_id",
      render: (id) => productMap[id] || "-",
    },
    {
      title: "Stage",
      dataIndex: "stage_id",
      render: (id) => stageMap[id] || id,
    },
    {
      title: "Box Size",
      dataIndex: "box_size",
    },
    {
      title: "Printer",
      dataIndex: "printer_id",
      render: (id) => printerMap[id] || "-",
    },
    {
      title: "Barcode Format",
      dataIndex: "barcode_format",
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "Active",
      dataIndex: "is_active",
      render: (val, record) => (
        <Switch
          checked={!!val}
          onChange={(checked) =>
            toggleActiveMutation.mutate({ id: record.id, is_active: checked })
          }
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Popconfirm
            title="Delete this packaging rule?"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <MasterHeader title="Packaging Rules" subtitle="Configure box size, printer & barcode format per product stage" />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <MasterToolbar
            onSearch={setSearch}
            searchPlaceholder="Search product, stage, printer..."
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Add Packaging Rule
        </Button>
      </div>
      <MasterTable
        columns={columns}
        data={filteredRules}
        loading={isLoading}
        onView={openEditModal}
        onEdit={openEditModal}
        onDelete={deleteMutation.mutate}
        rowKey="id"
      />

      <MasterFormModal
        open={modalOpen}
        title={editingRecord ? "Edit Packaging Rule" : "Create Packaging Rule"}
        onCancel={closeModal}
        onSubmit={handleSubmit}
        confirmLoading={saveMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="product_id"
            label="Product"
            rules={[{ required: true, message: "Product is required" }]}
          >
            <Select
              placeholder="Select product"
              showSearch
              optionFilterProp="children"
              onChange={() => form.setFieldValue("stage_id", undefined)}
              options={products.map((p) => ({ label: p.name, value: p.id }))}
            />
          </Form.Item>

          <Form.Item
            name="stage_id"
            label="Packaging Stage"
            rules={[{ required: true, message: "Please select packaging stage" }]}
          >
            <Select placeholder="Select packaging stage">
              {stages.map((stage) => (
                <Select.Option
                  key={stage.stage_id}
                  value={stage.stage_id}
                >
                  {stage.stage_name || stage.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="box_size"
            label="Box Size"
            rules={[{ required: true, message: "Box size is required" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 24" />
          </Form.Item>

          <Form.Item
            name="printer_id"
            label="Printer"
            rules={[{ required: true, message: "Printer is required" }]}
          >
            <Select
              placeholder="Select printer"
              showSearch
              optionFilterProp="children"
              options={printers
                .filter((p) => p.is_active)
                .map((p) => ({ label: p.printer_name || p.name, value: p.id }))}
            />
          </Form.Item>

          <Form.Item
            name="barcode_format"
            label="Barcode Format"
            rules={[{ required: true, message: "Barcode format is required" }]}
          >
            <Select
              placeholder="Select format"
              options={BARCODE_FORMATS.map((f) => ({ label: f, value: f }))}
            />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </MasterFormModal>
    </div>
  );
}