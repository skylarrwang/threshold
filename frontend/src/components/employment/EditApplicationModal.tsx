import { useEffect, useState } from 'react';
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

export function EditApplicationModal() {
  const { editModalOpen, editingApplication, setEditModalOpen, updateApplication, deleteApplication } = useJobStore();

  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<JobPipelineStage>('interested');
  const [applyUrl, setApplyUrl] = useState('');
  const [source, setSource] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewLocation, setInterviewLocation] = useState('');
  const [interviewType, setInterviewType] = useState('');
  const [offerSalary, setOfferSalary] = useState('');
  const [offerDetails, setOfferDetails] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Pre-fill when editing application changes
  useEffect(() => {
    if (editingApplication) {
      setCompany(editingApplication.company || '');
      setPosition(editingApplication.position || '');
      setStatus((editingApplication.status as JobPipelineStage) || 'interested');
      setApplyUrl(editingApplication.apply_url || '');
      setSource(editingApplication.source || '');
      setFollowUpDate(editingApplication.follow_up_date || '');
      setDeadline(editingApplication.deadline || '');
      setContactName(editingApplication.contact_name || '');
      setContactEmail(editingApplication.contact_email || '');
      setContactPhone(editingApplication.contact_phone || '');
      setInterviewDate(editingApplication.interview_date || '');
      setInterviewTime(editingApplication.interview_time || '');
      setInterviewLocation(editingApplication.interview_location || '');
      setInterviewType(editingApplication.interview_type || '');
      setOfferSalary(editingApplication.offer_salary || '');
      setOfferDetails(editingApplication.offer_details || '');
      setRejectionReason(editingApplication.rejection_reason || '');
      setNotes(editingApplication.notes || '');
      setHistoryOpen(false);
    }
  }, [editingApplication]);

  if (!editModalOpen || !editingApplication) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) return;

    setSubmitting(true);
    const fields: Record<string, string> = {};
    // Only send changed fields
    if (company.trim() !== (editingApplication.company || '')) fields.company = company.trim();
    if (position.trim() !== (editingApplication.position || '')) fields.position = position.trim();
    if (status !== editingApplication.status) fields.status = status;
    if (applyUrl.trim() !== (editingApplication.apply_url || '')) fields.apply_url = applyUrl.trim();
    if (source.trim() !== (editingApplication.source || '')) fields.source = source.trim();
    if (followUpDate !== (editingApplication.follow_up_date || '')) fields.follow_up_date = followUpDate;
    if (deadline !== (editingApplication.deadline || '')) fields.deadline = deadline;
    if (contactName.trim() !== (editingApplication.contact_name || '')) fields.contact_name = contactName.trim();
    if (contactEmail.trim() !== (editingApplication.contact_email || '')) fields.contact_email = contactEmail.trim();
    if (contactPhone.trim() !== (editingApplication.contact_phone || '')) fields.contact_phone = contactPhone.trim();
    if (interviewDate !== (editingApplication.interview_date || '')) fields.interview_date = interviewDate;
    if (interviewTime.trim() !== (editingApplication.interview_time || '')) fields.interview_time = interviewTime.trim();
    if (interviewLocation.trim() !== (editingApplication.interview_location || '')) fields.interview_location = interviewLocation.trim();
    if (interviewType.trim() !== (editingApplication.interview_type || '')) fields.interview_type = interviewType.trim();
    if (offerSalary.trim() !== (editingApplication.offer_salary || '')) fields.offer_salary = offerSalary.trim();
    if (offerDetails.trim() !== (editingApplication.offer_details || '')) fields.offer_details = offerDetails.trim();
    if (rejectionReason.trim() !== (editingApplication.rejection_reason || '')) fields.rejection_reason = rejectionReason.trim();
    if (notes.trim() !== (editingApplication.notes || '')) fields.notes = notes.trim();

    if (Object.keys(fields).length > 0) {
      await updateApplication(editingApplication.id, fields);
    }
    setSubmitting(false);
    setEditModalOpen(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete application for ${editingApplication.position} at ${editingApplication.company}?`)) return;
    await deleteApplication(editingApplication.id);
    setEditModalOpen(false);
  };

  const history = editingApplication.history ?? [];

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
          {/* Company + Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Company *</label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Position *</label>
              <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className={inputClass} required />
            </div>
          </div>

          {/* Status + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as JobPipelineStage)} className={inputClass}>
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Adzuna, Indeed" className={inputClass} />
            </div>
          </div>

          {/* Apply URL */}
          <div>
            <label className={labelClass}>Job Posting URL</label>
            <input type="url" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} placeholder="https://..." className={inputClass} />
          </div>

          {/* Contact info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Contact Name</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Dates */}
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

          {/* Interview details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Interview Date</label>
              <input type="date" value={interviewDate} onChange={(e) => setInterviewDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Interview Time</label>
              <input type="time" value={interviewTime} onChange={(e) => setInterviewTime(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Interview Location</label>
              <input type="text" value={interviewLocation} onChange={(e) => setInterviewLocation(e.target.value)} placeholder="Address or 'video'" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Interview Type</label>
              <input type="text" value={interviewType} onChange={(e) => setInterviewType(e.target.value)} placeholder="phone, video, in-person" className={inputClass} />
            </div>
          </div>

          {/* Offer details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Offer Salary</label>
              <input type="text" value={offerSalary} onChange={(e) => setOfferSalary(e.target.value)} placeholder="$45,000 annually" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Offer Details</label>
              <input type="text" value={offerDetails} onChange={(e) => setOfferDetails(e.target.value)} placeholder="Benefits, start date..." className={inputClass} />
            </div>
          </div>

          {/* Rejection reason */}
          <div>
            <label className={labelClass}>Rejection Reason</label>
            <input type="text" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className={inputClass} />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass + ' resize-none'} />
          </div>

          {/* History timeline */}
          {history.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {historyOpen ? 'expand_less' : 'expand_more'}
                </span>
                History ({history.length})
              </button>
              {historyOpen && (
                <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-outline-variant/30">
                  {history.map((h, i) => (
                    <div key={i} className="text-xs text-on-surface-variant">
                      <span className="font-medium text-on-surface">{h.status}</span>
                      {h.notes && <span> — {h.notes}</span>}
                      <span className="text-on-surface-variant/60 ml-1">{h.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={handleDelete}>
              <span className="text-red-600">Delete</span>
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" type="button" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={!company.trim() || !position.trim() || submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
