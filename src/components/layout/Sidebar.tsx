import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardList, Layers, Printer, Settings as SettingsIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Clienti', icon: Users },
  { to: '/orders', label: 'Ordini', icon: ClipboardList },
  { to: '/filaments', label: 'Filamenti', icon: Layers },
  { to: '/printers', label: 'Stampanti', icon: Printer },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

const STORAGE_KEY = 'baso.sidebar.collapsed'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full shrink-0 flex-col border-r border-border bg-bg-1"
    >
      <div className="flex h-14 items-center border-b border-border px-3">
        <div className={`text-sm font-bold text-text-1 ${collapsed ? 'text-center w-full' : ''}`}>
          {collapsed ? 'B' : 'BASO'}
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-bg-2 text-text-1'
                  : 'text-text-2 hover:bg-bg-2 hover:text-text-1'
              }`
            }
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
                )}
                <Icon size={16} />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed((v) => !v)}
        className="m-2 rounded-md p-2 text-text-3 hover:bg-bg-2 hover:text-text-1"
        title={collapsed ? 'Espandi' : 'Comprimi'}
      >
        {collapsed ? '»' : '«'}
      </button>
    </motion.aside>
  )
}
