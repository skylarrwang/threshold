import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { RightPanel } from './RightPanel';
import { BottomNav } from './BottomNav';

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop left panel */}
      <div className="hidden md:block fixed left-0 top-0 z-50">
        <RightPanel
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
        />
      </div>

      {/* Main content */}
      <main
        className={`pb-20 md:pb-0 min-h-screen transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'
        }`}
      >
        <Outlet />
      </main>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-on-surface/40 transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full shadow-xl animate-in slide-in-from-right duration-200">
            <RightPanel onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <BottomNav onOpenDrawer={() => setDrawerOpen(true)} />
    </div>
  );
}
