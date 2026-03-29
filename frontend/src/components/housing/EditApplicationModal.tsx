import { useEffect, useState } from 'react';
import { Button } from '@/components/shared/Button';
import { useHousingStore } from '@/store/housingStore';
import type { HousingPipelineStage } from '@/types';

const STAGE_OPTIONS: { value: HousingPipelineStage; label: string }[] = [
  { value: 'discovered', label: 'Found Program' },
  { value: 'contacted', label: 'Contacted Intake' },
  { value: 'documents_gathering', label: 'Gathering Documents' },
  { value: 'applied', label: 'Application Submitted' },
  { value: 'screening', label: 'Background Screening' },
  { value: 'waitlisted', label: 'On Waitlist' },
  { value: 'voucher_issued', label: 'Voucher Issued' },
  { value: 'unit_search', label: 'Searching for Unit' },
  { value: 'interview_scheduled', label: 'Interview / Viewing Set' },
  { value: 'approved', label: 'Approved / Accepted' },
  { value: 'lease_review', label: 'Reviewing Lease' },
  { value: 'moved_in', label: 'Moved In' },
  { value: 'denied', label: 'Denied' },
  { value: 'appeal_filed', label: 'Appeal Filed' },
];

export function EditApplicationModal() {
  const { editModalOpen, editingApplication, setEditModalOpen, updateApplication } = useHousingStore();

  const [program, setProgram] = useState('');
  const [status, setStatus] = useState<HousingPipelineStage>('discovered');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [deadline, setDeadline] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [documentsSubmitted, setDocumentsSubmitted] = useState('');
  const [housingType, setHousingType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill when editing application changes
  useEffect(() => {
    if (editingApplication) {
      setProgram(editingApplication.program || '');
      setStatus((editingApplication.status as HousingPipelineStage) || 'discovered');
      setNotes(editingApplication.notes || '');
      setFollowUpDate(editingApplication.follow_up_date || '');
      setContactName(editingApplication.contact_name || '');
      setContactPhone(editingApplication.contact_phone || '');
      setApplicationUrl(editingApplication.application_url || '');
      setDeadline(editingApplication.deadline || '');
      setInterviewDate(editingApplication.interview_date || '');
      setInterviewTime(editingApplication.interview_time || '');
      setInterviewLocation(editingApplication.interview_location || '');
      setDenialReason(editingApplication.denial_reason || '');
      setDocumentsSubmitted(editingApplication.documents_submitted || '');
      setHousingType(editingApplication.housing_type || '');
    }
  }, [editingApplication]);

  if (!editModalOpen || !editingApplication) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program.trim()) return;

    setSubmitting(true);
    const fields: Record<string, string> = {};
    // Only send changed fields
    if (program.trim() !== (editingApplication.program || '')) fields.program = program.trim();
    if (status !== editingApplication.status) fields.status = status;
    if (notes.trim() !== (editingApplication.notes || '')) fields.notes = notes.trim();
    if (followUpDate !== (editingApplication.follow_up_date || '')) fields.follow_up_date = followUpDate;
    if (contactName.trim() !== (editingApplication.contact_name || '')) fields.contact_name = contactName.trim();
    if (contactPhone.trim() !== (editingApplication.contact_phone || '')) fields.contact_phone = contactPhone.trim();
    if (applicationUrl.trim() !== (editingApplication.application_url || '')) fields.application_url = applicationUrl.trim();
    if (deadline !== (editingApplication.deadline || '')) fields.deadline = deadline;
    if (interviewDate !== (editingApplication.interview_date || '')) fields.interview_date = interviewDate;
    if (interviewTime.trim() !== (editingApplication.interview_time || '')) fields.interview_time = interviewTime.trim();
    if (interviewLocation.trim() !== (editingApplication.interview_location || '')) fields.interview_location = interviewLocation.trim();
    if (denialReason.trim() !== (editingApplication.denial_reason || '')) fields.denial_reason = denialReason.trim();
    if (documentsSubmitted.trim() !== (editingApplication.documents_submitted || '')) fields.documents_submitted = documentsSubmitted.trim();
    if (housingType.trim() !== (editingApplication.housing_type || '')) fields.housing_type = housingType.trim();

    if (Object.keys(fields).length > 0) {
      await updateApplication(editingApplication.id, fields);
    }
    setSubmitting(false);
    setEditModalOpen(false);
  };

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/20 focus:border-primary focus:outline-none';
  const labelClass = 'block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setEditModalOpen(false)}
      />

      <div className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-headline font-bold text-on-surface">Edit Application</h3>
          <button
            onClick={() => setEditModalOpen(false)}
            className="p-1 hover:bg-surface-container-high rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-xl text-on-surface-variant">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Program name */}
          <div>
            <label className={labelClass}>Program / Landlord Name *</label>
            <input type="text" value={program} onChange={(e) => setProgram(e.target.value)} className={inputClass} required />
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as HousingPipelineStage)} className={inputClass}>
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Contact Name</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Follow Up By</label>
              <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Interview row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Interview Date</label>
              <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Interview Time</label>
              <input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Interview Location</label>
              <input type="text" value={interviewLocation} onChange={(e) => setInterviewLocation(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Application URL */}
          <div>
            <label className={labelClass}>Application URL</label>
            <input type="url" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} placeholder="https://..." className={inputClass} />
          </div>

          {/* Housing type + Documents */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Housing Type</label>
              <input type="text" value={housingType} onChange={(e) => setHousingType(e.target.value)} placeholder="e.g. Section 8, Transitional" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Documents Submitted</label>
              <input type="text" value={documentsSubmitted} onChange={(e) => setDocumentsSubmitted(e.target.value)} placeholder="e.g. ID, pay stubs" className={inputClass} />
            </div>
          </div>

          {/* Denial reason (conditional visibility would be nice but keep it simple) */}
          <div>
            <label className={labelClass}>Denial Reason</label>
            <input type="text" value={denialReason} onChange={(e) => setDenialReason(e.target.value)} className={inputClass} />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass + ' resize-none'} />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={!program.trim() || submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
