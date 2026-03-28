import type {
  HousingQuestionnaireInput,
  InitHousingWorkflowResponse,
} from '@/types/housing';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

function buildMockInitResponse(payload: HousingQuestionnaireInput): InitHousingWorkflowResponse {
  const now = new Date().toISOString();

  return {
    workflowId: `wf-${Date.now()}`,
    startedAt: now,
    source: 'mock',
    subagentTriggers: [
      {
        phase: 'qualifications',
        agentName: 'QualificationAgent',
        status: 'completed',
        detail: 'Program and voucher eligibility verified.',
      },
      {
        phase: 'search',
        agentName: 'ListingSearchAgent',
        status: 'completed',
        detail: 'Ranked listings based on budget and accessibility.',
      },
      {
        phase: 'applications',
        agentName: 'ApplicationAgent',
        status: 'started',
        detail: 'Preparing pre-filled application packets.',
      },
    ],
    results: {
      qualifications: [
        {
          program: 'Section 8 Housing Choice Voucher',
          eligible: true,
          reason: 'Income and supervision requirements are currently aligned.',
          nextSteps: ['Upload ID + proof of income', 'Confirm household size with case manager'],
        },
      ],
      listings: [
        {
          id: 'listing-101',
          title: 'Oakwood Commons Apartments',
          address: `${payload.location}`,
          rent: Math.max(payload.budget - 100, 600),
          bedrooms: payload.familySize > 2 ? 2 : 1,
          accessible: payload.accessibilityNeeds.length > 0,
          matchScore: 92,
          sourceUrl: 'https://example.org/oakwood-commons',
        },
        {
          id: 'listing-102',
          title: 'Maple Court Housing Cooperative',
          address: `${payload.location}`,
          rent: payload.budget,
          bedrooms: payload.familySize > 3 ? 3 : 2,
          accessible: true,
          matchScore: 87,
          sourceUrl: 'https://example.org/maple-court',
        },
      ],
      applications: [
        {
          listingId: 'listing-101',
          listingTitle: 'Oakwood Commons Apartments',
          status: 'queued',
          submittedAt: now,
          notes: 'Awaiting client signature packet.',
        },
      ],
    },
  };
}

export async function postInitHousingWorkflow(
  payload: HousingQuestionnaireInput
): Promise<InitHousingWorkflowResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/housing/init-workflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`init-workflow request failed (${response.status})`);
    }

    return (await response.json()) as InitHousingWorkflowResponse;
  } catch {
    return buildMockInitResponse(payload);
  }
}
