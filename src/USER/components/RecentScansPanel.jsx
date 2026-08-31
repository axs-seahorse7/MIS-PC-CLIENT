import React from "react";
import { Card, Typography } from "antd";
import formatScanTime from "../../helpers/formatScanTime.js"; // adjust path if your folder depth differs

const { Text } = Typography;

export default function RecentScansPanel({ recentScans }) {
  return (
    <Card
      styles={{ body: { padding: 18, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 } }}
      style={{ border: "1px solid #e3e8ef", borderRadius: 10, height: "100%" }}
    >
      <Text
        strong
        style={{
          display: "block",
          fontSize: 11,
          color: "#3a6d95",
          letterSpacing: 0.3,
          textTransform: "uppercase",
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        Recent Scanned ({recentScans.length} latest)
      </Text>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {recentScans?.length === 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            No scans recorded yet.
          </Text>
        )}
        {recentScans?.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid #e3e8ef",
              borderRadius: 8,
              padding: "8px 12px",
              background: "#fafbfc",
              animation: "recentScanIn 0.2s ease-out",
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: 600, color: "#1b2430" }}>{s?.scanned_value ?? ""}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {s?.scanned_at ? formatScanTime(s.scanned_at) : ""}
            </Text>
          </div>
        ))}
      </div>
    </Card>
  );
}
