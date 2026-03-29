import { create } from 'zustand';
import type { GeneratedDocument } from '@/types';
import {
  fetchGeneratedDocuments as apiFetchGeneratedDocuments,
  fetchUploadedDocuments as apiFetchUploadedDocuments,
  type UploadedDocument,
} from '@/lib/api';

interface DocumentsState {
  uploads: UploadedDocument[];
  uploadsLoading: boolean;
  generatedDocuments: GeneratedDocument[];
  fetchUploads: () => Promise<void>;
  addUpload: (doc: UploadedDocument) => void;
  fetchGeneratedDocuments: () => Promise<void>;
}

export const useDocumentsStore = create<DocumentsState>()((set) => ({
  uploads: [],
  uploadsLoading: true,
  generatedDocuments: [],

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
}));
