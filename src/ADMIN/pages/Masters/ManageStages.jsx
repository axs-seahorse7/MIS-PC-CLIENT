import { useState, useEffect } from "react";
import { Form, Input, Select, Switch, Row, Col, message } from "antd";

import MasterHeader from "../Masters/components/MasterHeader";
import MasterToolbar from "../Masters/components/MasterToolbar";
import MasterTable from "../Masters/components/MasterTable";
import StatusTag from "../Masters/components/StatusTag";
import DeleteModal from "../Masters/components/DeleteModal";
import MasterFormModal from "../Masters/components/MasterFormModal";

import api from "../../../services/API/api";

const { TextArea } = Input;

const formatCreatedDate = (dateInput) =>
  new Date(dateInput || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Server sends/expects { categoryId, factoryId, lineId, name, description, is_active(update only) }.
const normalizeStage = (item, categoryOptions = [], factoryOptions = [], lineOptions = []) => ({
  id: item._id || item.id,
  categoryId: item.category_id ?? item.categoryId,
  categoryName:
    item.category_name ||
    categoryOptions.find((c) => c.value === (item.category_id ?? item.categoryId))?.label ||
    "-",
  factoryId: item.factory_id ?? null,
  factoryName: item.factory_id
    ? item.factory_name || factoryOptions.find((f) => f.value === item.factory_id)?.label || "-"
    : "\u2014",
  lineId: item.line_id ?? null,
  lineName: item.line_id
    ? item.line_name || lineOptions.find((l) => l.value === item.line_id)?.label || "-"
    : "\u2014",
  stageName: item.name,
  stageDescription: item.description,
  status: item.status || (item.is_active === 0 ? "Inactive" : "Active"),
  createdDate: formatCreatedDate(item.created_at || item.createdAt || item.createdDate),
});

const ManageStages = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [factoryOptions, setFactoryOptions] = useState([]);
  const [allLines, setAllLines] = useState([]); // { value, label, factoryId }
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const factoryValue = Form.useWatch("factoryId", form);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setOptionsLoading(true);

      const [categoriesRes, factoriesRes, linesRes, stagesRes] = await Promise.all([
        api.get("/categories/all"),
        api.get("/factories/all"),
        api.get("/production-lines/all"),
        api.get("/stages/all"),
      ]);

      const categoryList = (categoriesRes.data?.categories || categoriesRes.data || []).map((cat) => ({
        value: cat._id || cat.id,
        label: cat.name,
      }));
      setCategoryOptions(categoryList);

      const factoryList = (factoriesRes.data?.data || factoriesRes.data || []).map((f) => ({
        value: f.id ?? f._id,
        label: f.name,
      }));
      setFactoryOptions(factoryList);

      const lineList = (linesRes.data?.data || linesRes.data || []).map((l) => ({
        value: l.id ?? l._id,
        label: l.name,
        factoryId: l.factory_id,
      }));
      setAllLines(lineList);

      const stageList = stagesRes.data?.data || stagesRes.data || [];
      setStages(stageList.map((item) => normalizeStage(item, categoryList, factoryList, lineList)));
    } catch (err) {
      console.log("ERROR IN FETCH BLOCK", err);
      message.error(err?.response?.data?.message || "Failed to load stages");
    } finally {
      setLoading(false);
      setOptionsLoading(false);
    }
  };

  const filteredData = stages.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch =
      item.categoryName.toLowerCase().includes(query) ||
      item.factoryName.toLowerCase().includes(query) ||
      item.lineName.toLowerCase().includes(query) ||
      item.stageName.toLowerCase().includes(query) ||
      (item.stageDescription || "").toLowerCase().includes(query);
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Lines scoped to selected factory
  const lineOptionsForForm = allLines.filter((l) => l.factoryId === factoryValue);

  const openAddModal = () => {
    setEditingRecord(null);
    form.resetFields();
    setFormOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      categoryId: record.categoryId,
      factoryId: record.factoryId || undefined,
      lineId: record.lineId || undefined,
      stageName: record.stageName,
      stageDescription: record.stageDescription,
      isActive: record.status !== "Inactive",
    });
    setFormOpen(true);
  };

  const handleFactoryChange = () => {
    form.setFieldsValue({ lineId: undefined });
  };

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // validation failed, stay in modal
    }

    const payload = {
      categoryId: values.categoryId,
      factoryId: values.factoryId,
      lineId: values.lineId,
      name: values.stageName,
      description: values.stageDescription,
      ...(editingRecord ? { is_active: values.isActive ? 1 : 0 } : {}),
    };

    try {
      setSaving(true);
      if (editingRecord) {
        await api.put(`/stages/update/${editingRecord.id}`, payload);
      } else {
        await api.post("/stages/create", payload);
      }

      // controllers only return id/message, not the joined row — refetch.
      await loadInitialData();
      message.success(editingRecord ? "Stage updated" : "Stage created");
      setFormOpen(false);
    } catch (err) {
      console.log("ERROR IN HANDLE SUBMIT", err);
      message.error(err?.response?.data?.message || "Failed to save stage");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/stages/delete/${deleteTarget.id}`);
      setStages((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      message.success("Stage deleted");
      setDeleteTarget(null);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete stage");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { title: "Stage Name", dataIndex: "stageName", key: "stageName" },
    { title: "Category", dataIndex: "categoryName", key: "categoryName" },
    { title: "Factory", dataIndex: "factoryName", key: "factoryName" },
    { title: "Line", dataIndex: "lineName", key: "lineName" },
    { title: "Description", dataIndex: "stageDescription", key: "stageDescription", ellipsis: true },
    { title: "Status", dataIndex: "status", key: "status", render: (v) => <StatusTag status={v} /> },
    { title: "Created Date", dataIndex: "createdDate", key: "createdDate" },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <MasterHeader
          title="Manage Stages"
          description="Manage manufacturing stages linked to factory, line and category"
          buttonLabel="Add Stage"
          onAddClick={openAddModal}
        />
      </div>

      <MasterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by category, factory, line, stage name or description..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
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
        title={editingRecord ? "Edit Stage" : "Add Stage"}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="factoryId"
                label="Factory"
                rules={[{ required: true, message: "Please select a factory" }]}
                style={{ marginBottom: 16 }}
              >
                <Select
                  placeholder="Select factory"
                  options={factoryOptions}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                  onChange={handleFactoryChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lineId"
                label="Line"
                rules={[{ required: true, message: "Please select a line" }]}
                style={{ marginBottom: 16 }}
              >
                <Select
                  placeholder={factoryValue ? "Select line" : "Select a factory first"}
                  options={lineOptionsForForm}
                  disabled={!factoryValue}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="categoryId"
                label="Category"
                rules={[{ required: true, message: "Please select a category" }]}
                style={{ marginBottom: 16 }}
              >
                <Select
                  placeholder="Select category"
                  options={categoryOptions}
                  loading={optionsLoading}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stageName"
                label="Stage Name"
                rules={[{ required: true, message: "Please enter stage name" }]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder="e.g. PCB Soldering" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="stageDescription" label="Stage Description" style={{ marginBottom: editingRecord ? 16 : 0 }}>
            <TextArea rows={2} placeholder="Short description of the stage" />
          </Form.Item>

          {editingRecord && (
            <Form.Item name="isActive" label="Active" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          )}
        </Form>
      </MasterFormModal>

      <DeleteModal
        open={!!deleteTarget}
        itemName={deleteTarget?.stageName}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ManageStages;