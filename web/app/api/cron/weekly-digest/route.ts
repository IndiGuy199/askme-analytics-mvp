import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import OpenAI from 'openai'

const resend = new Resend(process.env.RESEND_API_KEY)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// This endpoint should be called by a cron job weekly
export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all companies with active subscriptions
    const { data: companies, error: companiesError } = await supabase
      .from('company_dashboard')
      .select(`
        id,
        name,
        posthog_project_id,
        plan_name,
        email_digest,
        email_recipients(email)
      `)
      .eq('subscription_status', 'active')
      .eq('email_digest', true)

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    const results = []

    for (const company of companies || []) {
      try {
        const result = await generateAndSendWeeklyDigest(company)
        results.push(result)
      } catch (error) {
        console.error(`Error processing company ${company.id}:`, error)
        results.push({
          company_id: company.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    })
  } catch (error) {
    console.error('Weekly digest error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateAndSendWeeklyDigest(company: any) {
  const supabase = await createClient()

  // Get latest analytics snapshot
  const { data: snapshot, error: snapshotError } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('company_id', company.id)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (snapshotError || !snapshot) {
    throw new Error('No recent analytics data found')
  }

  // Get previous week's snapshot for comparison
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { data: previousSnapshot } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .eq('company_id', company.id)
    .lte('snapshot_date', weekAgo.toISOString())
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  // Generate AI insights
  let aiInsights = null
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an analytics expert. Generate a weekly digest email with insights and recommendations based on the analytics data. Focus on key metrics, trends, and actionable insights. Keep it concise and business-focused.`
        },
        {
          role: 'user',
          content: `Company: ${company.name}
          
Current week data:
${JSON.stringify(snapshot.data, null, 2)}

Previous week data (for comparison):
${previousSnapshot ? JSON.stringify(previousSnapshot.data, null, 2) : 'No previous data available'}

Generate a weekly analytics digest with:
1. Key performance metrics
2. Week-over-week changes (if previous data available)
3. Top insights and trends
4. Actionable recommendations

Format as a professional email newsletter.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })

    aiInsights = completion.choices[0]?.message?.content || 'Unable to generate insights'

    // Store AI insights in database
    await supabase
      .from('ai_insights')
      .insert({
        company_id: company.id,
        snapshot_id: snapshot.id,
        headline: `Weekly Analytics Digest - ${new Date().toLocaleDateString()}`,
        summary: aiInsights,
        model_used: 'gpt-4o-mini',
        tokens_used: completion.usage?.total_tokens || 0
      })

  } catch (aiError) {
    console.error('AI insights generation error:', aiError)
    aiInsights = 'AI insights temporarily unavailable'
  }

  // Prepare email content
  const emailHtml = generateEmailHTML(company, snapshot, previousSnapshot, aiInsights)
  const subject = `Weekly Analytics Digest - ${company.name} - ${new Date().toLocaleDateString()}`

  // Get email recipients
  const recipients = company.email_recipients?.map((r: any) => r.email) || []
  if (recipients.length === 0) {
    throw new Error('No email recipients configured')
  }

  // Send email
  const { data: emailResult, error: emailError } = await resend.emails.send({
    from: process.env.FROM_EMAIL || 'analytics@yourdomain.com',
    to: recipients,
    subject,
    html: emailHtml
  })

  if (emailError) {
    throw new Error(`Failed to send email: ${emailError.message}`)
  }

  // Record email digest
  await supabase
    .from('email_digests')
    .insert({
      company_id: company.id,
      snapshot_id: snapshot.id,
      recipients,
      subject,
      content: emailHtml,
      sent_at: new Date().toISOString()
    })

  return {
    company_id: company.id,
    success: true,
    email_id: emailResult?.id,
    recipients_count: recipients.length
  }
}

function generateEmailHTML(company: any, snapshot: any, previousSnapshot: any, aiInsights: string) {
  const currentDate = new Date().toLocaleDateString()
  const data = snapshot.data || {}
  const previousData = previousSnapshot?.data || {}

  // Calculate week-over-week changes
  const calculateChange = (current: number, previous: number) => {
    if (!previous) return null
    const change = ((current - previous) / previous) * 100
    return {
      value: change,
      formatted: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      positive: change > 0
    }
  }

  const visitorsChange = calculateChange(data.visitors || 0, previousData.visitors || 0)
  const pageviewsChange = calculateChange(data.pageviews || 0, previousData.pageviews || 0)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Analytics Digest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #2563eb; color: white; padding: 24px; text-align: center; }
    .content { padding: 24px; }
    .metric-card { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
    .metric-change { font-size: 14px; margin-top: 4px; }
    .positive { color: #059669; }
    .negative { color: #dc2626; }
    .insights { background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; }
    .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Weekly Analytics Digest</h1>
      <p>${company.name} • ${currentDate}</p>
    </div>
    
    <div class="content">
      <h2>Key Metrics</h2>
      
      <div class="metric-card">
        <h3>👥 Visitors</h3>
        <div class="metric-value">${(data.visitors || 0).toLocaleString()}</div>
        ${visitorsChange ? `<div class="metric-change ${visitorsChange.positive ? 'positive' : 'negative'}">${visitorsChange.formatted} vs last week</div>` : ''}
      </div>
      
      <div class="metric-card">
        <h3>📄 Page Views</h3>
        <div class="metric-value">${(data.pageviews || 0).toLocaleString()}</div>
        ${pageviewsChange ? `<div class="metric-change ${pageviewsChange.positive ? 'positive' : 'negative'}">${pageviewsChange.formatted} vs last week</div>` : ''}
      </div>
      
      ${data.sessions ? `
      <div class="metric-card">
        <h3>🔄 Sessions</h3>
        <div class="metric-value">${data.sessions.toLocaleString()}</div>
      </div>
      ` : ''}
      
      <div class="insights">
        <h3>🤖 AI Insights & Recommendations</h3>
        <div style="white-space: pre-line;">${aiInsights}</div>
      </div>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" class="btn">View Full Dashboard</a>
      </div>
      
      <h3>📈 Top Pages</h3>
      ${data.top_pages ? `
        <ul>
          ${data.top_pages.slice(0, 5).map((page: any) => `
            <li><strong>${page.page}</strong>: ${page.views} views</li>
          `).join('')}
        </ul>
      ` : '<p>No page data available</p>'}
    </div>
    
    <div class="footer">
      <p>This digest was automatically generated for ${company.name}</p>
      <p>To unsubscribe or modify settings, visit your <a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings">account settings</a></p>
    </div>
  </div>
</body>
</html>
  `
}
