import { useState, useEffect } from "react";
import { Form, Select, InputNumber, Switch, Input, Row, Col, Tag, Alert, message } from "antd";

import MasterHeader from "../Masters/components/MasterHeader";
import MasterToolbar from "../Masters/components/MasterToolbar";
import MasterTable from "../Masters/components/MasterTable";
import DeleteModal from "../Masters/components/DeleteModal";
import MasterFormModal from "../Masters/components/MasterFormModal";

import api from "../../../services/API/api";

const { TextArea } = Input;

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

const EXTERNAL_SOURCE_TYPE_OPTIONS = [
  { value: "LOCAL_FILE", label: "Local File System" },
  { value: "API", label: "External API (Coming Soon)" },
];

const FILE_EXTENSION_OPTIONS = [
  { value: ".csv", label: ".csv" },
  { value: ".xlsx", label: ".xlsx" },
  { value: ".xls", label: ".xls" },
  { value: ".pdf", label: ".pdf" },
  { value: ".txt", label: ".txt" },
  { value: ".json", label: ".json" },
];

const formatCreatedDate = (dateInput) =>
  new Date(dateInput || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// external_api_config may already come back parsed as an object (mysql2
// parses JSON columns automatically) or, depending on driver config, as a
// raw string — handle both without throwing.
const parseApiConfig = (raw) => {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// Server sends/expects { product_id, stage_id, sequence_no, scan_mode,
// is_external_dependency, external_source, external_source_type,
// external_folder_path, external_poll_interval_minutes, external_api_config }.
// productOptions / stageOptions (fetched live) resolve id -> name for display.
const normalizeFlow = (item, productOptions = [], stageOptions = []) => {
  const apiConfig = parseApiConfig(item.external_api_config);
  return {
    id: item._id || item.id,
    productId: item.product_id,
    productName:
      item.productName || productOptions.find((p) => p.value === item.product_id)?.label || "-",
    stageId: item.stage_id,
    stageName: item.stageName || stageOptions.find((s) => s.value === item.stage_id)?.label || "-",
    sequenceNo: item.sequence_no,
    scanMode: item.scan_mode || "SINGLE",
    isExternalDependency: !!item.is_external_dependency,
    externalSource: item.external_source || "",
    externalSourceType: item.external_source_type || null,
    externalFolderPath: item.external_folder_path || "",
    externalPollIntervalMinutes: item.external_poll_interval_minutes ?? null,
    externalFileExtensions: item.external_file_extensions
      ? String(item.external_file_extensions).split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    apiEndpoint: apiConfig?.endpoint || "",
    apiPayloadSample: apiConfig?.payloadSample || "",
    apiResultField: apiConfig?.resultField || "",
    createdDate: formatCreatedDate(item.created_at || item.createdAt || item.createdDate),
  };
};

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
  const isExternalDependency = Form.useWatch("isExternalDependency", form);
  const externalSourceType = Form.useWatch("externalSourceType", form);

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
    form.setFieldsValue({
      scanMode: "SINGLE",
      isExternalDependency: false,
      externalSource: undefined,
      externalSourceType: undefined,
      externalFolderPath: undefined,
      externalPollIntervalMinutes: undefined,
      externalFileExtensions: undefined,
      apiEndpoint: undefined,
      apiPayloadSample: undefined,
      apiResultField: undefined,
    });
    setFormOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      productId: record.productId,
      stageId: record.stageId,
      sequenceNo: record.sequenceNo,
      scanMode: record.scanMode,
      isExternalDependency: record.isExternalDependency,
      externalSource: record.externalSource,
      externalSourceType: record.externalSourceType,
      externalFolderPath: record.externalFolderPath,
      externalPollIntervalMinutes: record.externalPollIntervalMinutes,
      externalFileExtensions: record.externalFileExtensions,
      apiEndpoint: record.apiEndpoint,
      apiPayloadSample: record.apiPayloadSample,
      apiResultField: record.apiResultField,
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

    const isExternal = !!values.isExternalDependency;
    const isLocalFile = isExternal && values.externalSourceType === "LOCAL_FILE";
    const isApi = isExternal && values.externalSourceType === "API";

    const payload = {
      product_id: values.productId,
      stage_id: values.stageId,
      sequence_no: values.sequenceNo,
      scan_mode: values.scanMode,
      is_external_dependency: isExternal,
      external_source: isExternal ? values.externalSource : null,
      external_source_type: isExternal ? values.externalSourceType : null,
      external_folder_path: isLocalFile ? values.externalFolderPath : null,
      external_poll_interval_minutes: isLocalFile ? values.externalPollIntervalMinutes : null,
      external_file_extensions:
        isLocalFile && Array.isArray(values.externalFileExtensions) && values.externalFileExtensions.length
          ? values.externalFileExtensions.join(",")
          : null,
      external_api_config: isApi
        ? JSON.stringify({
            endpoint: values.apiEndpoint || null,
            payloadSample: values.apiPayloadSample || null,
            resultField: values.apiResultField || null,
          })
        : null,
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
      title: "Scan Mode",
      dataIndex: "scanMode",
      key: "scanMode",
      render: (v) => <Tag color={SCAN_MODE_COLOR[v] || "default"}>{v}</Tag>,
    },
    {
      title: "External Dependency",
      dataIndex: "isExternalDependency",
      key: "isExternalDependency",
      render: (v, record) => {
        if (!v) return <Tag color="default">No</Tag>;
        return (
          <Tag color="volcano">
            {record.externalSource || "Yes"}
            {record.externalSourceType ? ` (${record.externalSourceType === "LOCAL_FILE" ? "Local File" : "API"})` : ""}
          </Tag>
        );
      },
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
                name="scanMode"
                label="Scan Mode"
                rules={[{ required: true, message: "Please select scan mode" }]}
                initialValue="SINGLE"
                style={{ marginBottom: 16 }}
              >
                <Select options={SCAN_MODE_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isExternalDependency"
                label="External Dependency"
                valuePropName="checked"
                initialValue={false}
                style={{ marginBottom: isExternalDependency ? 16 : 0 }}
              >
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col span={12}>
              {isExternalDependency && (
                <Form.Item
                  name="externalSource"
                  label="External Source Name"
                  rules={[{ required: true, message: "Please enter the external source name" }]}
                  style={{ marginBottom: 16 }}
                >
                  <Input placeholder="e.g. Vendor QC System" />
                </Form.Item>
              )}
            </Col>
          </Row>

          {isExternalDependency && (
            <>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="externalSourceType"
                    label="External Source Type"
                    rules={[{ required: true, message: "Please select a source type" }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Select placeholder="How should the result be fetched?" options={EXTERNAL_SOURCE_TYPE_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>

              {externalSourceType === "LOCAL_FILE" && (
                <>
                  <Row gutter={16}>
                    <Col span={16}>
                      <Form.Item
                        name="externalFolderPath"
                        label="Folder Path to Read"
                        rules={[{ required: true, message: "Please enter the folder path" }]}
                        style={{ marginBottom: 16 }}
                      >
                        <Input placeholder="e.g. \\\\SERVER\\shared\\aoi-results or /mnt/data/aoi-results" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="externalPollIntervalMinutes"
                        label="Read Interval"
                        rules={[{ required: true, message: "Please enter an interval" }]}
                        style={{ marginBottom: 16 }}
                      >
                        <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 5" addonAfter="min" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item
                        name="externalFileExtensions"
                        label="File Extensions to Read"
                        rules={[{ required: true, message: "Please select at least one file extension" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          mode="tags"
                          placeholder="Select or type extensions, e.g. .csv"
                          options={FILE_EXTENSION_OPTIONS}
                          tokenSeparators={[","]}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}

              {externalSourceType === "API" && (
                <>
                  <Alert
                    type="info"
                    showIcon
                    message="API integration is coming in a future release."
                    description="You can fill in the intended configuration below now — it will be saved, but nothing will call this API yet."
                    style={{ marginBottom: 16 }}
                  />
                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item name="apiEndpoint" label="API Endpoint" style={{ marginBottom: 16 }}>
                        <Input placeholder="e.g. https://vendor-system.local/api/results" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={16}>
                      <Form.Item name="apiPayloadSample" label="Expected Response Payload (sample)" style={{ marginBottom: 0 }}>
                        <TextArea rows={3} placeholder='e.g. { "status": "PASS", "itemCode": "TH26FG..." }' />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="apiResultField" label="Result Field to Read" style={{ marginBottom: 0 }}>
                        <Input placeholder="e.g. status" />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
              )}
            </>
          )}
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