# Contact Form Email Setup

The contact form is now configured to send emails to `proservices330@gmail.com` when users submit inquiries.

## ✅ Current Setup: Using Resend

The email API has been configured to use **Resend** (the recommended option) since Gmail app passwords aren't available for your account type.

### What's Already Done

- ✅ Resend package is already installed (`resend` v4.8.0 in package.json)
- ✅ API route (`/app/api/contact/route.ts`) is configured to use Resend
- ✅ Contact form (`/app/contact/page.tsx`) is integrated with the API

### What You Need to Do

1. **Sign up at [resend.com](https://resend.com)**
   - Free tier: 3,000 emails/month, 100 emails/day
   - No credit card required

2. **Get your API key**
   - Go to API Keys in dashboard
   - Create a new API key
   - Copy the key (starts with `re_`)

3. **Add to your `.env.local` file** (in the `web` folder):
```env
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
SMTP_FROM=onboarding@resend.dev
```

4. **Restart your dev server** to load the new environment variables

That's it! Your contact form will now send emails to `proservices330@gmail.com`.

## Alternative: SendGrid (If Needed)

If you prefer SendGrid instead, it offers 100 emails/day free forever.

### SendGrid Setup

1. **Sign up at [sendgrid.com](https://sendgrid.com)**
2. **Create an API key** in Settings → API Keys  
3. **Replace the Resend code** with nodemailer (already installed)
4. **Add to `.env.local`:**

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-verified-email@domain.com
```

Note: If using SendGrid, you'll need to update `/app/api/contact/route.ts` to use nodemailer instead of Resend. The backup nodemailer version is available in `route-resend.ts` (you can reverse the code).

## Why Resend vs Gmail?

Your Gmail account type doesn't support app passwords anymore (Google removed this feature in 2024 for newer accounts). Resend is:
- ✅ Easier to set up (just one API key)
- ✅ More reliable for transactional emails
- ✅ Free for up to 3,000 emails/month
- ✅ Better deliverability rates

## What Emails Include

When a user submits the contact form, an email will be sent to `proservices330@gmail.com` with:

- **From:** User's name
- **Email:** User's email address (set as Reply-To)
- **Company:** User's company (if provided)
- **Subject:** The subject they entered
- **Message:** Their full message
- **Formatted HTML:** Professional email layout

## Testing

1. Fill out the contact form at `/contact`
2. Submit the form
3. Check `proservices330@gmail.com` for the email
4. You can reply directly to the user's email

## Troubleshooting

If emails aren't sending:

1. **Check environment variables** are set correctly
2. **Verify Gmail app password** is correct
3. **Check console logs** for error messages
4. **Test SMTP connection** manually
5. **Verify Gmail account** allows less secure apps (if not using app password)

## Production Considerations

For production, consider:

1. **Use a dedicated email service** (SendGrid, AWS SES, Mailgun)
2. **Add rate limiting** to prevent spam
3. **Implement CAPTCHA** to prevent bot submissions
4. **Add email queue** for reliability (using Bull, BullMQ)
5. **Monitor email delivery** and bounce rates
