import axios from 'axios';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function summarizeWeeklyKpis(kpis) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const prompt = `
You are an analytics consultant. Analyze these KPIs and provide actionable insights as STRICT JSON:
{
  "headline": string,                       // 1 sentence summary with key metric
  "highlights": string[3],                  // 3 bullets with specific numbers and comparisons
  "bottleneck": string,                     // Biggest conversion issue with percentage
  "actions": string[3]                      // 3 specific, actionable recommendations
}

Focus on:
- Conversion rate issues (target >5%)
- Retention problems (target >20% D7)
- Traffic quality and device mix
- Specific funnel drop-off points

Industry benchmarks:
- SaaS conversion: 3-5%
- App D7 retention: 20-25%
- Mobile vs desktop usage patterns

KPIs JSON:
${JSON.stringify(kpis)}

Provide specific, actionable insights with numbers.`;

  const { data } = await axios.post(
    OPENAI_URL,
    {
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    },
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );

  const text = data?.choices?.[0]?.message?.content?.trim() || '{}';
  try {
    return JSON.parse(text);
  } catch {
    // Fallback if the model didn't return valid JSON
    return { 
      headline: 'Weekly Analytics Summary', 
      highlights: ['Unable to generate detailed insights'], 
      bottleneck: 'Data parsing issues detected', 
      actions: ['Check data connections', 'Verify PostHog setup', 'Review analytics configuration'] 
    };
  }
}