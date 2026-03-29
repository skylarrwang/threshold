import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, uploadDocument } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i === current
              ? 'w-6 h-2 bg-primary'
              : i < current
                ? 'w-2 h-2 bg-primary/40'
                : 'w-2 h-2 bg-outline-variant/30'
          )}
        />
      ))}
    </div>
  );
}

// ── OnboardingPage ────────────────────────────────────────────────────────────

const TOTAL_SCREENS = 2;

export function OnboardingPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(0);
  const [saving, setSaving] = useState(false);

  // Screen 0 state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('Hartford, CT');

  // Screen 1 state (document upload)
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<Record<string, unknown> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleNameContinue() {
    setSaving(true);
    try {
      await updateProfile('identity', { legal_name: name.trim(), state_of_release: location.trim() });
    } catch {
      // Backend may not be ready — proceed anyway
    } finally {
      setSaving(false);
      setScreen(1);
    }
  }

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

  function handleFinish() {
    navigate('/documents');
  }

  function handleSkipToChat() {
    navigate('/chat?interview=true');
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-primary">
          <img src="/threshold.png" alt="Threshold" className="w-8 h-8 object-contain shrink-0" />
          <span className="font-headline font-extrabold text-lg tracking-tight">Threshold</span>
        </div>
        <button
          onClick={handleSkipToChat}
          className="text-xs font-bold text-outline hover:text-on-surface transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-container-low"
        >
          Skip for now
        </button>
      </div>

      {/* Progress */}
      <div className="px-6 mb-8">
        <ProgressDots current={screen} total={TOTAL_SCREENS} />
      </div>

      {/* Screen content */}
      <div className="flex-1 px-6 pb-10 max-w-lg mx-auto w-full">

        {/* ── Screen 0: Name ── */}
        {screen === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-1">
                Welcome to Threshold.
              </h1>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                We're here to help you navigate what comes next. Let's start with your name.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First name or what you'd like to be called"
                  autoFocus
                  className="w-full px-4 py-3.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                  City / state
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Hartford, CT"
                  className="w-full px-4 py-3.5 bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface placeholder:text-outline text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleNameContinue}
              disabled={!name.trim() || saving}
              className={cn(
                'w-full py-4 rounded-xl font-headline font-bold text-sm transition-all duration-200',
                name.trim() && !saving
                  ? 'bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-md shadow-primary/20'
                  : 'bg-surface-container text-outline cursor-not-allowed'
              )}
            >
              {saving ? 'Saving...' : 'Continue'}
              {!saving && (
                <span className="material-symbols-outlined text-sm ml-1.5 align-middle">arrow_forward</span>
              )}
            </button>
          </div>
        )}

        {/* ── Screen 1: Document Upload ── */}
        {screen === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight mb-1">
                Got any documents?
              </h1>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Upload an ID, release papers, or any document you have. We'll scan it to fill in your profile automatically. You can always add more later.
              </p>
            </div>

            {/* Upload area */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={cn(
                'rounded-xl p-8 flex flex-col items-center justify-center text-center border-2 border-dashed transition-colors duration-200 cursor-pointer',
                dragOver
                  ? 'border-primary bg-primary-fixed/10'
                  : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40'
              )}
            >
              <div className="w-14 h-14 bg-primary-fixed/20 text-primary rounded-full flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-2xl">
                  {uploading ? 'hourglass_top' : 'cloud_upload'}
                </span>
              </div>
              <p className="font-headline font-bold text-base text-on-surface mb-1">
                {uploading ? 'Scanning your document...' : 'Tap to upload or drag a file'}
              </p>
              <p className="text-on-surface-variant text-xs">
                PDF, JPG, or PNG
              </p>
            </div>

            {/* Upload error */}
            {uploadError && (
              <div className="rounded-xl bg-error-container/30 border border-error/20 p-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-error text-xl">error</span>
                <p className="text-sm text-error">{uploadError}</p>
              </div>
            )}

            {/* Upload success */}
            {uploadResult && (uploadResult as { ok?: boolean }).ok && (
              <div className="rounded-xl bg-primary-fixed/10 border border-primary/20 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <p className="font-bold text-sm text-on-surface">
                      {String(uploadResult.document_type || 'Document')} scanned
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {String(uploadResult.fields_written || 0)} fields extracted and saved to your profile
                    </p>
                  </div>
                </div>
                {typeof uploadResult.mapped_fields === 'object' && uploadResult.mapped_fields !== null && (
                  <div className="space-y-2 ml-9">
                    {Object.entries(uploadResult.mapped_fields as Record<string, Record<string, string>>).map(([section, fields]) => (
                      <div key={section} className="text-xs">
                        <span className="font-bold text-on-surface-variant uppercase tracking-wider">
                          {section.replace(/_/g, ' ')}
                        </span>
                        <div className="mt-0.5 text-on-surface">
                          {Object.entries(fields).map(([k, v]) => (
                            <span key={k} className="inline-block mr-3">{k.replace(/_/g, ' ')}: {v}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setUploadResult(null); setUploadError(null); }}
                  className="text-xs font-bold text-primary hover:underline ml-9"
                >
                  Upload another document
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleFinish}
                className="w-full py-4 rounded-xl font-headline font-bold text-sm bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-md shadow-primary/20 transition-all duration-200"
              >
                {uploadResult ? 'Continue to Documents' : 'Skip — I\'ll upload later'}
                <span className="material-symbols-outlined text-sm ml-1.5 align-middle">arrow_forward</span>
              </button>
              <button
                onClick={handleSkipToChat}
                className="w-full py-3 rounded-xl font-headline font-bold text-xs text-outline hover:text-on-surface hover:bg-surface-container-low transition-all duration-200"
              >
                Go straight to chat instead
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
