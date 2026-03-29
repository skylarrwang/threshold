import { useState } from 'react';
import { Button } from '@/components/shared/Button';
import { useHousingStore } from '@/store/housingStore';
import type { HousingPipelineStage } from '@/types';

const STAGE_OPTIONS: { value: HousingPipelineStage; label: string }[] = [
  { value: 'discovered', label: 'Found Program' },
  { value: 'documents_ready', label: 'Documents Ready' },
  { value: 'applied', label: 'Applied' },
  { value: 'waitlisted', label: 'On Waitlist' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'moved_in', label: 'Moved In' },
];

export function LogApplicationModal() {
  const { logModalOpen, setLogModalOpen, logApplication } = useHousingStore();
  const [program, setProgram] = useState('');
  const [status, setStatus] = useState<HousingPipelineStage>('discovered');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!logModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program.trim()) return;

    setSubmitting(true);
    await logApplication({
      program: program.trim(),
      status,
      notes: notes.trim() || undefined,
      follow_up_date: followUpDate || undefined,
      contact_name: contactName.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
    });
    setSubmitting(false);

    // Reset & close
    setProgram('');
    setStatus('discovered');
    setNotes('');
    setFollowUpDate('');
    setContactName('');
    setContactPhone('');
    setLogModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setLogModalOpen(false)}
      />

      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-headline font-bold text-on-surface">Log Housing Application</h3>
          <button
            onClick={() => setLogModalOpen(false)}
            className="p-1 hover:bg-surface-container-high rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-xl text-on-surface-variant">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Program name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">
              Program / Landlord Name *
            </label>
            <input
              type="text"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g. Open Hearth, Hartford Housing Authority"
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-primary focus:outline-none"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as HousingPipelineStage)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface border border-outline-variant/20 focus:border-primary focus:outline-none"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contact info - row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">
                Contact Name
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Who you spoke to"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(860) 555-0000"
                className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Follow-up date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">
              Follow Up By
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface border border-outline-variant/20 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="What happened, what they said..."
              className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setLogModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={!program.trim() || submitting}>
              {submitting ? 'Saving...' : 'Log Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
