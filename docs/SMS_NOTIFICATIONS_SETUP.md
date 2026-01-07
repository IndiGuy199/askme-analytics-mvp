# SMS Notifications Setup Guide

This guide will help you set up SMS notifications for contact form submissions using Twilio.

## Prerequisites

- A Google Voice number (or any phone number)
- A Twilio account

## Step 1: Create a Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free account
3. Verify your email and phone number

## Step 2: Get a Twilio Phone Number

1. Log into your Twilio Console at [https://console.twilio.com/](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Buy a number**
3. Choose a number (free trial accounts get one free number)
4. Complete the purchase

## Step 3: Get Your Twilio Credentials

1. Go to your [Twilio Console Dashboard](https://console.twilio.com/)
2. Find your **Account Info** section
3. Copy the following:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click to reveal and copy)

## Step 4: Install Twilio Package

In your project directory, run:

```bash
cd web
npm install twilio
```

## Step 5: Configure Environment Variables

Add these variables to your `web/.env.local` file:

```bash
# SMS Notifications (Twilio)
TWILIO_ACCOUNT_SID=AC...your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio number
NOTIFICATION_PHONE_NUMBER=+1234567890  # Your Google Voice number
```

**Important Notes:**
- Phone numbers must be in E.164 format (e.g., `+12345678900`)
- Include the country code (US/Canada = +1)
- No spaces or dashes

## Step 6: Verify Setup

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```

2. Test the contact form at [http://localhost:3000/contact](http://localhost:3000/contact)

3. Check for:
   - Email notification (via Resend)
   - SMS notification (via Twilio to your Google Voice number)

## Troubleshooting

### SMS Not Received

**Free Trial Limitations:**
- Twilio trial accounts can only send SMS to verified phone numbers
- Go to **Phone Numbers** → **Manage** → **Verified Caller IDs**
- Add and verify your Google Voice number

**Check Console Logs:**
- Look for "SMS notification sent successfully" in terminal
- Check for error messages

**Verify Phone Number Format:**
- Must start with + followed by country code
- Example: `+14155551234` (not `(415) 555-1234`)

### Common Error: "The 'To' number is not a valid phone number"

- Your phone number format is incorrect
- Use E.164 format: `+[country code][number]`

### Common Error: "Twilio not configured"

- The Twilio package is not installed
- Run `npm install twilio` in the `web` directory

### Trial Account Restrictions

Twilio trial accounts have these limitations:
- Can only send to verified numbers
- Messages include "Sent from your Twilio trial account"
- Limited to ~$15 in free credits

To remove restrictions:
- Upgrade to a paid account (no minimum)
- Pay-as-you-go: ~$0.0075 per SMS in US

## SMS Message Format

When a contact form is submitted, you'll receive:

```
🔔 New Contact Form Submission

From: John Doe
Email: john@example.com
Company: Acme Inc
Subject: Interested in your service

Check your email for details.
```

## Cost Estimate

**Twilio Pricing (US):**
- SMS: ~$0.0075 per message sent
- Phone number: $1.15/month
- Example: 100 submissions/month = ~$0.75 in SMS + $1.15 = ~$2/month

## Production Deployment

When deploying to Vercel/production:

1. Add environment variables in Vercel dashboard:
   - Settings → Environment Variables
   - Add all TWILIO_* and NOTIFICATION_PHONE_NUMBER variables

2. Redeploy your application

3. Test in production environment

## Optional: Disable SMS Notifications

If you want to disable SMS notifications temporarily:
- Simply remove or comment out the Twilio environment variables
- The system will gracefully skip SMS sending

## Support

If you have issues:
- Check Twilio's [SMS logs](https://console.twilio.com/us1/monitor/logs/sms)
- Review Next.js server logs for error messages
- Verify all environment variables are set correctly
