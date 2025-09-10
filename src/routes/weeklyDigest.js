// src/routes/weeklyDigest.js
import express from 'express';
import { runForClientId, runForCompanyId, runForAllCompanies } from '../services/weeklyDigestService.js';
import dotenv from 'dotenv';

dotenv.config(); // loads .env

// Add just this one line:
console.log('🔑 PostHog API Key loaded:', process.env.POSTHOG_API_KEY ? process.env.POSTHOG_API_KEY.substring(0, 10) + '...' : 'MISSING');

const router = express.Router();

/**
 * POST /api/digest/send
 * body: { clientId: "askme-ai" } (legacy)
 * body: { companyId: "uuid" } (database-driven) 
 */
router.post('/send', async (req, res) => {
  try {
    // Debugging: log raw and parsed body to help diagnose malformed JSON from PowerShell/curl quoting
    console.log('-> REQ HEADERS', req.headers);
    console.log('-> REQ RAW BODY', req.rawBody);
    console.log('-> REQ PARSED BODY', req.body);

    const { clientId, companyId } = req.body || {};
    
    // Database-driven approach (preferred)
    if (companyId) {
      console.log(`🚀 Running digest for company: ${companyId}`);
      const result = await runForCompanyId(companyId);
      return res.json(result);
    }
    
    // Legacy approach  
    if (clientId) {
      console.log(`⚠️  Running digest for legacy client: ${clientId}`);
      await runForClientId(clientId);
      return res.json({ ok: true });
    }
    
    return res.status(400).json({ 
      error: 'Either clientId (legacy) or companyId (preferred) is required' 
    });
    
  } catch (err) {
    console.error('Digest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/digest/send-all
 * Send digest to all active companies in database
 */
router.post('/send-all', async (req, res) => {
  try {
    console.log('🚀 Running digest for all companies...');
    const result = await runForAllCompanies();
    res.json(result);
  } catch (err) {
    console.error('Batch digest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
