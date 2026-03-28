import { useNavigate } from 'react-router-dom';
import { InfoForm } from '@/components/infoCollection/InfoForm';

const steps = [
  {
    icon: 'fact_check',
    title: 'Set Your Goals',
    description: 'Identify your priorities for housing, work, and wellness.',
  },
  {
    icon: 'bolt',
    title: 'Grant AI Permissions',
    description: 'Enable our assistant to help organize your documents and notes.',
  },
  {
    icon: 'verified_user',
    title: 'Verify Your Identity',
    description: 'Securely confirm your profile to access premium resources.',
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body flex flex-col">
      {/* Teal gradient hero strip */}
      <div className="bg-gradient-to-br from-primary to-primary-container pt-16 pb-24 px-6 md:px-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 text-on-primary rounded-full text-xs font-bold tracking-widest uppercase mb-6">
          <span className="material-symbols-outlined text-[14px]">anchor</span>
          Your Journey Starts Here
        </div>
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-on-primary leading-tight tracking-tight mb-4">
          Your Path Forward
          <br />
          <span className="text-primary-fixed">Starts Here</span>
        </h1>
        <p className="text-lg text-on-primary/80 max-w-xl mx-auto leading-relaxed">
          Threshold is your digital companion for re-entry. We believe in second chances and we're
          here to guide you through every step with clarity, dignity, and support.
        </p>
      </div>

      {/* White content area */}
      <div className="flex-1 bg-surface -mt-8 rounded-t-3xl px-6 md:px-24 pt-12 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* 3-step bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {steps.map((step) => (
              <div
                key={step.title}
                className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_8px_32px_rgba(26,28,28,0.06)] border-b-2 border-transparent hover:border-primary transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">{step.icon}</span>
                </div>
                <h3 className="font-headline font-bold text-on-surface mb-2">{step.title}</h3>
                <p className="text-sm text-on-surface-variant">{step.description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-10 py-4 bg-primary text-on-primary font-headline font-bold rounded-xl shadow-[0_8px_32px_rgba(26,28,28,0.06)] hover:bg-primary-container hover:text-on-primary-container active:scale-95 transition-all duration-150 flex items-center justify-center gap-2"
            >
              Get Started
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>

            {/* Social proof */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-primary-fixed flex items-center justify-center text-[10px] font-bold text-on-primary-fixed">
                  JM
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-secondary-fixed flex items-center justify-center text-[10px] font-bold text-on-secondary-fixed">
                  TK
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-tertiary-fixed flex items-center justify-center text-[10px] font-bold text-on-tertiary-fixed">
                  +12
                </div>
              </div>
              <p className="text-sm text-on-surface-variant font-medium">
                2,400+ people have used Threshold to rebuild their lives
              </p>
            </div>
          </div>

          <div className="mb-10">
            <InfoForm />
          </div>

          {/* Support footer */}
          <div className="pt-8 border-t border-outline-variant/20">
            <div className="flex items-center gap-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary">psychology</span>
              <p className="text-sm">
                Need help?{' '}
                <a href="/chat" className="text-primary font-bold hover:underline">
                  Chat with our AI assistant
                </a>{' '}
                now. We're here to support you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
