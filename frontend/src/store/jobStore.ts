import { create } from 'zustand';
import type { JobApplication } from '@/types';

interface JobState {
  jobs: JobApplication[];
}

const mockJobs: JobApplication[] = [
  {
    id: 'job-001',
    company: 'Hartford Culinary Group',
    title: 'Line Cook',
    status: 'applied',
    appliedDate: '2024-10-18',
    location: 'Hartford, CT',
    salary: '$18-22/hr',
    notes: 'Second Chance employer',
    logoInitial: 'H',
  },
  {
    id: 'job-002',
    company: 'New England Groundskeeping',
    title: 'Landscape Technician',
    status: 'interviewing',
    appliedDate: '2024-10-10',
    location: 'New Haven, CT',
    salary: '$20/hr',
    notes: 'Phone screen Oct 27',
    logoInitial: 'N',
  },
  {
    id: 'job-003',
    company: 'CT Transit',
    title: 'Bus Maintenance Tech',
    status: 'offer',
    appliedDate: '2024-09-28',
    location: 'Hartford, CT',
    salary: '$26/hr',
    notes: 'Offer received Oct 20 — reviewing benefits',
    logoInitial: 'C',
  },
];

export const useJobStore = create<JobState>()(() => ({
  jobs: mockJobs,
}));
