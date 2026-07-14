import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './Authentication/Login/LoginForm.jsx'
import UserLayout from './User/layout/UserLayout.jsx'


import AdminLayout from "./admin/layout/AdminLayout.jsx";

import Dashboard from "./admin/pages/Dashboard/dashboard.jsx";
import Production from "./admin/pages/Production/production.jsx";
import Tracking from "./admin/pages/Tracking/tracking.jsx";
import Reports from "./admin/pages/Reports/reports.jsx";
import Users from "./admin/pages/Users/users.jsx";
import Masters from "./admin/pages/Masters/masters.jsx";
import ManageLines from "./admin/pages/Masters/ManageLines.jsx";
import ManageStages from "./admin/pages/Masters/ManageStages.jsx";
import ManageModels from "./admin/pages/Masters/ManageModels.jsx";
import QRMaster from "./admin/pages/Masters/ManageQRMaster.jsx";
import Settings from "./admin/pages/Settings/settings.jsx";

function App() {
  const [count, setCount] = useState(0)

  return (
    <Routes>
      <Route path="/" element={<div>This is a Landing page....</div>} />
      <Route path="/login" element={<Login />} />

      {/* User workspace - "second floor" */}
      <Route path="/user" element={<UserLayout userName="Himanshu" onLogout={() => {}} />}>
        <Route path="dashboard" element={<div>Dashboard page</div>} />
        <Route path="workspace" element={<div>Workspace page</div>} />
        <Route path="reports" element={<div>Reports page</div>} />
        <Route path="settings" element={<div>Settings page</div>} />
      </Route>
   
      {/* Admin workspace */}
      
       <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="production" element={<Production />} />
        <Route path="tracking" element={<Tracking />} />
        <Route path="users" element={<Users />} />
        <Route path="masters" element={<Masters />}>
          <Route path="lines" element={<ManageLines />} />
          <Route path="stages" element={<ManageStages />} />
          <Route path="models" element={<ManageModels />} />
          <Route path="qr-master" element={<QRMaster />} />
        </Route>
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

    </Routes>
  )
}

export default App