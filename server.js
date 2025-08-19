import express from 'express';
import cors from 'cors';
import weeklyDigestRouter from './src/routes/weeklyDigest.js';
import cron from 'node-cron';
import { CLIENTS } from './src/config/clients.js';
import { runForClientId } from './src/services/weeklyDigestService.js';
import dotenv from 'dotenv';
import analyticsPreviewRouter from './src/routes/analyticsPreview.js';
import aiRoutes from './src/routes/ai.js';


dotenv.config(); // loads .env

const app = express();
app.use(cors());
// Capture raw body (for debugging malformed JSON) so routes can inspect the exact bytes received
app.use(express.json({
  verify: (req, _res, buf) => {
    try {
      req.rawBody = buf && buf.toString('utf8');
    } catch (e) {
      req.rawBody = undefined;
    }
  },
}));

// API routes
app.use('/api/digest', weeklyDigestRouter);
app.use('/api/ai', aiRoutes);

// Optional: send for every client Mondays 8am America/New_York
cron.schedule('0 8 * * 1', async () => {
  for (const c of CLIENTS) {
    try {
      await runForClientId(c.clientId);
      console.log(`✅ Weekly digest sent for ${c.name}`);
    } catch (e) {
      console.error(`❌ Weekly digest failed for ${c.name}`, e.message);
    }
  }
}, { timezone: 'America/New_York' });

app.use('/api/digest', analyticsPreviewRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
export default app;