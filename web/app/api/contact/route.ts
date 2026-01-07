import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = new Resend(process.env.RESEND_API_KEY);

// Create Gmail transporter for SMS gateway (no restrictions)
const gmailTransporter = process.env.GMAIL_APP_PASSWORD ? nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false
  }
}) : null;

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, subject, message } = await request.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send email notification to Gmail
    const { data, error } = await resend.emails.send({
      from: process.env.SMTP_FROM || 'onboarding@resend.dev',
      to: 'proservices330@gmail.com',
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
            New Contact Form Submission
          </h2>
          
          <div style="margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>From:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p style="margin: 10px 0;"><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p style="margin: 10px 0;"><strong>Subject:</strong> ${subject}</p>
          </div>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #374151;">Message:</h3>
            <p style="white-space: pre-wrap; color: #4b5563;">${message}</p>
          </div>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            This message was sent from the AskMe Analytics contact form.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error.message },
        { status: 500 }
      );
    }

    // Send SMS notification via email-to-SMS gateway using Gmail SMTP
    if (process.env.SMS_EMAIL_GATEWAY && gmailTransporter) {
      try {
        console.log('Attempting to send SMS to:', process.env.SMS_EMAIL_GATEWAY);
        await gmailTransporter.sendMail({
          from: process.env.GMAIL_USER,
          to: process.env.SMS_EMAIL_GATEWAY,
          subject: 'New Contact',
          text: `Contact: ${name} (${email}) | ${company || 'N/A'} | ${subject}`,
        });
        console.log('SMS notification sent successfully via Gmail');
      } catch (smsError: any) {
        console.error('Failed to send SMS notification:', smsError);
      }
    } else {
      console.log('Gmail SMTP not configured, skipping SMS');
    }

    return NextResponse.json(
      { success: true, message: 'Email sent successfully', id: data?.id },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}
