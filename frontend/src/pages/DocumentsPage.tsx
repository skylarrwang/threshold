import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentsStore } from '@/store/documentsStore';
import type { GeneratedDocument } from '@/types';
import { Button } from '@/components/shared/Button';
import { uploadDocument, type UploadedDocument } from '@/lib/api';
import { cn } from '@/lib/utils';
import { titleCase, formatFieldValue } from '@/lib/format';

// ── Generated doc helpers ─────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<GeneratedDocument['type'], string> = {
  cover_letter: 'Cover Letter',
  resume: 'Resume',
  housing_letter: 'Housing Letter',
  legal_letter: 'Legal Letter',
};

const DOC_TYPE_ICONS: Record<GeneratedDocument['type'], string> = {
  cover_letter: 'description',
  resume: 'badge',
  housing_letter: 'home',
  legal_letter: 'gavel',
};

const SECTION_ICONS: Record<string, string> = {
  identity: 'person',
  documents: 'folder',
  supervision: 'shield',
  housing: 'home',
  employment: 'work',
  health: 'local_hospital',
  benefits: 'payments',
  preferences: 'tune',
};

// ── Profile Field Matrix ─────────────────────────────────────────────────────

const SOURCE_META: Record<string, { icon: string; label: string }> = {
  document: { icon: 'description', label: 'From Documents' },
  conversation: { icon: 'chat', label: 'From Conversation' },
  manual: { icon: 'edit', label: 'Enter Manually' },
};

function FieldRow({ field }: { field: import('@/lib/api').MatrixField }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs',
        field.conditional && 'pl-4'
      )}
    >
      <span className={cn(
        'material-symbols-outlined text-sm',
        field.filled ? 'text-primary' : 'text-outline/40'
      )}>
        {field.filled ? 'check_circle' : 'radio_button_unchecked'}
      </span>
      <span className={cn(
        field.filled ? 'text-on-surface' : 'text-on-surface-variant'
      )}>
        {field.label}
      </span>
    </div>
  );
}

function ProfileFieldMatrix() {
  const { profileMatrix, fetchProfileMatrix } = useDocumentsStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchProfileMatrix();
  }, []);

  if (!profileMatrix || profileMatrix.length === 0) return null;

  const totalFilled = profileMatrix.reduce((s, sec) => s + sec.filled, 0);
  const totalFields = profileMatrix.reduce((s, sec) => s + sec.total, 0);

  return (
    <section className="space-y-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-1 w-full text-left"
      >
        <span className="material-symbols-outlined text-xl text-primary">checklist</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-headline font-bold text-on-surface text-xl">Profile Completion</h2>
          <p className="text-xs text-on-surface-variant">
            {totalFilled}/{totalFields} fields collected from documents and conversations.
          </p>
        </div>
        <span className={cn(
          'material-symbols-outlined text-on-surface-variant transition-transform duration-200',
          open && 'rotate-180'
        )}>
          expand_more
        </span>
      </button>
      {open && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {profileMatrix.map((section) => {
          // Group fields by source, preserving order (conditional fields stay with parent)
          const sources = new Set(section.fields.map((f) => f.source));
          const hasMultipleSources = sources.size > 1;

          return (
            <div
              key={section.key}
              className="bg-surface-container-lowest rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-primary">
                    {SECTION_ICONS[section.key] || 'category'}
                  </span>
                  <h3 className="font-bold text-on-surface text-sm">{section.label}</h3>
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  section.filled === section.total
                    ? 'bg-primary-fixed/30 text-primary'
                    : 'bg-surface-container text-on-surface-variant'
                )}>
                  {section.filled}/{section.total}
                </span>
              </div>

              {hasMultipleSources ? (
                // Group fields by source with subheadings.
                // Conditional fields stay with their parent (don't break into a separate group).
                (() => {
                  // Build runs: consecutive fields with the same effective source.
                  // A conditional field's effective source = its parent's source.
                  type Run = { source: string; fields: typeof section.fields };
                  const runs: Run[] = [];
                  let lastParentSource = '';

                  for (const field of section.fields) {
                    const effectiveSource = field.conditional ? lastParentSource : field.source;
                    if (!field.conditional) lastParentSource = field.source;

                    const lastRun = runs[runs.length - 1];
                    if (lastRun && lastRun.source === effectiveSource) {
                      lastRun.fields.push(field);
                    } else {
                      runs.push({ source: effectiveSource, fields: [field] });
                    }
                  }

                  // Merge runs with the same source (non-adjacent) into display groups
                  const groups: Run[] = [];
                  for (const run of runs) {
                    const existing = groups.find((g) => g.source === run.source);
                    if (existing) {
                      existing.fields.push(...run.fields);
                    } else {
                      groups.push({ ...run });
                    }
                  }

                  return (
                    <div className="space-y-3">
                      {groups.map((group) => {
                        const meta = SOURCE_META[group.source];
                        if (!meta) return null;
                        return (
                          <div key={group.source} className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                              <span className="material-symbols-outlined text-xs">{meta.icon}</span>
                              {meta.label}
                            </div>
                            {group.fields.map((field) => (
                              <FieldRow key={field.key} field={field} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                // Single source — no subheadings needed
                <div className="space-y-1">
                  {section.fields.map((field) => (
                    <FieldRow key={field.key} field={field} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>}
    </section>
  );
}

// ── Document Detail Panel ────────────────────────────────────────────────────

function DocumentDetailPanel() {
  const { selectedUpload, selectedUploadLoading, clearSelectedUpload } = useDocumentsStore();

  if (!selectedUpload && !selectedUploadLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-scrim/40 transition-opacity"
        onClick={clearSelectedUpload}
      />
      {/* Panel */}
      <div className="relative w-full max-w-lg bg-surface-container-low h-full overflow-y-auto shadow-xl animate-in slide-in-from-right">
        {selectedUploadLoading ? (
          <div className="flex items-center justify-center h-full">
            <span className="material-symbols-outlined animate-spin text-outline text-3xl">progress_activity</span>
          </div>
        ) : selectedUpload && (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-fixed/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-primary">description</span>
                </div>
                <div>
                  <h2 className="font-headline font-bold text-on-surface text-lg leading-tight">
                    {selectedUpload.document_type}
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {new Date(selectedUpload.uploaded_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    {selectedUpload.fields_written} fields extracted
                  </p>
                </div>
              </div>
              <button
                onClick={clearSelectedUpload}
                className="p-2 rounded-lg hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            {/* Section badges */}
            {selectedUpload.sections_updated.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedUpload.sections_updated.map((section) => (
                  <span
                    key={section}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide bg-secondary-fixed text-on-secondary-fixed"
                  >
                    {section}
                  </span>
                ))}
              </div>
            )}

            {/* File preview */}
            {selectedUpload.file_path && (
              <section className="space-y-2">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-primary">image</span>
                  Original Document
                </h3>
                {selectedUpload.mime_type?.startsWith('image/') ? (
                  <img
                    src={`/api/documents/uploads/${selectedUpload.id}/file`}
                    alt={selectedUpload.document_type}
                    className="w-full rounded-lg border border-outline-variant/20"
                  />
                ) : selectedUpload.mime_type === 'application/pdf' ? (
                  <iframe
                    src={`/api/documents/uploads/${selectedUpload.id}/file`}
                    title={selectedUpload.document_type}
                    className="w-full h-[500px] rounded-lg border border-outline-variant/20"
                  />
                ) : (
                  <a
                    href={`/api/documents/uploads/${selectedUpload.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                  >
                    Download file
                  </a>
                )}
              </section>
            )}

            {/* Mapped fields (what was written to profile) */}
            {selectedUpload.mapped_fields && Object.keys(selectedUpload.mapped_fields).length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-primary">database</span>
                  Saved to Profile
                </h3>
                {Object.entries(selectedUpload.mapped_fields).map(([section, fields]) => (
                  <div key={section}>
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">
                        {SECTION_ICONS[section] || 'category'}
                      </span>
                      {titleCase(section)}
                    </h4>
                    <div className="bg-surface-container-lowest rounded-lg p-3 space-y-1.5">
                      {Object.entries(fields).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs gap-4">
                          <span className="text-on-surface-variant shrink-0">{titleCase(key)}</span>
                          <span className="text-on-surface font-medium text-right">{formatFieldValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Raw extraction (everything OCR found) */}
            {selectedUpload.raw_extraction && typeof selectedUpload.raw_extraction === 'object' && (
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-tertiary">document_scanner</span>
                  Raw OCR Extraction
                </h3>
                {Boolean((selectedUpload.raw_extraction as Record<string, unknown>).document_type) && (
                  <p className="text-xs text-on-surface-variant">
                    Detected as: <span className="font-medium text-on-surface">{String((selectedUpload.raw_extraction as Record<string, unknown>).document_type)}</span>
                  </p>
                )}
                {Boolean((selectedUpload.raw_extraction as Record<string, unknown>).issuing_authority) && (
                  <p className="text-xs text-on-surface-variant">
                    Issued by: <span className="font-medium text-on-surface">{String((selectedUpload.raw_extraction as Record<string, unknown>).issuing_authority)}</span>
                  </p>
                )}
                {typeof selectedUpload.raw_extraction.fields === 'object' && selectedUpload.raw_extraction.fields && (
                  <div className="bg-surface-container-lowest rounded-lg p-3 space-y-1.5">
                    {Object.entries(selectedUpload.raw_extraction.fields as Record<string, unknown>).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs gap-4">
                        <span className="text-on-surface-variant shrink-0">{titleCase(key)}</span>
                        <span className="text-on-surface font-medium text-right">{formatFieldValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Vault section ─────────────────────────────────────────────────────────────

function VaultSection() {
  const { uploads, uploadsLoading, fetchUploads, addUpload, fetchUploadDetail } = useDocumentsStore();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<Record<string, unknown> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUploads();
  }, []);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);
    try {
      const result = await uploadDocument(files[0]);
      setUploadResult(result);
      if (result.ok && result.id) {
        addUpload({
          id: result.id,
          document_type: result.document_type ?? 'Document',
          sections_updated: result.sections_updated ?? [],
          fields_written: result.fields_written ?? 0,
          uploaded_at: new Date().toISOString(),
        } as UploadedDocument);
        useDocumentsStore.getState().fetchCompletion();
        useDocumentsStore.getState().fetchProfileMatrix();
      } else {
        fetchUploads();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile Field Matrix */}
      <ProfileFieldMatrix />

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
          <Button variant="primary" size="md" onClick={() => fileInputRef.current?.click()}>
            <span className="material-symbols-outlined text-sm">upload_file</span>
            Select Files
          </Button>
        )}
      </section>

      {/* Extraction result */}
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
          {typeof uploadResult.mapped_fields === 'object' && uploadResult.mapped_fields !== null && (
            <div className="space-y-3">
              {Object.entries(uploadResult.mapped_fields as Record<string, Record<string, string>>).map(([section, fields]) => (
                <div key={section}>
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{titleCase(section)}</h4>
                  <div className="bg-surface-container-low rounded-lg p-3 space-y-1">
                    {Object.entries(fields).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-on-surface-variant">{titleCase(key)}</span>
                        <span className="text-on-surface font-medium">{formatFieldValue(value)}</span>
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

      {uploadError && (
        <section className="rounded-xl bg-error-container p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-on-error-container">error</span>
          <p className="text-sm text-on-error-container">{uploadError}</p>
        </section>
      )}

      {/* Uploaded documents */}
      {uploadsLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined animate-spin text-outline text-2xl">progress_activity</span>
        </div>
      ) : uploads.length === 0 && !uploadResult ? (
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-3xl text-outline">folder_open</span>
          </div>
          <h3 className="font-headline font-bold text-on-surface text-xl mb-2">No documents yet</h3>
          <p className="text-on-surface-variant text-sm">
            Upload a document above to get started. We'll extract the important details automatically.
          </p>
        </div>
      ) : (
        <section>
          <h2 className="font-headline font-bold text-on-surface text-xl mb-4 px-1">
            Uploaded Documents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploads.map((doc) => (
              <div
                key={doc.id}
                onClick={() => fetchUploadDetail(doc.id)}
                className="bg-surface-container-lowest rounded-xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-200 border-l-4 border-primary cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl text-primary">description</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide bg-primary-fixed/40 text-primary">
                    {doc.fields_written} fields
                  </span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-on-surface leading-tight">
                    {doc.document_type}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                {doc.sections_updated.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {doc.sections_updated.map((section) => (
                      <span
                        key={section}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-secondary-fixed text-on-secondary-fixed"
                      >
                        {section}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detail panel (slide-over) */}
      <DocumentDetailPanel />
    </div>
  );
}

// ── Generated section ─────────────────────────────────────────────────────────

function GeneratedSection() {
  const navigate = useNavigate();
  const { generatedDocuments, fetchGeneratedDocuments } = useDocumentsStore();
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchGeneratedDocuments();
  }, []);

  async function handleCopy(doc: GeneratedDocument) {
    try {
      await navigator.clipboard.writeText(doc.content);
      setCopied(doc.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard not available
    }
  }

  function handleEditInChat(doc: GeneratedDocument) {
    navigate(`/chat?prompt=${encodeURIComponent(`Edit my ${DOC_TYPE_LABELS[doc.type].toLowerCase()}: "${doc.title}"`)}`);
  }

  if (generatedDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-3xl text-outline">description</span>
        </div>
        <h3 className="font-headline font-bold text-on-surface text-xl mb-2">No generated documents yet</h3>
        <p className="text-on-surface-variant text-sm mb-6">
          Chat with Threshold to create a cover letter, resume, or housing letter.
        </p>
        <Button variant="primary" size="md" onClick={() => navigate('/chat')}>
          <span className="material-symbols-outlined text-sm">chat</span>
          Start a conversation
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {generatedDocuments.map((doc) => (
        <div
          key={doc.id}
          className="bg-surface-container-lowest rounded-xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-200 border border-outline-variant/10"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-secondary-fixed/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-secondary">
                {DOC_TYPE_ICONS[doc.type]}
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide bg-secondary-fixed text-on-secondary-fixed">
              {DOC_TYPE_LABELS[doc.type]}
            </span>
          </div>

          <div>
            <h3 className="font-headline font-bold text-on-surface leading-tight">{doc.title}</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}
              {doc.wordCount} words
            </p>
          </div>

          {/* Preview snippet */}
          <p className="text-xs text-on-surface-variant line-clamp-2 italic">
            {doc.content.slice(0, 120)}...
          </p>

          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => handleCopy(doc)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors',
                copied === doc.id
                  ? 'bg-primary-fixed/30 text-primary'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface'
              )}
            >
              <span className="material-symbols-outlined text-sm">
                {copied === doc.id ? 'check' : 'content_copy'}
              </span>
              {copied === doc.id ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={() => handleEditInChat(doc)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              Edit in Chat
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DocumentsPage ─────────────────────────────────────────────────────────────

type Tab = 'vault' | 'generated';

export function DocumentsPage() {
  const [tab, setTab] = useState<Tab>('vault');

  return (
    <div className="px-8 md:px-12 py-10 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="mb-8">
        <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
          Documents
        </h1>
        <p className="text-on-surface-variant text-lg max-w-2xl">
          Your identity vault and AI-generated letters, all in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-container-low rounded-xl w-fit mb-8">
        {(['vault', 'generated'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200',
              tab === t
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {t === 'vault' ? (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">lock</span>
                Vault
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Generated
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'vault' ? <VaultSection /> : <GeneratedSection />}
    </div>
  );
}
