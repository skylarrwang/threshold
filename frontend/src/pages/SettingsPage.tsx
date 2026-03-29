import { useState } from 'react';
import { useProfileStore } from '@/store/profileStore';
import { Button } from '@/components/shared/Button';

interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

function Toggle({ enabled, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-primary' : 'bg-outline-variant'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      aria-pressed={enabled}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

interface ServiceItem {
  id: string;
  icon: string;
  iconClass: string;
  name: string;
  description: string;
  connected: boolean;
}

const SERVICES: ServiceItem[] = [
  { id: 'counselor', icon: 'people', iconClass: 'text-primary', name: 'Counselor Portal', description: 'Synced with Diana', connected: true },
  { id: 'jobboard', icon: 'work', iconClass: 'text-on-surface-variant', name: 'Job Board API', description: 'Connect to auto-apply', connected: false },
  { id: 'housing', icon: 'home_work', iconClass: 'text-on-surface-variant', name: 'Housing Authority', description: 'Check waitlists automatically', connected: false },
];

export function SettingsPage() {
  const { profile } = useProfileStore();

  const [name, setName] = useState(profile.personal.name);
  const [email, setEmail] = useState('Tyler.chen@example.com');
  const [phone, setPhone] = useState('(510) 555-0193');
  const [commStyle, setCommStyle] = useState<'direct' | 'gentle' | 'informational'>(profile.preferences.communication_style);

  const [twoFactor, setTwoFactor] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(true);

  const [reminders, setReminders] = useState(true);
  const [weeklyCheckIn, setWeeklyCheckIn] = useState(true);
  const [agentUpdates, setAgentUpdates] = useState(true);

  const [services, setServices] = useState(SERVICES);

  function toggleService(id: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, connected: !s.connected } : s))
    );
  }

  const inputClass =
    'w-full bg-surface-container-lowest border-0 border-b-2 border-outline-variant/40 focus:border-primary focus:ring-0 px-1 py-2 text-on-surface font-medium transition-colors text-sm outline-none';

  return (
    <div className="px-8 md:px-12 py-10 max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
          Settings &amp; Security
        </h1>
        <p className="text-on-surface-variant text-lg">
          Manage your personal information, security protocols, and platform preferences.
        </p>
      </header>

      <div className="space-y-8">
        {/* Account Profile */}
        <section className="bg-surface-container-lowest rounded-xl p-8">
          <h2 className="text-xl font-headline font-bold text-on-surface mb-6">Account Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-on-surface-variant px-1">Full Name</label>
              <input
                className={inputClass}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-on-surface-variant px-1">Email Address</label>
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-on-surface-variant px-1">Phone Number</label>
              <input
                className={inputClass}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-on-surface-variant px-1">Communication Style</label>
              <select
                className={`${inputClass} bg-surface-container-lowest`}
                value={commStyle}
                onChange={(e) => setCommStyle(e.target.value as typeof commStyle)}
              >
                <option value="direct">Direct</option>
                <option value="gentle">Gentle</option>
                <option value="informational">Informational</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end pt-6">
            <Button variant="primary" size="md">Save Changes</Button>
          </div>
        </section>

        {/* Security & Privacy */}
        <section className="bg-surface-container-lowest rounded-xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            <h2 className="text-xl font-headline font-bold text-on-surface">Security &amp; Privacy</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Vault Password */}
            <div className="bg-surface-container-low rounded-xl p-6">
              <h3 className="font-bold text-secondary flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-sm">lock</span>
                Vault Password
              </h3>
              <p className="text-sm text-on-surface-variant mb-5">
                Last changed 4 months ago. We recommend updating every 6 months.
              </p>
              <Button variant="secondary" size="md" className="w-full">
                Change Password
              </Button>
            </div>

            {/* Two-Factor Auth */}
            <div className="bg-surface-container-low rounded-xl p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  Two-Factor Auth
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${twoFactor ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  {twoFactor ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant mb-5">
                Added protection for your legal documents and private counselor notes.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-on-surface">{twoFactor ? 'Enabled' : 'Enable 2FA'}</span>
                <Toggle enabled={twoFactor} onChange={setTwoFactor} />
              </div>
            </div>
          </div>

          {/* Privacy Mode & Data Encryption */}
          <div className="space-y-4 pt-6 border-t border-outline-variant/10">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <div className="bg-tertiary-fixed text-on-tertiary-fixed p-3 rounded-xl">
                  <span className="material-symbols-outlined">visibility_off</span>
                </div>
                <div>
                  <p className="font-semibold text-on-surface">Privacy Mode</p>
                  <p className="text-xs text-on-surface-variant">High privacy — hides sensitive data when screen is shared</p>
                </div>
              </div>
              <Toggle enabled={privacyMode} onChange={setPrivacyMode} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <div className="bg-primary-fixed/30 text-primary p-3 rounded-xl">
                  <span className="material-symbols-outlined">encrypted</span>
                </div>
                <div>
                  <p className="font-semibold text-on-surface">Data Encryption</p>
                  <p className="text-xs text-on-surface-variant">All vault data is encrypted at rest</p>
                </div>
              </div>
              <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                AES-256 Active
              </span>
            </div>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="bg-surface-container-lowest rounded-xl p-8">
          <h2 className="text-xl font-headline font-bold text-on-surface mb-6">Notification Preferences</h2>
          <div className="space-y-1">
            {[
              { icon: 'alarm', label: 'Reminders', description: 'Deadline reminders and upcoming appointments', enabled: reminders, onChange: setReminders, locked: false },
              { icon: 'check_circle', label: 'Weekly Check-in', description: 'Receive your weekly progress summary', enabled: weeklyCheckIn, onChange: setWeeklyCheckIn, locked: false },
              { icon: 'psychology', label: 'AI Agent Updates', description: 'Get notified when an AI agent takes action', enabled: agentUpdates, onChange: setAgentUpdates, locked: false },
              { icon: 'emergency', label: 'Crisis Alerts', description: 'Critical safety notifications — always on', enabled: true, onChange: () => {}, locked: true },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-4 border-b last:border-b-0 border-outline-variant/10"
              >
                <div className="flex items-center gap-4">
                  <span className={`material-symbols-outlined ${item.locked ? 'text-primary' : 'text-on-surface-variant'}`}>{item.icon}</span>
                  <div>
                    <p className="font-semibold text-on-surface text-sm">
                      {item.label}
                      {item.locked && (
                        <span className="ml-2 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Required
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-on-surface-variant">{item.description}</p>
                  </div>
                </div>
                <Toggle enabled={item.enabled} onChange={item.onChange} disabled={item.locked} />
              </div>
            ))}
          </div>
        </section>

        {/* Connected Services */}
        <section className="bg-surface-container-lowest rounded-xl p-8">
          <h2 className="text-xl font-headline font-bold text-on-surface mb-6">Connected Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((svc) => (
              <div key={svc.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-container-lowest rounded-lg flex items-center justify-center">
                    <span className={`material-symbols-outlined ${svc.iconClass}`}>{svc.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-on-surface">{svc.name}</p>
                      {svc.connected && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-[10px] text-on-surface-variant">{svc.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleService(svc.id)}
                  className={`text-xs font-bold hover:underline ${svc.connected ? 'text-error' : 'text-primary'}`}
                >
                  {svc.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}

            <div className="md:col-span-2 border-2 border-dashed border-outline-variant/40 rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">add_link</span>
              <span className="text-sm font-semibold text-on-surface-variant">Connect a new external service</span>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pb-12">
          <div className="bg-error-container/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-error">warning</span>
              <div>
                <h3 className="font-bold text-error mb-1">Danger Zone</h3>
                <p className="text-sm text-on-surface-variant mb-5">
                  These actions are permanent and cannot be undone. Your vault data and documents will be removed.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" size="sm">
                    <span className="material-symbols-outlined text-sm">download</span>
                    Export My Data
                  </Button>
                  <button className="inline-flex items-center gap-2 text-error border border-error/30 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-error/5 transition-colors">
                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
