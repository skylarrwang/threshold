import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '@/store/profileStore';
import { StickyNote } from '@/components/shared/StickyNote';
import { Button } from '@/components/shared/Button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { StatusDot } from '@/components/shared/StatusDot';

const RESOURCE_CATEGORIES = [
  {
    icon: 'gavel',
    title: 'Legal Aid',
    description: 'Free legal consultations, expungement guides, and rights documentation for re-entry.',
  },
  {
    icon: 'home',
    title: 'Housing Guides',
    description: 'Find affordable housing resources, transitional options, and rental assistance programs.',
  },
  {
    icon: 'school',
    title: 'Skill Development',
    description: 'Vocational training, certification programs, and interview preparation workshops.',
  },
  {
    icon: 'groups',
    title: 'Community Support',
    description: 'Peer support groups, mentorship programs, and family reunification resources.',
  },
];

const ROADMAP_PHASES = [
  { label: 'Foundation', weeks: 'Week 1–4', description: 'Documents, ID, housing stability' },
  { label: 'Momentum', weeks: 'Week 5–8', description: 'Employment search, benefits enrollment' },
  { label: 'Independence', weeks: 'Week 9–12', description: 'Stable income, permanent housing' },
];

export function ResourcesPage() {
  const navigate = useNavigate();
  const { profile } = useProfileStore();
  const counselorName = profile.support.case_worker_name ?? 'Sarah Jenkins';

  return (
    <div className="px-8 md:px-12 py-10 max-w-7xl mx-auto">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column — 1/3 */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Counselor Profile Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 relative overflow-hidden">
            {/* Subtle gradient accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center gap-4">
              {/* Avatar large */}
              <div className="relative inline-flex">
                <div className="w-20 h-20 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-on-primary-fixed text-2xl">
                  SJ
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-primary border-2 border-white" />
              </div>

              {/* Name & title */}
              <div>
                <span className="inline-block px-3 py-1 bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold rounded-full mb-2 uppercase tracking-wider">
                  Primary Counselor
                </span>
                <h2 className="font-headline text-2xl font-extrabold text-on-surface">{counselorName}</h2>
                <p className="text-on-surface-variant text-sm mt-1">Lead Re-entry Counselor</p>
              </div>

              {/* Online status */}
              <div className="flex items-center gap-2">
                <StatusDot online={true} pulse={true} />
                <span className="text-sm font-semibold text-on-surface">Available</span>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-primary text-base">phone</span>
                (510) 555-0142
              </div>

              {/* Schedule hours */}
              <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-primary text-base">calendar_today</span>
                Mon – Fri, 9:00 AM – 4:30 PM
              </div>

              {/* Actions */}
              <div className="w-full space-y-2 pt-2">
                <Button variant="primary" size="md" className="w-full">
                  <span className="material-symbols-outlined text-sm">event</span>
                  Schedule Appointment
                </Button>
                <Button variant="secondary" size="md" className="w-full" onClick={() => navigate('/chat')}>
                  <span className="material-symbols-outlined text-sm">chat</span>
                  Send Message
                </Button>
              </div>
            </div>
          </div>

          {/* Sticky Note */}
          <StickyNote author={counselorName}>
            "Keep up the momentum, Marcus! Your consistency is what will make the difference. See you Thursday."
          </StickyNote>

          {/* Next Milestone */}
          <div className="bg-surface-container-lowest rounded-xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Next Milestone</h4>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-on-primary shrink-0">
                <span className="material-symbols-outlined">work</span>
              </div>
              <div>
                <p className="font-bold text-on-surface">Employment Search</p>
                <p className="text-xs text-on-surface-variant">Active job applications in progress</p>
              </div>
            </div>
            <ProgressBar value={68} showLabel />
            <p className="text-xs text-on-surface-variant">68% toward employment goal</p>
          </div>
        </aside>

        {/* Right column — 2/3 */}
        <div className="lg:col-span-8 space-y-8">
          {/* Resource Library Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">
                Resource Library
              </h1>
              <p className="text-on-surface-variant text-lg mt-2">
                The Guided Path — tools and knowledge for your next steps.
              </p>
            </div>
            <div className="flex gap-2 bg-surface-container p-1 rounded-xl">
              <button className="px-4 py-2 bg-surface-container-lowest rounded-lg text-sm font-bold text-primary">
                All Guides
              </button>
              <button className="px-4 py-2 hover:bg-surface-container-high rounded-lg text-sm font-medium text-on-surface-variant transition-colors">
                Saved
              </button>
            </div>
          </div>

          {/* Bento Grid — 2x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {RESOURCE_CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="bg-surface-container-lowest rounded-xl p-6 flex flex-col gap-4 hover:shadow-sm border-b-2 border-transparent hover:border-primary transition-all duration-200"
              >
                <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-fixed-variant">{cat.icon}</span>
                </div>
                <div className="flex-grow">
                  <h3 className="font-headline text-xl font-bold text-on-surface mb-2">{cat.title}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">{cat.description}</p>
                </div>
                <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline mt-auto">
                  Explore
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </button>
              </div>
            ))}
          </div>

          {/* Featured Roadmap */}
          <div className="bg-secondary-container rounded-2xl overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Text side */}
              <div className="lg:w-1/2 p-8 flex flex-col justify-center text-on-secondary-container">
                <span className="text-xs font-bold uppercase tracking-[0.2em] mb-3 opacity-70">Featured Roadmap</span>
                <h2 className="font-headline text-3xl font-extrabold mb-3 leading-tight">
                  90-Day Re-entry Roadmap
                </h2>
                <p className="text-sm opacity-80 mb-6 leading-relaxed">
                  A strategic guide designed by lead counselors to ensure stability, document security, and mental wellness during your initial re-entry phase.
                </p>

                {/* 3-phase timeline */}
                <div className="space-y-3 mb-6">
                  {ROADMAP_PHASES.map((phase, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center shrink-0 text-on-secondary text-xs font-black">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-bold text-sm">
                          {phase.label}
                          <span className="ml-2 text-[10px] font-bold opacity-60 uppercase tracking-wider">{phase.weeks}</span>
                        </p>
                        <p className="text-xs opacity-70">{phase.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="secondary" size="md" className="border-on-secondary-container/20 text-on-secondary-container hover:bg-white/20">
                    <span className="material-symbols-outlined text-sm">download</span>
                    Download PDF
                  </Button>
                  <button className="px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold text-on-secondary-container transition-colors">
                    Read Online
                  </button>
                </div>
              </div>

              {/* Visual side */}
              <div className="lg:w-1/2 min-h-[220px] bg-gradient-to-br from-secondary/40 to-secondary-container flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-5xl text-on-secondary-container opacity-80">map</span>
                  </div>
                  <p className="font-headline font-bold text-on-secondary-container text-lg opacity-90 leading-tight">
                    Building a foundation<br />for lasting success.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
