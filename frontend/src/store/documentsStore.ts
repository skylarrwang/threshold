// ─────────────────────────────────────────────────────────
// ⚠️  STUB STORE — documents list is mock / hardcoded
//    fetchGeneratedDocuments() is wired; vault list is not.
//    See: TODO.md item #10 and src/fixtures/mockData.ts
// ─────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { Document } from '@/types';
import { MOCK_DOCUMENTS, MOCK_DOCUMENTS_COMPLETION_PERCENT } from '@/fixtures/mockData';

interface DocumentsState {
  documents: Document[];
  completionPercent: number;
}

export const useDocumentsStore = create<DocumentsState>()(() => ({
  documents: MOCK_DOCUMENTS,
  completionPercent: MOCK_DOCUMENTS_COMPLETION_PERCENT,
}));
