import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'profiles.json');
const PORT = Number(process.env.PORT || 3001);

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

async function loadStoredProfiles() {
  try {
    const content = await readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasRequiredTopLevelSections(payload) {
  return (
    payload &&
    typeof payload === 'object' &&
    payload.identity &&
    payload.documents &&
    payload.supervision &&
    payload.housing &&
    payload.employment_education &&
    payload.health &&
    payload.benefits &&
    payload.preferences_meta
  );
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  if (req.method !== 'POST' || req.url !== '/api/collect-info') {
    return jsonResponse(res, 404, { success: false, message: 'Not found.' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks).toString('utf-8');
    const payload = rawBody ? JSON.parse(rawBody) : null;

    if (!hasRequiredTopLevelSections(payload)) {
      return jsonResponse(res, 400, {
        success: false,
        message: 'Invalid intake payload: missing required sections.',
      });
    }

    const profileId = `profile_${randomUUID()}`;
    const storedRecord = {
      id: profileId,
      saved_at: new Date().toISOString(),
      profile: payload,
    };

    await mkdir(DATA_DIR, { recursive: true });
    const existing = await loadStoredProfiles();
    existing.push(storedRecord);
    await writeFile(DATA_FILE, JSON.stringify(existing, null, 2), 'utf-8');

    return jsonResponse(res, 200, {
      success: true,
      id: profileId,
      message: 'Comprehensive intake profile saved.',
    });
  } catch (error) {
    return jsonResponse(res, 500, {
      success: false,
      message: `Server error while saving intake profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`collect-info stub API listening on http://localhost:${PORT}/api/collect-info`);
});
