import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProfileStore } from '@/store/profileStore';

const navItems = [
  { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/chat', icon: 'chat', label: 'Messages' },
  { path: '/employment', icon: 'work', label: 'Employment' },
  { path: '/housing', icon: 'home', label: 'Housing' },
  { path: '/benefits', icon: 'payments', label: 'Benefits' },
  { path: '/documents', icon: 'folder_open', label: 'Documents' },
  { path: '/ai-applications', icon: 'smart_toy', label: 'AI Apps', demo: true },
  { path: '/resources', icon: 'people', label: 'Resources', demo: true },
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

export function SideNav() {
  const { profile } = useProfileStore();
  const navigate = useNavigate();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-surface-container-low flex flex-col py-8 z-50 no-scrollbar">
      <div className="px-6 mb-8">
        <h1 className="text-xl font-headline font-bold text-on-surface mb-0.5">Threshold</h1>
        <p className="text-xs font-medium text-on-surface-variant tracking-wider">The Guided Path</p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-label text-sm',
                isActive
                  ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/60'
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
                <span className="flex-1">{item.label}</span>
                {'demo' in item && item.demo && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full leading-none">
                    Demo
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 mt-6">
        <button
          onClick={() => navigate('/chat')}
          className="w-full bg-primary text-on-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-all text-sm"
        >
          <span className="material-symbols-outlined text-sm">support_agent</span>
          <span>Talk to AI</span>
        </button>

        <div className="mt-6 flex items-center gap-3 pt-4 border-t border-outline-variant/20">
          <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-sm font-bold text-on-primary-fixed">
            MC
          </div>
          <div>
            <div className="text-sm font-bold text-on-surface">{profile.personal.name}</div>
            <div className="text-[10px] uppercase text-on-surface-variant tracking-widest">Member</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
