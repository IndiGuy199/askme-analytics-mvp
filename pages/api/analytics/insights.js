export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { clientId } = req.query;
  
  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    const summary = {
      headline: "Conversions are currently at 0%, indicating a marked area for improvement.",
      highlights: [
        "Conversions have decreased by 10% since the previous week, and they are significantly below the industry average of 5%. Analyzing user behavior points to a major drop-off at step 2 of the signup process, suggesting the need to simplify this stage to boost conversion rates."
      ],
      actions: [
        "Traffic source",
        "User retention"
      ]
    };

    console.log('AI Insights API returning:', JSON.stringify(summary, null, 2));
    res.status(200).json({ summary });

  } catch (error) {
    console.error('AI Insights API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}