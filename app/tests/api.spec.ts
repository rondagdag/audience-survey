import { test, expect } from '@playwright/test';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'test';

test.describe('API - Sessions Endpoint', () => {
  test('GET /api/sessions should return sessions list', async ({ request }) => {
    const response = await request.get('/api/sessions');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('sessions');
    expect(Array.isArray(data.sessions)).toBeTruthy();
  });

  test('POST /api/sessions should create session with valid admin secret', async ({ request }) => {
    const response = await request.post('/api/sessions', {
      data: {
        name: 'API Test Session',
        adminSecret: ADMIN_SECRET,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.session).toHaveProperty('id');
    expect(data.session.name).toBe('API Test Session');
    expect(data.session.isActive).toBeTruthy();
  });

  test('POST /api/sessions should fail with invalid admin secret', async ({ request }) => {
    const response = await request.post('/api/sessions', {
      data: {
        name: 'Test Session',
        adminSecret: 'wrong-secret',
      },
    });
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.success).toBeFalsy();
    expect(data.error).toMatch(/unauthorized/i);
  });

  test('POST /api/sessions should fail without session name', async ({ request }) => {
    const response = await request.post('/api/sessions', {
      data: {
        name: '',
        adminSecret: ADMIN_SECRET,
      },
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBeFalsy();
    expect(data.error).toMatch(/session name is required/i);
  });

  test('PATCH /api/sessions should close active session', async ({ request }) => {
    // First create a session
    const createResponse = await request.post('/api/sessions', {
      data: {
        name: 'Session to Close',
        adminSecret: ADMIN_SECRET,
      },
    });
    const createData = await createResponse.json();
    const sessionId = createData.session.id;
    
    // Then close it
    const closeResponse = await request.patch('/api/sessions', {
      data: {
        sessionId,
        adminSecret: ADMIN_SECRET,
      },
    });
    
    expect(closeResponse.ok()).toBeTruthy();
    const closeData = await closeResponse.json();
    expect(closeData.success).toBeTruthy();
    expect(closeData.session.isActive).toBeFalsy();
    expect(closeData.session).toHaveProperty('closedAt');
  });
});

test.describe('API - Analyze Endpoint', () => {
  test('POST /api/analyze should fail without active session', async ({ request }) => {
    // Create a 1x1 PNG image
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    const response = await request.post('/api/analyze', {
      multipart: {
        image: {
          name: 'survey.png',
          mimeType: 'image/png',
          buffer: imageBuffer,
        },
      },
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBeFalsy();
    expect(data.error).toMatch(/no active session/i);
  });

  test('POST /api/analyze should reject invalid file type', async ({ request }) => {
    // Create active session first
    await request.post('/api/sessions', {
      data: {
        name: 'Analyze Test Session',
        adminSecret: ADMIN_SECRET,
      },
    });
    
    // Try to upload non-image file
    const textBuffer = Buffer.from('not an image');
    
    const response = await request.post('/api/analyze', {
      multipart: {
        image: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: textBuffer,
        },
      },
    });
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/invalid file type/i);
  });

  test('POST /api/analyze should handle invalid image gracefully', async ({ request }) => {
    // Create active session
    await request.post('/api/sessions', {
      data: {
        name: 'Azure Test Session',
        adminSecret: ADMIN_SECRET,
      },
    });
    
    // Upload invalid tiny image (1x1 pixel - Azure rejects images that are too small)
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    const response = await request.post('/api/analyze', {
      multipart: {
        image: {
          name: 'survey.png',
          mimeType: 'image/png',
          buffer: imageBuffer,
        },
      },
    });
    
    // Should return 400 error for invalid image
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

test.describe('API - Summary Endpoint', () => {
  test('GET /api/summary should require sessionId parameter', async ({ request }) => {
    const response = await request.get('/api/summary');
    
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/session id is required/i);
  });

  test('GET /api/summary should return 404 for non-existent session', async ({ request }) => {
    const response = await request.get('/api/summary?sessionId=non-existent-id');
    
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toMatch(/session not found/i);
  });

  test('GET /api/summary should return summary for valid session', async ({ request }) => {
    // Create session
    const createResponse = await request.post('/api/sessions', {
      data: {
        name: 'Summary Test Session',
        adminSecret: ADMIN_SECRET,
      },
    });
    const createData = await createResponse.json();
    const sessionId = createData.session.id;
    
    // Get summary
    const summaryResponse = await request.get(`/api/summary?sessionId=${sessionId}`);
    
    expect(summaryResponse.ok()).toBeTruthy();
    const summaryData = await summaryResponse.json();
    expect(summaryData.success).toBeTruthy();
    expect(summaryData.summary).toHaveProperty('sessionId', sessionId);
    expect(summaryData.summary).toHaveProperty('totalSubmissions', 0);
    expect(summaryData.summary).toHaveProperty('npsDistribution');
    expect(summaryData.summary).toHaveProperty('topWords');
  });
});

test.describe('API - Export Endpoint', () => {
  test('GET /api/export should require admin secret', async ({ request }) => {
    const response = await request.get('/api/export?sessionId=test-id');
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toMatch(/unauthorized/i);
  });

  test('GET /api/export should require sessionId', async ({ request }) => {
    const response = await request.get(`/api/export?adminSecret=${ADMIN_SECRET}`);
    
    expect(response.status()).toBe(400);
  });

  test('GET /api/export should return CSV for valid session', async ({ request }) => {
    // Create session
    const createResponse = await request.post('/api/sessions', {
      data: {
        name: 'Export Test Session',
        adminSecret: ADMIN_SECRET,
      },
    });
    const createData = await createResponse.json();
    const sessionId = createData.session.id;
    
    // Export CSV
    const exportResponse = await request.get(`/api/export?sessionId=${sessionId}&adminSecret=${ADMIN_SECRET}`);
    
    expect(exportResponse.ok()).toBeTruthy();
    expect(exportResponse.headers()['content-type']).toContain('text/csv');
    expect(exportResponse.headers()['content-disposition']).toContain('attachment');
    
    const csvContent = await exportResponse.text();
    expect(csvContent).toContain('ID,Submitted At,Attendee Type'); // CSV headers
  });
});
