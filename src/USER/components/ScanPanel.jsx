import React from "react";
import { Card, Select, Input, Typography } from "antd";
import { ScanOutlined } from "@ant-design/icons";
import { SCAN_MODES } from "../constants/scanModes";
import GroupCreatePanel from "./GroupCreatePanel";
import CustomerBindingPanel from "./CustomerBindingPanel";

const { Text } = Typography;

function FieldLabel({ text }) {
  return (
    <Text style={{ display: "block", fontSize: 11.5, color: "#64748b", marginBottom: 4, letterSpacing: 0.2 }}>
      {text}
    </Text>
  );
}

export default function ScanPanel({
  form,
  isEditable,
  mode,
  products,
  productsLoading,
  selected,
  onSelectProduct,
  onWipCodeChange,
  onWipCodeScanned,
  wipCodeRef,
  stageFlow,
  // GROUP_CREATE
  pendingGroupScans,
  savingGroup,
  onSaveGroup,
  onRemovePendingScan,
  // CUSTOMER_BINDING
  pendingPcbQr,
  onCancelCustomerBinding,
}) {
  const scanMode = stageFlow?.scan_mode;

  return (
    <Card
      styles={{ body: { padding: 18, height: "100%", display: "flex", flexDirection: "column", gap: 16 } }}
      style={{ border: "1px solid #e3e8ef", borderRadius: 10, height: "100%" }}
    >
      <div>
        <FieldLabel text="Select product" />
        <Select
          style={{ width: "100%" }}
          placeholder="Search product..."
          value={form.productId}
          disabled={!isEditable}
          loading={productsLoading}
          showSearch
          allowClear
          optionFilterProp="label"
          filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
          options={products.map((p) => ({
            value: p.id,
            label: `${p.erp_no || "—"} — ${p.name}`,
          }))}
          onChange={onSelectProduct}
        />
      </div>

      <div>
        <FieldLabel text="WIP Bar Code" />
        <Input
          disabled={!form.productId || mode !== "view"}
          ref={wipCodeRef}
          placeholder={!form.productId ? "Select a product first" : "Scan QR / enter code"}
          value={form.wipBarCode}
          onChange={onWipCodeChange}
          onPressEnter={onWipCodeScanned}
          suffix={<ScanOutlined style={{ color: "#3a6d95" }} />}
        />
      </div>

      <div>
        <Text
          strong
          style={{
            display: "block",
            fontSize: 11,
            color: "#16a34a",
            letterSpacing: 0.3,
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Selected Product
        </Text>
        <div
          style={{
            border: "1px solid #cfe3d5",
            background: "#f2faf4",
            borderRadius: 8,
            padding: "10px 12px",
            minHeight: 20,
          }}
        >
          {selected ? (
            <Text style={{ fontSize: 13, fontWeight: 700, color: "#1b2430" }}>
              {selected.erp_no || "—"} — {selected.name || "—"}
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12.5 }}>
              No product selected yet
            </Text>
          )}
        </div>
      </div>

      {scanMode === SCAN_MODES.GROUP_CREATE && (
        <GroupCreatePanel
          pendingGroupScans={pendingGroupScans}
          savingGroup={savingGroup}
          onSaveGroup={onSaveGroup}
          onRemovePendingScan={onRemovePendingScan}
        />
      )}

      {scanMode === SCAN_MODES.CUSTOMER_BINDING && (
        <CustomerBindingPanel pendingPcbQr={pendingPcbQr} onCancel={onCancelCustomerBinding} />
      )}
    </Card>
  );
}
