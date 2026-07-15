import { useState, useEffect } from "react";
import { Form, Input, Select, Row, Col, Tag, Button, message } from "antd";

import MasterHeader from "../Masters/components/MasterHeader";
import MasterToolbar from "../Masters/components/MasterToolbar";
import MasterTable from "../Masters/components/MasterTable";
import StatusTag from "../Masters/components/StatusTag";
import DeleteModal from "../Masters/components/DeleteModal";
import MasterFormModal from "../Masters/components/MasterFormModal";

import api from "../../../services/API/api";

const ROLE_OPTIONS = [
  { value: "SYSTEM_ADMIN", label: "System Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "OPERATOR", label: "Operator" },
];

const ROLE_COLORS = {
  SYSTEM_ADMIN: "purple",
  ADMIN: "blue",
  OPERATOR: "green",
};

const formatCreatedDate = (dateInput) =>
  new Date(dateInput || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Server sends/expects { username, password, name, email, role, stage_id, is_active }.
// password is only sent on create — updates go through /change-password/:id separately.
const normalizeUser = (item, stageOptions = []) => ({
  id: item._id || item.id,
  username: item.username,
  name: item.name,
  email: item.email,
  role: item.role || "OPERATOR",
  stageId: item.stage_id ?? null,
  stageName: item.stage_id
    ? item.stageName || stageOptions.find((s) => s.value === item.stage_id)?.label || "-"
    : "\u2014",
  status: item.is_active === undefined || item.is_active === null || item.is_active ? "Active" : "Inactive",
  createdDate: formatCreatedDate(item.created_at || item.createdAt || item.createdDate),
});

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stageOptions, setStageOptions] = useState([]);
  const [stagesLoading, setStagesLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const roleValue = Form.useWatch("role", form);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [passwordTarget, setPasswordTarget] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setStagesLoading(true);

      const [stagesRes, usersRes] = await Promise.all([
        api.get("/stages/all"),
        api.get("/users/all"), // requires a valid auth token — see note above
      ]);

      const stageList = (stagesRes.data?.data || stagesRes.data || []).map((s) => ({
        value: s._id || s.id,
        label: s.name,
      }));
      setStageOptions(stageList);

      const userList = usersRes.data?.data || usersRes.data || [];
      setUsers(userList.map((u) => normalizeUser(u, stageList)));
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
      setStagesLoading(false);
    }
  };

  const filteredData = users.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch =
      item.username.toLowerCase().includes(query) || item.username.toUpperCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      (item.email || "").toLowerCase().includes(query) ||
      item.role.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAddModal = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ role: "OPERATOR", status: "Active" });
    setFormOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      username: record.username,
      name: record.name,
      email: record.email,
      role: record.role,
      stageId: record.stageId || undefined,
      status: record.status,
    });
    setFormOpen(true);
  };

  const handleRoleChange = (value) => {
    if (value !== "OPERATOR") {
      form.setFieldsValue({ stageId: undefined });
    }
  };

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return; // validation failed, stay in modal
    }

    const payload = {
      username: values.username,
      name: values.name,
      email: values.email,
      role: values.role,
      stage_id: values.role === "OPERATOR" ? values.stageId : null,
      is_active: values.status === "Active",
    };
    if (!editingRecord) {
      payload.password = values.password;
    }

    try {
      setSaving(true);
      const res = editingRecord
        ? await api.put(`/users/update/${editingRecord.id}`, payload)
        : await api.post("/users/create", payload);

      const saved = normalizeUser(res.data?.data || res.data, stageOptions);

      setUsers((prev) =>
        editingRecord
          ? prev.map((item) => (item.id === editingRecord.id ? saved : item))
          : [...prev, saved]
      );
      message.success(editingRecord ? "User updated" : "User created");
      setFormOpen(false);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/users/delete/${deleteTarget.id}`);
      setUsers((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      message.success("User deleted");
      setDeleteTarget(null);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  };

  const openPasswordModal = (record) => {
    setPasswordTarget(record);
    passwordForm.resetFields();
    setPasswordOpen(true);
  };

  const handlePasswordSubmit = async () => {
    let values;
    try {
      values = await passwordForm.validateFields();
    } catch {
      return;
    }

    try {
      setPasswordSaving(true);
      await api.put(`/users/change-password/${passwordTarget.id}`, {
        password: values.newPassword,
      });
      message.success("Password updated");
      setPasswordOpen(false);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  // No manual Serial No column — MasterTable already renders its own S.No column.
  const columns = [
    { title: "Username", dataIndex: "username", key: "username" },
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Email", dataIndex: "email", key: "email", ellipsis: true },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (v) => <Tag color={ROLE_COLORS[v] || "default"}>{v}</Tag>,
    },
    { title: "Stage", dataIndex: "stageName", key: "stageName" },
    { title: "Status", dataIndex: "status", key: "status", render: (v) => <StatusTag status={v} /> },
    { title: "Created Date", dataIndex: "createdDate", key: "createdDate" },
    {
      title: "Password",
      key: "password",
      render: (_, record) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => openPasswordModal(record)}>
          Change
        </Button>
      ),
    },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <MasterHeader
          title="Manage Users"
          description="Manage system users and their access roles"
          buttonLabel="Add User"
          onAddClick={openAddModal}
        />
      </div>

      <MasterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by username, name, email or role..."
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
        title={editingRecord ? "Edit User" : "Add User"}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: "Please enter username" }]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder="e.g. jdoe" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: "Please enter name" }]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder="e.g. John Doe" />
              </Form.Item>
            </Col>
          </Row>

          {!editingRecord && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please enter a password" },
                { min: 6, message: "Password must be at least 6 characters" },
              ]}
              style={{ marginBottom: 16 }}
            >
              <Input.Password placeholder="Enter password" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: "email", message: "Enter a valid email" }]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder="e.g. jdoe@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="role"
                label="Role"
                rules={[{ required: true, message: "Select role" }]}
                style={{ marginBottom: 16 }}
              >
                <Select placeholder="Select role" options={ROLE_OPTIONS} onChange={handleRoleChange} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {roleValue === "OPERATOR" && (
              <Col span={12}>
                <Form.Item
                  name="stageId"
                  label="Stage"
                  rules={[{ required: true, message: "Select stage" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    placeholder="Select stage"
                    options={stageOptions}
                    loading={stagesLoading}
                    showSearch
                    optionFilterProp="label"
                  />
                </Form.Item>
              </Col>
            )}
            <Col span={roleValue === "OPERATOR" ? 12 : 24}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: "Select status" }]}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Select status"
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </MasterFormModal>

      <MasterFormModal
        open={passwordOpen}
        title={passwordTarget ? `Change Password - ${passwordTarget.username}` : "Change Password"}
        onCancel={() => setPasswordOpen(false)}
        onSubmit={handlePasswordSubmit}
        confirmLoading={passwordSaving}
      >
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: "Please enter a new password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Please confirm the password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Re-enter new password" />
          </Form.Item>
        </Form>
      </MasterFormModal>

      <DeleteModal
        open={!!deleteTarget}
        itemName={deleteTarget?.username}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Users;
