import { useState, useRef } from 'react';
import { useDocumentsStore } from '@/store/documentsStore';
import type { Document, DocumentStatus } from '@/types';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/shared/Button';
import { uploadDocument } from '@/lib/api';

const categoryLabel: Record<Document['category'], string> = {
  identity: 'Identity',
  legal: 'Legal',
  employment: 'Employment',
  financial: 'Financial',
  health: 'Health',
};

const categoryBadgeClass: Record<Document['category'], string> = {
  identity: 'bg-primary-fixed text-on-primary-fixed-variant',
  legal: 'bg-secondary-fixed text-on-secondary-fixed',
  employment: 'bg-tertiary-fixed text-on-tertiary-fixed',
  financial: 'bg-surface-container-high text-on-surface-variant',
  health: 'bg-error-container text-on-error-container',
};

function statusConfig(status: DocumentStatus) {
  switch (status) {
    case 'verified':
      return {
        border: 'border-l-4 border-primary',
        icon: 'check_circle',
        iconClass: 'text-primary',
        label: 'Verified',
        badgeClass: 'bg-primary-fixed/40 text-primary',
      };
    case 'in_progress':
      return {
        border: '',
        icon: 'pending_actions',
        iconClass: 'text-secondary',
        label: 'In Progress',
        badgeClass: 'bg-secondary-fixed text-on-secondary-fixed',
      };
    case 'missing':
      return {
        border: '',
        icon: 'report',
        iconClass: 'text-error',
        label: 'Missing',
        badgeClass: 'bg-error-container text-on-error-container',
      };
    case 'expired':
      return {
        border: '',
        icon: 'warning',
        iconClass: 'text-on-surface-variant',
        label: 'Expired',
        badgeClass: 'bg-surface-container-high text-on-surface-variant',
      };
  }
}

const RECENT_ACTIVITY = [
  { icon: 'file_download', iconClass: 'text-primary', text: 'State ID uploaded', time: '2 hours ago' },
  { icon: 'verified_user', iconClass: 'text-secondary', text: 'Social Security Card verified', time: 'Yesterday, 4:12 PM' },
  { icon: 'mail', iconClass: 'text-on-surface-variant', text: 'Birth Certificate requested', time: 'Oct 14, 2024' },
];

export function DocumentsPage() {
  const { documents, completionPercent } = useDocumentsStore();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<Record<string, unknown> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      const result = await uploadDocument(files[0]);
      setUploadResult(result);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const verifiedCount = documents.filter((d) => d.status === 'verified').length;
  const totalCount = documents.length;

  return (
    <div className="px-8 md:px-12 py-10 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="mb-10">
        <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
          Digital Vault
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl">
          Secure storage for your essential documentation. Keep your path to re-entry organized and verifiable.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Document Cards Grid */}
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="font-headline font-bold text-on-surface text-xl">Your Documents</h2>
              <span className="text-xs font-bold text-primary bg-primary-fixed/30 px-3 py-1 rounded-full uppercase tracking-wider">
                {verifiedCount} of {totalCount} verified
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {documents.map((doc) => {
                const cfg = statusConfig(doc.status);
                return (
                  <div
                    key={doc.id}
                    className={`bg-surface-container-lowest rounded-xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-200 ${cfg.border} ${doc.status === 'missing' ? 'border-2 border-dashed border-outline-variant' : ''}`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.status === 'verified' ? 'bg-primary-fixed/30' : doc.status === 'in_progress' ? 'bg-secondary-fixed' : doc.status === 'missing' ? 'bg-error-container' : 'bg-surface-container-high'}`}>
                        <span className={`material-symbols-outlined text-xl ${cfg.iconClass}`}>{cfg.icon}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${cfg.badgeClass}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Name & category */}
                    <div>
                      <h3 className="font-headline font-bold text-on-surface leading-tight">{doc.name}</h3>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${categoryBadgeClass[doc.category]}`}>
                        {categoryLabel[doc.category]}
                      </span>
                    </div>

                    {/* Date / notes */}
                    {doc.uploadedDate && (
                      <p className="text-xs text-on-surface-variant">
                        Uploaded {new Date(doc.uploadedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {doc.expiryDate && ` · Expires ${doc.expiryDate.slice(0, 4)}`}
                      </p>
                    )}
                    {doc.notes && (
                      <p className="text-xs text-on-surface-variant italic">{doc.notes}</p>
                    )}

                    {/* In-progress bar */}
                    {doc.status === 'in_progress' && (
                      <ProgressBar value={65} gradient={false} />
                    )}

                    {/* Actions */}
                    {doc.status === 'missing' && (
                      <Button variant="secondary" size="sm" className="w-fit mt-auto">
                        <span className="material-symbols-outlined text-sm">upload</span>
                        Upload Now
                      </Button>
                    )}
                    {doc.status === 'verified' && (
                      <div className="flex gap-3 mt-auto">
                        <button className="text-xs font-bold text-primary hover:underline">View File</button>
                        <span className="text-outline-variant">·</span>
                        <button className="text-xs font-bold text-on-surface-variant hover:text-on-surface">Details</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upload Area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <section
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className={`rounded-xl p-10 flex flex-col items-center justify-center text-center border-2 border-dashed transition-colors duration-200 ${dragOver ? 'border-primary bg-primary-fixed/10' : 'border-outline-variant bg-surface-container-lowest'}`}
          >
            <div className="w-16 h-16 bg-primary-fixed/20 text-primary rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">
                {uploading ? 'hourglass_top' : 'cloud_upload'}
              </span>
            </div>
            <h3 className="font-headline font-bold text-xl mb-2">
              {uploading ? 'Extracting information...' : 'Drop files here or click to upload'}
            </h3>
            <p className="text-on-surface-variant text-sm mb-6 max-w-xs">
              {uploading
                ? 'Scanning your document with AI to extract relevant details.'
                : 'Accepts PDF, JPG, PNG · Max 10 MB per document'}
            </p>
            {!uploading && (
              <div className="flex gap-3">
                <Button variant="primary" size="md" onClick={() => fileInputRef.current?.click()}>
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Select Files
                </Button>
                <Button variant="secondary" size="md">
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  Scan with Phone
                </Button>
              </div>
            )}
          </section>

          {/* Upload Result */}
          {uploadResult && (
            <section className="rounded-xl bg-surface-container-lowest p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-fixed/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-primary">fact_check</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-on-surface">Extraction Complete</h3>
                  <p className="text-xs text-on-surface-variant">
                    Detected: {String(uploadResult.document_type || 'Document')} · {String(uploadResult.fields_written || 0)} fields extracted
                  </p>
                </div>
              </div>

              {!!(uploadResult.mapped_fields && typeof uploadResult.mapped_fields === 'object') && (
                <div className="space-y-3">
                  {Object.entries(uploadResult.mapped_fields as Record<string, Record<string, unknown>>).map(([section, fields]) => (
                    <div key={section}>
                      <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                        {section}
                      </h4>
                      <div className="bg-surface-container-low rounded-lg p-3 space-y-1">
                        {Object.entries(fields).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-on-surface-variant">{key.replace(/_/g, ' ')}</span>
                            <span className="text-on-surface font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(uploadResult.sections_updated as string[])?.length > 0 && (
                <p className="text-xs text-primary font-bold">
                  Updated: {(uploadResult.sections_updated as string[]).join(', ')}
                </p>
              )}
            </section>
          )}

          {/* Upload Error */}
          {uploadError && (
            <section className="rounded-xl bg-error-container p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-on-error-container">error</span>
              <p className="text-sm text-on-error-container">{uploadError}</p>
            </section>
          )}
        </div>

        {/* Side panel */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Vault Completion Card */}
          <div className="bg-primary rounded-2xl p-6 relative overflow-hidden text-on-primary">
            <div className="relative z-10">
              <h3 className="font-headline font-bold text-xl mb-4">Vault Completion</h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-5xl font-black tracking-tighter">{completionPercent}%</span>
                <span className="font-bold mb-1 text-primary-fixed">Ready</span>
              </div>
              <p className="text-on-primary/70 text-sm mb-4">
                {verifiedCount} of {totalCount} documents complete. Finish your vault to unlock Quick Apply.
              </p>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-fixed rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Recent Activity */}
          <div className="bg-surface-container-lowest rounded-xl p-6">
            <h4 className="font-headline font-bold text-on-surface mb-5">Recent Activity</h4>
            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-primary-fixed" />
              <div className="space-y-5">
                {RECENT_ACTIVITY.map((event, i) => (
                  <div key={i} className="flex gap-3 relative">
                    {/* Dot */}
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white" />
                    <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center shrink-0">
                      <span className={`material-symbols-outlined text-sm ${event.iconClass}`}>{event.icon}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">{event.text}</p>
                      <p className="text-[10px] text-on-surface-variant">{event.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
