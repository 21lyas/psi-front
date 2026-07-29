import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function MainLayout() {
  return (
    <div className="flex h-screen" style={{ backgroundColor: '#0d1526' }}>
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
