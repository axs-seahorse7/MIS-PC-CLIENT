import { useState } from "react";
import { Form, Input, Select, InputNumber } from "antd";

import MasterHeader from "./components/MasterHeader";
import MasterToolbar from "./components/MasterToolbar";
import MasterTable from "./components/MasterTable";
import StatusTag from "./components/StatusTag";
import DeleteModal from "./components/DeleteModal";
import MasterFormModal from "./components/MasterFormModal";
import { stagesData as initialStages, lineTypeOptions } from "./data/masterData";

const ManageStages = () => {
  const [stages, setStages] = useState(initialStages);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const filteredData = stages.filter((item) => {
    const matchesSearch =
      item.stageName.toLowerCase().includes(search.toLowerCase()) ||
      item.stageCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAddModal = () => {
    setEditingRecord(null);
    form.resetFields();
    setFormOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      setTimeout(() => {
        if (editingRecord) {
          setStages((prev) => prev.map((item) => (item.id === editingRecord.id ? { ...item, ...values } : item)));
        } else {
          setStages((prev) => [...prev, { id: Date.now(), ...values }]);
        }
        setSaving(false);
        setFormOpen(false);
      }, 400);
    } catch {
      // validation failed
    }
  };

  const handleDelete = () => {
    setDeleting(true);
    setTimeout(() => {
      setStages((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleting(false);
      setDeleteTarget(null);
    }, 400);
  };

  const columns = [
    { title: "Stage Name", dataIndex: "stageName", key: "stageName" },
    { title: "Stage Code", dataIndex: "stageCode", key: "stageCode" },
    { title: "Line Type", dataIndex: "lineType", key: "lineType" },
    { title: "Sequence", dataIndex: "sequence", key: "sequence", sorter: (a, b) => a.sequence - b.sequence },
    { title: "Status", dataIndex: "status", key: "status", render: (v) => <StatusTag status={v} /> },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <MasterHeader
          title="Manage Stages"
          description="Manage manufacturing stages across SMT, AI and DIP lines"
          buttonLabel="Add Stage"
          onAddClick={openAddModal}
        />
      </div>

      <MasterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by stage name or code..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
      />

      <MasterTable columns={columns} data={filteredData} onEdit={openEditModal} onDelete={setDeleteTarget} />

      <MasterFormModal
        open={formOpen}
        title={editingRecord ? "Edit Stage" : "Add Stage"}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="stageName" label="Stage Name" rules={[{ required: true, message: "Please enter stage name" }]}>
            <Input placeholder="e.g. PCB Soldering" />
          </Form.Item>
          <Form.Item name="stageCode" label="Stage Code" rules={[{ required: true, message: "Please enter stage code" }]}>
            <Input placeholder="e.g. PCB-SLD" />
          </Form.Item>
          <div style={{ display: "flex", gap: 16 }}>
            <Form.Item name="lineType" label="Line Type" rules={[{ required: true, message: "Select line type" }]} style={{ flex: 1 }}>
              <Select placeholder="Select line type" options={lineTypeOptions.map((l) => ({ value: l, label: l }))} />
            </Form.Item>
            <Form.Item name="sequence" label="Sequence" rules={[{ required: true, message: "Enter sequence" }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 1" />
            </Form.Item>
          </div>
          <Form.Item name="status" label="Status" rules={[{ required: true, message: "Select status" }]}>
            <Select
              placeholder="Select status"
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "Draft", label: "Draft" },
              ]}
            />
          </Form.Item>
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