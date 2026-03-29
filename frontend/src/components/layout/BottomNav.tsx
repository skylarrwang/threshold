import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const leftItems = [
  { path: '/dashboard', icon: 'dashboard', label: 'Home' },
  { path: '/documents', icon: 'folder_open', label: 'Docs' },
];

const rightItems = [
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

export function BottomNav({ onOpenDrawer }: { onOpenDrawer?: () => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest/90 backdrop-blur-md border-t border-outline-variant/20 z-50 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {leftItems.map((item) => (
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

        {/* Center elevated AI button */}
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 -mt-5 transition-all duration-200',
              isActive ? 'scale-105' : ''
            )
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all',
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'bg-primary-container text-on-primary-container'
                )}
              >
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}
                >
                  support_agent
                </span>
              </div>
              <span className={cn('text-[10px] font-bold', isActive ? 'text-primary' : 'text-on-surface-variant')}>
                AI
              </span>
            </>
          )}
        </NavLink>

        {rightItems.map((item) => (
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

        {/* Drawer toggle */}
        <button
          onClick={onOpenDrawer}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
