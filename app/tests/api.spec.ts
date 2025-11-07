import { test, expect } from '@playwright/test';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'test';

test.describe('API - Auth Endpoint', () => {
  test('POST /api/auth/verify should succeed with valid admin secret', async ({ request }) => {
    const response = await request.post('/api/auth/verify', {
      data: {
        adminSecret: ADMIN_SECRET,
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.message).toMatch(/verified/i);
  });

  test('POST /api/auth/verify should fail with invalid admin secret', async ({ request }) => {
    const response = await request.post('/api/auth/verify', {
      data: {
        adminSecret: 'wrong-secret',
      },
    });
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.success).toBeFalsy();
    expect(data.error).toMatch(/unauthorized/i);
  });
});

test.describe('API - Sessions Endpoint', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests serially to avoid race conditions
  
  test('GET /api/sessions should return sessions list', async ({ request }) => {
    const response = await request.get('/api/sessions');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('sessions');
    expect(Array.isArray(data.sessions)).toBeTruthy();
  });

  test('POST /api/sessions should create session with valid admin secret', async ({ request }) => {
    // Note: createSession automatically closes other active sessions via dataStore
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
    // Session should be active immediately after creation
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

  test('PUT /api/sessions should reactivate a closed session', async ({ request }) => {
    // Create a session (automatically closes any other active sessions)
    const createResponse = await request.post('/api/sessions', {
      data: {
        name: 'Session to Reactivate',
        adminSecret: ADMIN_SECRET,
      },
    });
    const createData = await createResponse.json();
    const sessionId = createData.session.id;
    
    // Close it
    await request.patch('/api/sessions', {
      data: {
        sessionId,
        adminSecret: ADMIN_SECRET,
      },
    });
    
    // Reactivate it (reactivateSession also closes other active sessions)
    const reactivateResponse = await request.put('/api/sessions', {
      data: {
        sessionId,
        adminSecret: ADMIN_SECRET,
      },
    });
    
    expect(reactivateResponse.ok()).toBeTruthy();
    const reactivateData = await reactivateResponse.json();
    expect(reactivateData.success).toBeTruthy();
    expect(reactivateData.session.isActive).toBeTruthy();
    expect(reactivateData.message).toMatch(/reactivated/i);
  });

  test('DELETE /api/sessions should delete a session', async ({ request }) => {
    // Create a session
    const createResponse = await request.post('/api/sessions', {
      data: {
        name: 'Session to Delete',
        adminSecret: ADMIN_SECRET,
      },
    });
    const createData = await createResponse.json();
    const sessionId = createData.session.id;
    
    // Delete it
    const deleteResponse = await request.delete(`/api/sessions?sessionId=${sessionId}&adminSecret=${ADMIN_SECRET}`);
    
    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    expect(deleteData.success).toBeTruthy();
    expect(deleteData.message).toMatch(/deleted/i);
    
    // Verify it's gone
    const summaryResponse = await request.get(`/api/summary?sessionId=${sessionId}`);
    expect(summaryResponse.status()).toBe(404);
  });

  test('DELETE /api/sessions should fail without admin secret', async ({ request }) => {
    const response = await request.delete('/api/sessions?sessionId=test-id');
    
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toMatch(/unauthorized/i);
  });
});

test.describe('API - Analyze Endpoint', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests serially to avoid race conditions
  
  test('POST /api/analyze should fail without active session', async ({ request }) => {
    // First, close all active sessions explicitly
    const sessionsResponse = await request.get('/api/sessions');
    const sessionsData = await sessionsResponse.json();
    const activeSessions = sessionsData.sessions?.filter((s: any) => s.isActive) || [];
    
    for (const session of activeSessions) {
      const closeResponse = await request.patch('/api/sessions', {
        data: {
          sessionId: session.id,
          adminSecret: ADMIN_SECRET,
        },
      });
      expect(closeResponse.ok()).toBeTruthy();
    }
    
    // Verify no active session exists
    const verifyResponse = await request.get('/api/sessions');
    const verifyData = await verifyResponse.json();
    expect(verifyData.activeSession).toBeFalsy(); // Can be null or undefined
    
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
    // Error message should mention "no active session" before Azure processing
    expect(data.error).toMatch(/no active session|session may have ended|not started yet|please refresh/i);
  });

  test('POST /api/analyze should reject invalid file type', async ({ request }) => {
    // Create active session first (automatically closes other sessions)
    const createResponse = await request.post('/api/sessions', {
      data: {
        name: 'Analyze Test Session',
        adminSecret: ADMIN_SECRET,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    
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
    // CSV should include imagePath as first column (blob storage URL)
    expect(csvContent).toContain('Image Path,ID,Submitted At,Attendee Type'); // CSV headers
  });
});
