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

import UserProtected from './Authentication/ProtectedRoutes/UserProtected.jsx';
import MiInput from "./user/pages/MiInput.jsx"
import AdminProtected from "./Authentication/ProtectedRoutes/AdminProtected.jsx"
import ManageLines from "./admin/pages/Masters/ManageLines.jsx"
import ManageStages from "./admin/pages/Masters/ManageStages.jsx"
import QRMaster from "./admin/pages/Masters/ManageQRMaster.jsx"
import ManageModels from "./admin/pages/Masters/ManageModels.jsx"
import ManageCategories from "./admin/pages/Masters/ManageCategories";
import ManageProducts from "./admin/pages/Masters/ManageProducts";
import ProductStage from "./admin/pages/Tracking/ProductStage.jsx";
import ScanStage from "./admin/pages/Tracking/ScanStage.jsx";
import ManagepdFields from "./admin/pages/Masters/ManagePdFields.jsx"
import ManageItems from "./admin/pages/Masters/ManageItems.jsx"
import ManageItemFields from "./admin/pages/Masters/ManageItemFields.jsx"
import ScanHistory from "./admin/pages/Tracking/ScanHistory.jsx"


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
      
       <Route element={ <AdminProtected/> }>

        <Route path="/admin" element={ <AdminLayout /> }>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="production" element={<Production />} />
          <Route path="tracking" element={<Tracking />}>
           <Route path="product-stage" element={<ProductStage />} />
           <Route path="scan-stage" element={<ScanStage />} />
           <Route path="scan-history" element={<ScanHistory />} />
          </Route> 
           <Route path="users" element={<Users />} />
          

          <Route path="masters" element={<Masters />}>
            <Route path="lines" element={<ManageLines />} />
            <Route path="stages" element={<ManageStages />} />
            <Route path="models" element={<ManageModels />} />
            <Route path="qr-master" element={<QRMaster />} />
            <Route path="categories" element={<ManageCategories />} />
            <Route path="products" element={<ManageProducts />} />
            <Route path="pd-fields" element={<ManagepdFields/>} />
            <Route path="items" element={<ManageItems/>} />
            <Route path="item-fields" element={<ManageItemFields/>} />
            
          </Route>

          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
       </Route>

    </Routes>
  )
}

export default App