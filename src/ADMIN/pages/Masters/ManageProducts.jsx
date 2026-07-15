import { useState, useEffect } from "react";
import { Form, Input, Select, Row, Col, message } from "antd";

import MasterHeader from "./components/MasterHeader";
import MasterToolbar from "./components/MasterToolbar";
import MasterTable from "./components/MasterTable";
import StatusTag from "./components/StatusTag";
import DeleteModal from "./components/DeleteModal";
import MasterFormModal from "./components/MasterFormModal";

import api from "../../../services/API/api";

const { TextArea } = Input;

const formatCreatedDate = (dateInput) =>
  new Date(dateInput || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Server sends/expects { category_id, name, description, remarks }.
// UI/form uses productName / productDescription for readability;
// categoryOptions (fetched live) is used to resolve categoryId -> categoryName for display.
const normalizeProduct = (item, categoryOptions = []) => ({
  id: item._id || item.id,
  categoryId: item.category_id,
  categoryName:
    item.categoryName ||
    categoryOptions.find((c) => c.value === item.category_id)?.label ||
    "-",
  productName: item.name,
  productDescription: item.description,
  remarks: item.remarks,
  status: item.status || (item.is_active === 0 ? "Inactive" : "Active"),
  createdDate: formatCreatedDate(item.created_at || item.createdAt || item.createdDate),
});

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setCategoriesLoading(true);

      const [categoriesRes, productsRes] = await Promise.all([
        api.get("/categories/all"),
        api.get("/products/all"),
      ]);


      const categoryList = (categoriesRes.data?.categories || categoriesRes.data || []).map((cat) => ({
        value: cat._id || cat.id,
        label: cat.name,
      }));
      setCategoryOptions(categoryList);

      const productList = productsRes?.data?.data|| productsRes?.data || [];
      setProducts(productList.map((item) => normalizeProduct(item, categoryList)));
    } catch (err) {
        console.log("err in product:", err)
      message.error(err?.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
      setCategoriesLoading(false);
    }
  };

  const filteredData = products.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch =
      item.categoryName.toLowerCase().includes(query) ||
      item.productName.toLowerCase().includes(query) ||
      (item.productDescription || "").toLowerCase().includes(query);
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAddModal = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ status: "Active" });
    setFormOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
      categoryId: record.categoryId,
      productName: record.productName,
      productDescription: record.productDescription,
      remarks: record.remarks,
      status: record.status,
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
      categoryId: values.categoryId,
      name: values.productName,
      description: values.productDescription,
      remarks: values.remarks,
      status: values.status,
    };

    try {
      setSaving(true);
      const res = editingRecord
        ? await api.put(`/products/update/${editingRecord.id}`, payload)
        : await api.post("/products/create", payload);

      const saved = normalizeProduct(res.data?.data || res.data, categoryOptions);

      setProducts((prev) =>
        editingRecord
          ? prev.map((item) => (item.id === editingRecord.id ? saved : item))
          : [...prev, saved]
      );
      message.success(editingRecord ? "Product updated" : "Product created");
      setFormOpen(false);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/product/delete/${deleteTarget.id}`);
      setProducts((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      message.success("Product deleted");
      setDeleteTarget(null);
    } catch (err) {
      message.error(err?.response?.data?.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  // Note: no manual Serial No column here — MasterTable already renders its own S.No column.
  const columns = [
    { title: "Category", dataIndex: "categoryName", key: "categoryName" },
    { title: "Product Name", dataIndex: "productName", key: "productName" },
    { title: "Description", dataIndex: "productDescription", key: "productDescription", ellipsis: true },
    { title: "Remarks", dataIndex: "remarks", key: "remarks", ellipsis: true },
    { title: "Status", dataIndex: "status", key: "status", render: (v) => <StatusTag status={v} /> },
    { title: "Created Date", dataIndex: "createdDate", key: "createdDate" },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <MasterHeader
          title="Manage Products"
          description="Manage products used across masters"
          buttonLabel="Add Product"
          onAddClick={openAddModal}
        />
      </div>

      <MasterToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by category, product name or description..."
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
        title={editingRecord ? "Edit Product" : "Add Product"}
        onCancel={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
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
                  loading={categoriesLoading}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="productName"
                label="Product Name"
                rules={[{ required: true, message: "Please enter product name" }]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder="e.g. Outdoor PCB" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="productDescription" label="Product Description" style={{ marginBottom: 16 }}>
            <TextArea rows={2} placeholder="Short description of the product" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="remarks" label="Remarks" style={{ marginBottom: 0 }}>
                <TextArea rows={2} placeholder="Optional remarks" />
              </Form.Item>
            </Col>
            <Col span={12}>
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

      <DeleteModal
        open={!!deleteTarget}
        itemName={deleteTarget?.productName}
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default ManageProducts;