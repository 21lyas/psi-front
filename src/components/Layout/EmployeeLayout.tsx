import { Outlet } from 'react-router-dom'
import { Building2 } from 'lucide-react'

export default function EmployeeLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">PSI Portal</p>
            <p className="text-xs text-gray-400 mt-0.5">Employee Time Confirmation</p>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
