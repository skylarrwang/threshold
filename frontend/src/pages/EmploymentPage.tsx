import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KanbanBoard } from '@/components/employment/KanbanBoard';
import { LogApplicationModal } from '@/components/employment/LogApplicationModal';
import { EditApplicationModal } from '@/components/employment/EditApplicationModal';
import { AlertsBanner } from '@/components/employment/AlertsBanner';
import { ChatSearchNudge } from '@/components/employment/ChatSearchNudge';
import { Button } from '@/components/shared/Button';
import { useJobStore } from '@/store/jobStore';
import { useDocumentsStore } from '@/store/documentsStore';

const DOC_ICONS: Record<string, string> = {
  resume: 'description',
  cover_letter: 'mail',
};

export function EmploymentPage() {
  const navigate = useNavigate();
  const pipeline = useJobStore((s) => s.pipeline);
  const alerts = useJobStore((s) => s.alerts);
  const fetchPipeline = useJobStore((s) => s.fetchPipeline);
  const fetchAlerts = useJobStore((s) => s.fetchAlerts);
  const setLogModalOpen = useJobStore((s) => s.setLogModalOpen);

  const allDocs = useDocumentsStore((s) => s.generatedDocuments);
  const fetchDocs = useDocumentsStore((s) => s.fetchGeneratedDocuments);
  const employmentDocs = allDocs.filter((d) => d.type === 'resume' || d.type === 'cover_letter');

  const activeCount = pipeline?.active_count ?? 0;
  const totalCount = pipeline?.total_count ?? 0;
  const successfulCount = pipeline?.successful_count ?? 0;
  const nextFollowUp = pipeline?.next_follow_up;

  useEffect(() => {
    fetchPipeline();
    fetchAlerts();
    fetchDocs();
  }, [fetchPipeline, fetchAlerts, fetchDocs]);

  return (
    <div className="px-8 md:px-12 py-10 space-y-10 max-w-7xl mx-auto">
      {/* Modals */}
      <LogApplicationModal />
      <EditApplicationModal />

      {/* Page header */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
              Career Momentum
            </h2>
            <p className="text-on-surface-variant text-lg mt-1">
              {activeCount} Active Application{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setLogModalOpen(true)}>
            <span className="material-symbols-outlined text-[18px] mr-1">add</span>
            Log Application
          </Button>
        </div>

        {/* Stats row */}
        {totalCount > 0 && (
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">description</span>
              <span>{totalCount} total</span>
            </div>
            {successfulCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-primary">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{successfulCount} offer{successfulCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {nextFollowUp && (
              <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">event</span>
                <span>Next follow-up: {nextFollowUp.date} ({nextFollowUp.company})</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Alerts */}
      {alerts && <AlertsBanner alerts={alerts} />}

      {/* Kanban board */}
      <KanbanBoard />

      {/* Bottom row: documents + chat search */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Documents */}
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_4px_16px_rgba(26,28,28,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline font-bold text-on-surface">Your Documents</h3>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>

          {employmentDocs.length > 0 ? (
            <div className="space-y-2.5">
              {employmentDocs.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => navigate('/documents')}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 bg-primary-fixed rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      {DOC_ICONS[doc.type] ?? 'article'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{doc.title}</p>
                    <p className="text-xs text-on-surface-variant">
                      {doc.type === 'cover_letter' ? 'Cover Letter' : 'Resume'} · {doc.wordCount} words
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                    chevron_right
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-2">
                edit_document
              </span>
              <p className="text-sm text-on-surface-variant">
                No resumes or cover letters yet.
              </p>
              <p className="text-xs text-on-surface-variant/60 mt-1">
                Ask the chat assistant to help you write one.
              </p>
            </div>
          )}
        </div>

        {/* Chat search nudge */}
        <ChatSearchNudge />
      </div>
    </div>
  );
}
