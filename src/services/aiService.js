import axios from 'axios';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function summarizeWeeklyKpis(kpis) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const prompt = `
You are an analytics assistant. Using the KPIs JSON, output concise weekly insights as STRICT JSON:
{
  "headline": string,                       // 1 sentence
  "highlights": string[3],                  // 3 bullets with numbers if present
  "bottleneck": string,                     // 1 sentence naming the biggest drop with %
  "actions": string[3]                      // 3 concrete suggestions
}
KPIs JSON:
${JSON.stringify(kpis)}
`;

  const { data } = await axios.post(
    OPENAI_URL,
    {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  const text = data?.choices?.[0]?.message?.content?.trim() || '{}';
  try {
    return JSON.parse(text);
  } catch {
    // Fallback if the model didn’t return valid JSON
    return { headline: 'Weekly Analytics Summary', highlights: [text].slice(0, 1), bottleneck: '', actions: [] };
  }
}