// src/routes/weeklyDigest.js
import express from 'express';
import { runForClientId } from '../services/weeklyDigestService.js';
import dotenv from 'dotenv';

dotenv.config(); // loads .env

// Add just this one line:
console.log('🔑 PostHog API Key loaded:', process.env.POSTHOG_API_KEY ? process.env.POSTHOG_API_KEY.substring(0, 10) + '...' : 'MISSING');

const router = express.Router();

/**
 * POST /api/digest/send
 * body: { clientId: "askme-ai" }
 */
router.post('/send', async (req, res) => {
  try {
  // Debugging: log raw and parsed body to help diagnose malformed JSON from PowerShell/curl quoting
  console.log('-> REQ HEADERS', req.headers);
  console.log('-> REQ RAW BODY', req.rawBody);
  console.log('-> REQ PARSED BODY', req.body);

  const { clientId } = req.body || {};
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    await runForClientId(clientId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Digest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
