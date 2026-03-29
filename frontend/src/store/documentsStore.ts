import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GeneratedDocument } from '@/types';
import {
  fetchGeneratedDocuments as apiFetchGeneratedDocuments,
  fetchUploadedDocuments as apiFetchUploadedDocuments,
  fetchUploadedDocumentDetail as apiFetchDetail,
  fetchProfileCompletion,
  fetchProfileMatrix as apiFetchProfileMatrix,
  type UploadedDocument,
  type MatrixSection,
} from '@/lib/api';

interface DocumentsState {
  uploads: UploadedDocument[];
  uploadsLoading: boolean;
  generatedDocuments: GeneratedDocument[];
  completionPercent: number;

  selectedUpload: UploadedDocument | null;
  selectedUploadLoading: boolean;

  profileMatrix: MatrixSection[] | null;

  fetchUploads: () => Promise<void>;
  addUpload: (doc: UploadedDocument) => void;
  fetchGeneratedDocuments: () => Promise<void>;
  fetchCompletion: () => Promise<void>;
  fetchUploadDetail: (docId: string) => Promise<void>;
  clearSelectedUpload: () => void;
  fetchProfileMatrix: () => Promise<void>;
}

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set) => ({
  uploads: [],
  uploadsLoading: true,
  generatedDocuments: [],
  completionPercent: 0,
  selectedUpload: null,
  selectedUploadLoading: false,
  profileMatrix: null,

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
      // Backend not available yet
    }
  },

  fetchCompletion: async () => {
    try {
      const data = await fetchProfileCompletion();
      set({ completionPercent: Math.round(data.overall_pct) });
    } catch {
      // Backend not available yet
    }
  },

  fetchUploadDetail: async (docId: string) => {
    set({ selectedUploadLoading: true });
    try {
      const doc = await apiFetchDetail(docId);
      set({ selectedUpload: doc, selectedUploadLoading: false });
    } catch {
      set({ selectedUploadLoading: false });
    }
  },

  clearSelectedUpload: () => {
    set({ selectedUpload: null });
  },

  fetchProfileMatrix: async () => {
    try {
      const data = await apiFetchProfileMatrix();
      set({ profileMatrix: data });
    } catch {
      // Backend not available yet
    }
  },
    }),
    {
      name: 'threshold-documents',
      partialize: (state) => ({ completionPercent: state.completionPercent, uploads: state.uploads, generatedDocuments: state.generatedDocuments }),
    },
  ),
);
