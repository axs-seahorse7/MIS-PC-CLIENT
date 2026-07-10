import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "../ADMIN/layout/AdminLayout";

import Dashboard from "../ADMIN/pages/Dashboard";
import Production from "../ADMIN/pages/Production";
import Tracking from "../ADMIN/pages/Tracking";
import Reports from "../ADMIN/pages/Reports";
import Users from "../ADMIN/pages/Users";
import Masters from "../ADMIN/pages/Masters";
import Settings from "../ADMIN/pages/Settings";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ADMIN/dashboard" replace />} />

      <Route path="/ADMIN" element={<AdminLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="production" element={<Production />} />
        <Route path="tracking" element={<Tracking />} />
        <Route path="users" element={<Users />} />
        <Route path="masters" element={<Masters />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;