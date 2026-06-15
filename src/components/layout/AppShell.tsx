import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPaletteProvider, useCommandPalette } from '@/components/command-palette'

function PaletteTrigger() {
  const { openPalette } = useCommandPalette()
  return <TopBar onOpenPalette={openPalette} />
}

export function AppShell() {
  return (
    <CommandPaletteProvider>
      <div className="flex h-full bg-bg-0">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <PaletteTrigger />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </CommandPaletteProvider>
  )
}
