import { create } from 'zustand';
import type { JobApplication } from '@/types';

interface JobState {
  jobs: JobApplication[];
  addJob: (job: JobApplication) => void;
  updateJob: (id: string, updates: Partial<JobApplication>) => void;
}

const mockJobs: JobApplication[] = [
  {
    id: 'job-001',
    company: 'Bay Area Culinary Co.',
    title: 'Line Cook',
    status: 'applied',
    appliedDate: '2024-10-18',
    location: 'Oakland, CA',
    salary: '$18-22/hr',
    notes: 'Second Chance employer',
    logoInitial: 'B',
  },
  {
    id: 'job-002',
    company: 'Green Roots Landscaping',
    title: 'Landscape Technician',
    status: 'interviewing',
    appliedDate: '2024-10-10',
    location: 'San Jose, CA',
    salary: '$20/hr',
    notes: 'Phone screen Oct 27',
    logoInitial: 'G',
  },
  {
    id: 'job-003',
    company: 'Metro Transit Authority',
    title: 'Bus Maintenance Tech',
    status: 'offer',
    appliedDate: '2024-09-28',
    location: 'San Francisco, CA',
    salary: '$26/hr',
    notes: 'Offer received Oct 20 — reviewing benefits',
    logoInitial: 'M',
  },
];

export const useJobStore = create<JobState>()((set) => ({
  jobs: mockJobs,
  addJob: (job) => set((state) => ({ jobs: [...state.jobs, job] })),
  updateJob: (id, updates) => set((state) => ({
    jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
  })),
}));
