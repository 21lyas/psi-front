import { Bell, Search } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-100">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <Search size={16} className="text-gray-500" />
        </button>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <Bell size={16} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
          A
        </div>
      </div>
    </header>
  )
}
