import React from "react";
import { Space, Tag, Typography } from "antd";
import { PlusOutlined, EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";

const { Title } = Typography;

// Header action button — pastel outline for secondary actions (New, Edit),
// solid fill for the primary/destructive actions (Save, Cancel). Matches the
// pill/badge look: light tint background, colored border, bold colored text.
function ActionButton({ icon, label, color, onClick, disabled, filled }) {
  const baseStyle = filled
    ? {
        background: color,
        border: `1.5px solid ${color}`,
        color: "#ffffff",
        boxShadow: `0 4px 12px ${color}40`,
      }
    : {
        background: `${color}14`,
        border: `1.5px solid ${color}45`,
        color,
        boxShadow: "none",
      };

  return (
    <button
      className="pg-action-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseStyle,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 36,
        padding: "0 16px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span style={{ fontSize: 13, display: "flex" }}>{icon}</span>
      {label}
    </button>
  );
}

const ORDER_STATUS_STYLE = {
  COMPLETED: { color: "green", backgroundColor: "#d1fae5" },
  RUNNING: { color: "blue", backgroundColor: "#dbeafe" },
};
const ORDER_STATUS_DEFAULT = { color: "orange", backgroundColor: "#fef3c7" };

export default function ActionBar({ selected, mode, onNew, onEdit, onSave, onCancel }) {
  const isEditable = mode === "new" || mode === "edit";
  const statusStyle = ORDER_STATUS_STYLE[selected?.production_order_status] || ORDER_STATUS_DEFAULT;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 56,
        flexShrink: 0,
        background: "#ffffff",
        borderBottom: "1px solid #e3e8ef",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
      }}
    >
      <Space size={8}>
        <Title level={5} style={{ margin: 0, color: "#1b2430" }}>
          Production Order:{" "}
          {selected?.production_order_no ? (
            <span style={{ color: "green" }}>{selected.production_order_no}</span>
          ) : (
            <span style={{ color: "orange" }}>Not Selected</span>
          )}
        </Title>
        {selected?.production_order_status && (
          <Tag
            level={5}
            variant="filled"
            style={{
              margin: 0,
              color: statusStyle.color,
              backgroundColor: statusStyle.backgroundColor,
              borderRadius: 6,
              fontWeight: 600,
              padding: "2px 10px",
            }}
          >
            {selected.production_order_status}
          </Tag>
        )}
      </Space>

      <Space size={10}>
        <ActionButton icon={<PlusOutlined />} label="New" color="#2563eb" onClick={onNew} disabled={isEditable} />
        <ActionButton icon={<EditOutlined />} label="Edit" color="#c9820a" onClick={onEdit} disabled={isEditable} />
        <ActionButton icon={<SaveOutlined />} label="Save" color="#16a34a" filled onClick={onSave} disabled={!isEditable} />
        <ActionButton icon={<CloseOutlined />} label="Cancel" color="#dc2626" filled onClick={onCancel} disabled={!isEditable} />
      </Space>
    </div>
  );
}
