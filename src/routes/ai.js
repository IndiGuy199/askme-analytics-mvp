import express from 'express';
import { summarizeWeeklyKpis } from '../services/aiService.js';

const router = express.Router();

// New: summarize KPIs (used by WeeklyAnalyticsCard)
router.post('/summary', async (req, res) => {
  try {
    const kpis = req.body?.kpis;
    if (!kpis) return res.status(400).json({ error: 'Missing kpis' });
    const summary = await summarizeWeeklyKpis(kpis);
    return res.json({ summary });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'AI summary failed' });
  }
});

export default router;