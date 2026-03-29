import { create } from 'zustand';
import type { GeneratedDocument } from '@/types';
import {
  fetchGeneratedDocuments as apiFetchGeneratedDocuments,
  fetchUploadedDocuments as apiFetchUploadedDocuments,
  fetchProfileCompletion,
  type UploadedDocument,
} from '@/lib/api';

interface DocumentsState {
  uploads: UploadedDocument[];
  uploadsLoading: boolean;
  generatedDocuments: GeneratedDocument[];
  completionPercent: number;
  fetchUploads: () => Promise<void>;
  addUpload: (doc: UploadedDocument) => void;
  fetchGeneratedDocuments: () => Promise<void>;
  fetchCompletion: () => Promise<void>;
}

export const useDocumentsStore = create<DocumentsState>()((set) => ({
  uploads: [],
  uploadsLoading: true,
  generatedDocuments: [],
  completionPercent: 0,

  fetchUploads: async () => {
    try {
      const docs = await apiFetchUploadedDocuments();
      set({ uploads: docs, uploadsLoading: false });
    } catch {
      set({ uploadsLoading: false });
    }
  },

  addUpload: (doc: UploadedDocument) => {
    set((state) => ({ uploads: [doc, ...state.uploads] }));
  },

  fetchGeneratedDocuments: async () => {
    try {
      const docs = await apiFetchGeneratedDocuments();
      set({ generatedDocuments: docs });
    } catch {
      // Backend not available yet — silently ignore
    }
  },

  fetchCompletion: async () => {
    try {
      const data = await fetchProfileCompletion();
      set({ completionPercent: Math.round(data.overall_pct) });
    } catch {
      // Backend not available yet — silently ignore
    }
  },
}));
