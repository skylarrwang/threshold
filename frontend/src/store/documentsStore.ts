import { create } from 'zustand';
import type { Document, GeneratedDocument } from '@/types';
import { fetchGeneratedDocuments as apiFetchGeneratedDocuments } from '@/lib/api';

interface DocumentsState {
  documents: Document[];
  completionPercent: number;
  generatedDocuments: GeneratedDocument[];
  fetchGeneratedDocuments: () => Promise<void>;
}

export const useDocumentsStore = create<DocumentsState>()((set) => ({
  documents: [
    {
      id: 'doc-001',
      name: 'Connecticut State ID',
      category: 'identity',
      status: 'verified',
      uploadedDate: '2024-10-12',
      expiryDate: '2028-10-12',
      notes: 'Issued at Hartford DMV',
    },
    {
      id: 'doc-002',
      name: 'Social Security Card',
      category: 'identity',
      status: 'verified',
      uploadedDate: '2024-09-20',
    },
    {
      id: 'doc-003',
      name: 'Certificate of Release',
      category: 'legal',
      status: 'verified',
      uploadedDate: '2024-08-01',
    },
    {
      id: 'doc-004',
      name: 'Birth Certificate',
      category: 'identity',
      status: 'in_progress',
      notes: 'Requested from Vital Records, expected 2-3 weeks',
    },
    {
      id: 'doc-005',
      name: 'Ready-to-Work Certificate',
      category: 'employment',
      status: 'in_progress',
      notes: 'In progress — completing vocational training',
    },
    {
      id: 'doc-006',
      name: 'Bank Account Statement',
      category: 'financial',
      status: 'missing',
      notes: 'Needed for housing application',
    },
    {
      id: 'doc-007',
      name: 'Health Insurance Card',
      category: 'health',
      status: 'missing',
      notes: 'Pending Medicaid approval',
    },
  ],
  completionPercent: 57,
  generatedDocuments: [],
  fetchGeneratedDocuments: async () => {
    try {
      const docs = await apiFetchGeneratedDocuments();
      set({ generatedDocuments: docs });
    } catch {
      // Backend not available yet — silently ignore
    }
  },
}));
