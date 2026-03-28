import type { InfoCollectionPayload, InfoCollectionResponse } from '@/types/infoCollection';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

export async function postCollectInfo(payload: InfoCollectionPayload): Promise<InfoCollectionResponse> {
  const response = await fetch(`${API_BASE_URL}/collect-info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`collect-info request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as InfoCollectionResponse;
}
