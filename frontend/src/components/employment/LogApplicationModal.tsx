import { useState } from 'react';
import { Button } from '@/components/shared/Button';
import { useJobStore } from '@/store/jobStore';
import type { JobPipelineStage } from '@/types';

const STAGE_OPTIONS: { value: JobPipelineStage; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'preparing', label: 'Preparing Application' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'started', label: 'Started' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function LogApplicationModal() {
  const { logModalOpen, setLogModalOpen, logApplication } = useJobStore();
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<JobPipelineStage>('applied');
  const [applyUrl, setApplyUrl] = useState('');
  const [source, setSource] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!logModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) return;

    setSubmitting(true);
    await logApplication({
      company: company.trim(),
      position: position.trim(),
      status,
      apply_url: applyUrl.trim() || undefined,
      source: source.trim() || undefined,
      follow_up_date: followUpDate || undefined,
      deadline: deadline || undefined,
      contact_name: contactName.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);

    // Reset & close
    setCompany('');
    setPosition('');
    setStatus('applied');
    setApplyUrl('');
    setSource('');
    setFollowUpDate('');
    setDeadline('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setNotes('');
    setLogModalOpen(false);
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-primary focus:outline-none';
  const labelClass = 'block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setLogModalOpen(false)}
      />

      {/* Modal */}
      <div className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-headline font-bold text-on-surface">Log Job Application</h3>
          <button
            onClick={() => setLogModalOpen(false)}
            className="p-1 hover:bg-surface-container-high rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-xl text-on-surface-variant">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company + Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Company *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Amazon, local shop"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Position *</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Warehouse Associate"
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Status + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as JobPipelineStage)}
                className={inputClass}
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Adzuna, Indeed, referral"
                className={inputClass}
              />
            </div>
          </div>

          {/* Apply URL */}
          <div>
            <label className={labelClass}>Job Posting URL</label>
            <input
              type="url"
              value={applyUrl}
              onChange={(e) => setApplyUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Recruiter name"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="recruiter@co.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(860) 555-0000"
                className={inputClass}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Follow Up By</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any details worth remembering..."
              className={inputClass + ' resize-none'}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setLogModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={!company.trim() || !position.trim() || submitting}>
              {submitting ? 'Saving...' : 'Log Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
