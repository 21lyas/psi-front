import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import EmployeeLayout from './components/Layout/EmployeeLayout'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import EmployeeDetailPage from './pages/EmployeeDetailPage'
import DivisionsPage from './pages/DivisionsPage'
import RolesPage from './pages/RolesPage'
import BonusTypesPage from './pages/BonusTypesPage'
import RoleBonusConfigsPage from './pages/RoleBonusConfigsPage'
import SalariesPage from './pages/SalariesPage'
import PayrollPage from './pages/PayrollPage'
import StPayrollPage from './pages/StPayrollPage'
import AdminWorkEntriesPage from './pages/AdminWorkEntriesPage'
import StTechniciansPage from './pages/StTechniciansPage'
import TechnicianDetailPage from './pages/TechnicianDetailPage'
import EmployeePortalPage from './pages/EmployeePortalPage'

export default function App() {
  return (
    <Routes>
      {/* Admin / main interface */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/:id" element={<EmployeeDetailPage />} />
        <Route path="divisions" element={<DivisionsPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="bonus-types" element={<BonusTypesPage />} />
        <Route path="role-bonus-configs" element={<RoleBonusConfigsPage />} />
        <Route path="salaries" element={<SalariesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="st-payroll" element={<StPayrollPage />} />
        <Route path="work-entries" element={<AdminWorkEntriesPage />} />
        <Route path="technicians" element={<StTechniciansPage />} />
        <Route path="technicians/:techId" element={<TechnicianDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* Employee portal — separate mobile-first layout, no sidebar */}
      <Route path="/employee" element={<EmployeeLayout />}>
        <Route path=":techId" element={<EmployeePortalPage />} />
      </Route>
    </Routes>
  )
}
