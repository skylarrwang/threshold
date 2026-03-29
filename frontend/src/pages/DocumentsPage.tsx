import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentsStore } from '@/store/documentsStore';
import type { GeneratedDocument } from '@/types';
import { Button } from '@/components/shared/Button';
import { uploadDocument, type UploadedDocument } from '@/lib/api';
import { cn } from '@/lib/utils';

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

// ── Vault section ─────────────────────────────────────────────────────────────

function VaultSection() {
  const { uploads, uploadsLoading, fetchUploads, addUpload } = useDocumentsStore();
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
      // Add to store so it appears immediately without refetch
      if (result.ok && result.id) {
        addUpload({
          id: result.id,
          document_type: result.document_type ?? 'Document',
          sections_updated: result.sections_updated ?? [],
          fields_written: result.fields_written ?? 0,
          uploaded_at: new Date().toISOString(),
        } as UploadedDocument);
      } else {
        // Upload succeeded but no id returned — just refetch
        fetchUploads();
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
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
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{section}</h4>
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
                className="bg-surface-container-lowest rounded-xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-200 border-l-4 border-primary"
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
