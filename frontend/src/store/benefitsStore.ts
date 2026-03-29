import { create } from 'zustand';
import type { BenefitInfo, BenefitProgram, BenefitStatus } from '@/types';

const PROGRAMS: Omit<BenefitInfo, 'status'>[] = [
  {
    id: 'snap',
    program: 'SNAP',
    name: 'SNAP (Food Assistance)',
    description: 'Supplemental Nutrition Assistance Program — monthly food benefits based on household size and income.',
    icon: 'restaurant',
    chatPrefill: 'Can you check my SNAP eligibility?',
  },
  {
    id: 'medicaid',
    program: 'Medicaid',
    name: 'Medicaid / HUSKY',
    description: 'Connecticut state health insurance covering medical, dental, and behavioral health services.',
    icon: 'health_and_safety',
    chatPrefill: 'Can you check my Medicaid eligibility?',
  },
  {
    id: 'msp',
    program: 'MSP',
    name: 'Medicare Savings Program',
    description: 'Helps pay Medicare premiums, deductibles, and copays for eligible CT residents.',
    icon: 'savings',
    chatPrefill: 'Can you check my Medicare Savings Program eligibility?',
  },
];

function deriveStatus(
  program: BenefitProgram,
  enrolled: string[],
  pending: string[],
): BenefitStatus {
  if (enrolled.some((e) => e.toUpperCase() === program.toUpperCase())) return 'enrolled';
  if (pending.some((p) => p.toUpperCase() === program.toUpperCase())) return 'applied';
  return 'not_started';
}

interface BenefitsState {
  benefits: BenefitInfo[];
  loading: boolean;
  fetchBenefits: () => Promise<void>;
}

export const useBenefitsStore = create<BenefitsState>()((set) => ({
  benefits: PROGRAMS.map((p) => ({ ...p, status: 'not_started' as BenefitStatus })),
  loading: false,

  fetchBenefits: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      const benefitsSection = data.profile?.benefits ?? {};
      const enrolled: string[] = benefitsSection.benefits_enrolled ?? [];
      const pending: string[] = benefitsSection.benefits_applied_pending ?? [];

      // Filter out MSP if user doesn't qualify (not 65+ and not disabled)
      const identity = data.profile?.identity ?? {};
      const health = data.profile?.health ?? {};
      const dob = identity.date_of_birth;
      let qualifiesForMedicare = false;
      if (dob) {
        const age = Math.floor(
          (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );
        qualifiesForMedicare = age >= 65;
      }
      if (health.disability_status === true) {
        qualifiesForMedicare = true;
      }

      const eligible = qualifiesForMedicare
        ? PROGRAMS
        : PROGRAMS.filter((p) => p.program !== 'MSP');

      set({
        benefits: eligible.map((p) => ({
          ...p,
          status: deriveStatus(p.program, enrolled, pending),
        })),
      });
    } catch {
      // Keep defaults (all not_started) if backend is unreachable
    } finally {
      set({ loading: false });
    }
  },
}));
