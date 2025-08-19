import express from 'express';
import { summarizeWeeklyKpis } from '../services/aiService.js';

const router = express.Router();

router.post('/summary', async (req, res) => {
  try {
    const { kpis } = req.body || {};
    if (!kpis || typeof kpis !== 'object') return res.status(400).json({ error: 'Missing kpis' });

    const size = Buffer.byteLength(JSON.stringify(kpis), 'utf8');
    if (size > 150_000) return res.status(413).json({ error: 'KPIs payload too large' });

    const summary = await summarizeWeeklyKpis(kpis);
    res.json({ summary });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Failed to generate summary' });
  }
});

export default router;