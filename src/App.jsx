import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './Authentication/Login/LoginForm.jsx'
import UserLayout from './User/layout/UserLayout.jsx'


import AdminLayout from "./admin/layout/AdminLayout.jsx";

import Dashboard from "./ADMIN/pages/Dashboard/dashboard.jsx";
import Production from "./ADMIN/pages/Production/production.jsx";
import Tracking from "./ADMIN/pages/Tracking/tracking.jsx";
import Reports from "./ADMIN/pages/Reports/reports.jsx";
import Users from "./ADMIN/pages/Users/users.jsx";
import Masters from "./ADMIN/pages/Masters/masters.jsx";
import Settings from "./ADMIN/pages/Settings/settings.jsx";
import MiInput from "./User/pages/MiInput.jsx"
import AdminProtected from './Authentication/ProtectedRoutes/AdminProtected.jsx'
import UserProtected from './Authentication/ProtectedRoutes/UserProtected.jsx'

// Routes ke andar, UserLayout wale <Route> ke bahar/alag:

function App() {
  const [count, setCount] = useState(0)

  return (
    <Routes>
      <Route path="/" element={<div>This is a Landing page....</div>} />
      <Route path="/login" element={<Login />} />
      {/* <Route path="/user/mi-input" element={<MiInput />} /> */}

      {/* User workspace - "second floor" */}
      <Route path="/user" element={ <UserProtected> <UserLayout userName="Himanshu" onLogout={() => {}} /> </UserProtected> }>
        <Route path="dashboard" element={<MiInput/>} />
        <Route path="workspace" element={<div>Workspace page</div>} />
        <Route path="reports" element={<div>Reports page</div>} />
        <Route path="settings" element={<div>Settings page</div>} />
      </Route>
   
      {/* Admin workspace */}
      
       <Route path="/admin" element={ <AdminProtected> <AdminLayout /> </AdminProtected> }>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="production" element={<Production />} />
        <Route path="tracking" element={<Tracking />} />
        <Route path="users" element={<Users />} />
        <Route path="masters" element={<Masters />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

    </Routes>
  )
}

export default App