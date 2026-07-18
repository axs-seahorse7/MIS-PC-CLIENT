import { useState, useEffect } from "react";
import { Form, Select, InputNumber, Switch, Row, Col, Tag, message } from "antd";

import MasterHeader from "../Masters/components/MasterHeader";
import MasterToolbar from "../Masters/components/MasterToolbar";
import MasterTable from "../Masters/components/MasterTable";
import DeleteModal from "../Masters/components/DeleteModal";
import MasterFormModal from "../Masters/components/MasterFormModal";

import api from "../../../services/API/api";

const SCAN_MODE_OPTIONS = [
  { value: "SINGLE", label: "Single" },
  { value: "GROUP_CREATE", label: "Group Create" },
  { value: "GROUP_SCAN", label: "Group Scan" },
];

const SCAN_MODE_COLOR = {
  SINGLE: "default",
  GROUP_CREATE: "purple",
  GROUP_SCAN: "geekblue",
};

const formatCreatedDate = (dateInput) =>
  new Date(dateInput || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Server sends/expects { product_id, stage_id, sequence_no, is_mandatory, scan_mode, group_required }.
// productOptions / stageOptions (fetched live) resolve id -> name for display.
const normalizeFlow = (item, productOptions = [], stageOptions = []) => ({
  id: item._id || item.id,
  productId: item.product_id,
  productName:
    item.productName || productOptions.find((p) => p.value === item.product_id)?.label || "-",
  stageId: item.stage_id,
  stageName: item.stageName || stageOptions.find((s) => s.value === item.stage_id)?.label || "-",
  sequenceNo: item.sequence_no,
  isMandatory: item.is_mandatory === undefined || item.is_mandatory === null ? true : !!item.is_mandatory,
  scanMode: item.scan_mode || "SINGLE",
  groupRequired: !!item.group_required,
  createdDate: formatCreatedDate(item.created_at || item.createdAt || item.createdDate),
});

const ProductStage = () => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [productOptions, setProductOptions] = useState([]);
  const [stageOptions, setStageOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const scanMode = Form.useWatch("scanMode", form);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setOptionsLoading(true);

      const [productsRes, stagesRes, flowsRes] = await Promise.all([
        api.get("/products/all"),
        api.get("/stages/all"),
        api.get("/product-stage-flow/all"),
      ]);

      // console.log("product-flow",  flowsRes.data);

      const productList = (productsRes.data?.data || productsRes.data || []).map((p) => ({
        value: p._id || p.id,
        label: p.name,
      }));
      const stageList = (stagesRes.data?.data || stagesRes.data || []).map((s) => ({
        value: s._id || s.id,
        label: s.name,
      }));
      setProductOptions(productList);
      setStageOptions(stageList);

      const flowList = flowsRes.data?.data || flowsRes.data || [];
      setFlows(flowList.map((item) => normalizeFlow(item, productList, stageList)));
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load product stage flow");
    } finally {
      setLoading(false);
      setOptionsLoading(false);
    }
  };

  const filteredData = flows.filter((item) => {
    const query = search.toLowerCase();
    return (
      item.productName.toLowerCase().includes(query) ||
      item.stageName.toLowerCase().includes(query) ||
      String(item.sequenceNo).includes(query)
    );
  });

  const openAddModal = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ isMandatory: true, scanMode: "SINGLE", groupRequired: false });
    setFormOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      productId: record.productId,
      stageId: record.stageId,
      sequenceNo: record.sequenceNo,
      isMandatory: record.isMandatory,
      scanMode: record.scanMode,
      groupRequired: record.groupRequired,
    });
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // validation failed, stay in modal
    }

    const payload = {
      product_id: values.productId,
      stage_id: values.stageId,
      sequence_no: values.sequenceNo,
      is_mandatory: values.isMandatory,
      scan_mode: values.scanMode,
      group_required: values.scanMode === "SINGLE" ? false : !!values.groupRequired,
    };


    try {
      setSaving(true);
      const res = editingRecord
        ? await api.put(`/product-stage-flow/update/${editingRecord.id}`, payload)
        : await api.post("/product-stage-flow/create", payload);

      const saved = normalizeFlow(res.data?.data || res.data, productOptions, stageOptions);

      setFlows((prev) =>
        editingRecord
          ? prev.map((item) => (item.id === editingRecord.id ? saved : item))
          : [...prev, saved]
      );
      message.success(editingRecord ? "Product stage updated" : "Product stage added");
      setFormOpen(false);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save product stage");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/product-stage-flow/delete/${deleteTarget.id}`);
      setFlows((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      message.success("Product stage removed");
      setDeleteTarget(null);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete product stage");
    } finally {
      setDeleting(false);
    }
  };

  // No manual Serial No column — MasterTable already renders its own S.No column.
  const columns = [
    { title: "Product", dataIndex: "productName", key: "productName" },
    { title: "Stage", dataIndex: "stageName", key: "stageName" },
    {
      title: "Sequence No",
      dataIndex: "sequenceNo",
      key: "sequenceNo",
      sorter: (a, b) => a.sequenceNo - b.sequenceNo,
    },
    {
      title: "Mandatory",
      dataIndex: "isMandatory",
      key: "isMandatory",
      render: (v) => <Tag color={v ? "blue" : "default"}>{v ? "Mandatory" : "Optional"}</Tag>,
    },
    {
      title: "Scan Mode",
      dataIndex: "scanMode",
      key: "scanMode",
      render: (v) => <Tag color={SCAN_MODE_COLOR[v] || "default"}>{v}</Tag>,
    },
    {
      title: "Group Required",
      dataIndex: "groupRequired",
      key: "groupRequired",
      render: (v) => <Tag color={v ? "orange" : "default"}>{v ? "Yes" : "No"}</Tag>,
    },
    { title: "Created Date", dataIndex: "createdDate", key: "createdDate" },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <MasterHeader
          title="Product Stage Flow"
          description="Define which stages belong to a product and in what sequence"
          buttonLabel="Add Product Stage"
          onAddClick={openAddModal}
        />
      </div>

      <MasterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by product, stage or sequence number..."
      />

      <MasterTable
        columns={columns}
        data={filteredData}
        loading={loading}
        onEdit={openEditModal}
        onDelete={setDeleteTarget}
      />

      <MasterFormModal
        open={formOpen}
        title={editingRecord ? "Edit Product Stage" : "Add Product Stage"}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="productId"
                label="Product"
                rules={[{ required: true, message: "Please select a product" }]}
                style={{ marginBottom: 16 }}
              >
                <Select
                  placeholder="Select product"
                  options={productOptions}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stageId"
                label="Stage"
                rules={[{ required: true, message: "Please select a stage" }]}
                style={{ marginBottom: 16 }}
              >
                <Select
                  placeholder="Select stage"
                  options={stageOptions}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sequenceNo"
                label="Sequence Number"
                rules={[{ required: true, message: "Please enter sequence number" }]}
                style={{ marginBottom: 16 }}
              >
                <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isMandatory"
                label="Mandatory"
                valuePropName="checked"
                initialValue={true}
                style={{ marginBottom: 16 }}
              >
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="scanMode"
                label="Scan Mode"
                rules={[{ required: true, message: "Please select scan mode" }]}
                initialValue="SINGLE"
                style={{ marginBottom: 0 }}
              >
                <Select options={SCAN_MODE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              {scanMode !== "SINGLE" && (
                <Form.Item
                  name="groupRequired"
                  label="Group Required"
                  valuePropName="checked"
                  initialValue={false}
                  style={{ marginBottom: 0 }}
                >
                  <Switch checkedChildren="Yes" unCheckedChildren="No" />
                </Form.Item>
              )}
            </Col>
          </Row>
        </Form>
      </MasterFormModal>

      <DeleteModal
        open={!!deleteTarget}
        itemName={deleteTarget ? `${deleteTarget.productName} → ${deleteTarget.stageName}` : ""}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ProductStage;