// src/User/layout/Content/Content.jsx
import React from "react";
import { Layout, Breadcrumb } from "antd";
import { Outlet, useLocation, Link } from "react-router-dom";

const { Content: AntContent } = Layout;

// Turns "/user/workspace/reports" into
// [ { title: "User" }, { title: "Workspace" }, { title: "Reports" } ]
function buildBreadcrumb(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  return parts.map((part, idx) => ({
    title: part.charAt(0).toUpperCase() + part.slice(1),
    path: "/" + parts.slice(0, idx + 1).join("/"),
  }));
}

export default function Content() {
  const location = useLocation();
  const crumbs = buildBreadcrumb(location.pathname);

  return (
    <AntContent
      style={{
        margin: "20px 24px",
        minHeight: "calc(100vh - 60px - 40px)",
      }}
    >
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={crumbs.map((c, i) => ({
          title:
            i === crumbs.length - 1 ? (
              <span style={{ color: "#1b2430" }}>{c.title}</span>
            ) : (
              <Link to={c.path} style={{ color: "#64748b" }}>
                {c.title}
              </Link>
            ),
        }))}
      />

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e3e8ef",
          borderRadius: 12,
          padding: 24,
          minHeight: 400,
        }}
      >
        {/* Nested /user/* route pages render here */}
        <Outlet />
      </div>
    </AntContent>
  );
}