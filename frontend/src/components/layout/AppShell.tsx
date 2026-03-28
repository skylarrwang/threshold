import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SideNav />
      </div>

      {/* Main content */}
      <main className="md:ml-64 pb-20 md:pb-0 min-h-screen">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
