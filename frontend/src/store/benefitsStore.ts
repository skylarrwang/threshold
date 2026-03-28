import { create } from 'zustand';
import type { BenefitApplication } from '@/types';

interface BenefitsState {
  benefits: BenefitApplication[];
  totalMonthly: number;
}

export const useBenefitsStore = create<BenefitsState>()(() => ({
  benefits: [
    {
      id: 'ben-001',
      name: 'SNAP',
      description: 'Supplemental Nutrition Assistance Program',
      status: 'active',
      monthlyAmount: 281,
      nextReviewDate: '2025-02-01',
      nextSteps: ['Recertification due Feb 2025'],
      icon: 'restaurant',
    },
    {
      id: 'ben-002',
      name: 'Medicaid',
      description: 'State Health Insurance Program',
      status: 'pending',
      nextReviewDate: '2024-11-05',
      nextSteps: ['Attend eligibility interview Nov 5', 'Bring ID and proof of residence'],
      icon: 'health_and_safety',
    },
    {
      id: 'ben-003',
      name: 'TANF Re-Entry',
      description: 'Transitional Assistance for Needy Families',
      status: 'action_needed',
      monthlyAmount: 450,
      nextSteps: ['Submit 30-day employment plan', 'Contact case worker within 5 days'],
      icon: 'support_agent',
    },
    {
      id: 'ben-004',
      name: 'LIHEAP',
      description: 'Low Income Home Energy Assistance',
      status: 'action_needed',
      nextSteps: ['Apply before Nov 30 deadline', 'Proof of energy bills required'],
      icon: 'bolt',
    },
  ],
  totalMonthly: 731,
}));
