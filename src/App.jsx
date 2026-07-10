import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './Authentication/Login/LoginForm.jsx'
import UserLayout from './User/layout/UserLayout.jsx'

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
    </Routes>
  )
}

export default App