import { NavLink } from 'react-router-dom'
import {
  Users, LayoutDashboard, DollarSign, BarChart2,
  Building2, Briefcase, Percent, ChevronRight, FileText, Wrench, ClipboardCheck, HardHat,
} from 'lucide-react'

const sections = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
    ],
  },
  {
    label: 'Personnel',
    items: [
      { icon: Users, label: 'Employees', to: '/employees' },
    ],
  },
  {
    label: 'Structure',
    items: [
      { icon: Building2, label: 'Divisions', to: '/divisions' },
      { icon: Briefcase, label: 'Roles', to: '/roles' },
      { icon: Percent, label: 'Bonus Types', to: '/bonus-types' },
      { icon: DollarSign, label: 'Role Bonuses', to: '/role-bonus-configs' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { icon: BarChart2, label: 'Salaries', to: '/salaries' },
      { icon: FileText, label: 'Payroll', to: '/payroll' },
      { icon: Wrench, label: 'ST Pay Calc', to: '/st-payroll' },
      { icon: ClipboardCheck, label: 'Work Entries', to: '/work-entries' },
      { icon: HardHat, label: 'Technicians', to: '/technicians' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col" style={{ backgroundColor: '#0f1623' }}>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
          <Building2 size={16} className="text-white" />
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-none">PSI CRM</p>
          <p className="text-gray-500 text-xs mt-0.5">v2.0</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {sections.map(section => (
          <div key={section.label}>
            <p className="text-gray-600 text-xs font-medium px-4 mb-1.5 uppercase tracking-wider">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(({ icon: Icon, label, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon size={16} />
                  <span className="flex-1">{label}</span>
                  <ChevronRight size={12} className="opacity-40" />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-all">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Admin</p>
            <p className="text-gray-500 text-xs truncate">admin@psi.kz</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
