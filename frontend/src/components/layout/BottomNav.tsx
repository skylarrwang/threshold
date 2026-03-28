import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const bottomNavItems = [
  { path: '/dashboard', icon: 'dashboard', label: 'Home' },
  { path: '/chat', icon: 'chat', label: 'Chat' },
  { path: '/employment', icon: 'work', label: 'Jobs' },
  { path: '/documents', icon: 'folder_open', label: 'Docs' },
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest/90 backdrop-blur-md border-t border-outline-variant/20 z-50 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]',
                isActive ? 'text-primary' : 'text-on-surface-variant'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-xl"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" : undefined }}
                >
                  {item.icon}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
