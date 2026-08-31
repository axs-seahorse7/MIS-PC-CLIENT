import React from "react";
import { Button, Space, Tag } from "antd";

// Local-only staging list for scan_mode === "GROUP_CREATE" — scans pile up
// here and only hit the server once "Save Group" is pressed.
export default function GroupCreatePanel({ pendingGroupScans, savingGroup, onSaveGroup, onRemovePendingScan }) {
  return (
    <div
      style={{
        padding: 12,
        border: "1px solid #e3e8ef",
        borderRadius: 8,
        background: "#fafbfc",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: pendingGroupScans.length ? 10 : 0,
        }}
      >
        <Tag color="orange">{pendingGroupScans.length} scanned, pending group save</Tag>
        <Button
          type="primary"
          size="small"
          disabled={!pendingGroupScans.length}
          loading={savingGroup}
          onClick={onSaveGroup}
        >
          Save Group
        </Button>
      </div>

      {pendingGroupScans.length > 0 && (
        <Space size={[6, 6]} wrap>
          {pendingGroupScans.map((s) => (
            <Tag
              key={s.tempId}
              closable
              onClose={(e) => {
                e.preventDefault();
                onRemovePendingScan(s.tempId);
              }}
            >
              {s.code}
            </Tag>
          ))}
        </Space>
      )}
    </div>
  );
}
