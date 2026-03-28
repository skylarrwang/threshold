const express = require('express');

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

app.post('/api/housing/init-workflow', (req, res) => {
  const { location, budget, familySize, accessibilityNeeds = [] } = req.body || {};
  const now = new Date().toISOString();

  return res.json({
    workflowId: `wf-${Date.now()}`,
    startedAt: now,
    source: 'live',
    subagentTriggers: [
      {
        phase: 'qualifications',
        agentName: 'QualificationAgent',
        status: 'completed',
        detail: 'Eligibility check completed.',
      },
      {
        phase: 'search',
        agentName: 'ListingSearchAgent',
        status: 'completed',
        detail: 'Housing listings ranked and returned.',
      },
      {
        phase: 'applications',
        agentName: 'ApplicationAgent',
        status: 'started',
        detail: 'Application packet generation in progress.',
      },
    ],
    results: {
      qualifications: [
        {
          program: 'Section 8 Housing Choice Voucher',
          eligible: true,
          reason: 'Initial rules check passed based on intake data.',
          nextSteps: ['Confirm documents', 'Verify household composition'],
        },
      ],
      listings: [
        {
          id: 'backend-listing-1',
          title: 'Harborview Transitional Apartments',
          address: location || 'Location pending',
          rent: Math.max(Number(budget) - 100 || 0, 650),
          bedrooms: Number(familySize) > 2 ? 2 : 1,
          accessible: Array.isArray(accessibilityNeeds) && accessibilityNeeds.length > 0,
          matchScore: 89,
          sourceUrl: 'https://example.org/harborview',
        },
      ],
      applications: [
        {
          listingId: 'backend-listing-1',
          listingTitle: 'Harborview Transitional Apartments',
          status: 'queued',
          submittedAt: now,
          notes: 'Awaiting final user confirmation.',
        },
      ],
    },
  });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Housing workflow API listening on ${port}`);
});
