// src/config/mailer.js
import nodemailer from 'nodemailer';

export async function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: String(port) === '465',
      auth: { user, pass },
    });
  }

  // Dev fallback: Ethereal test account
  const testAccount = await nodemailer.createTestAccount();
  console.warn('Using Ethereal SMTP (dev). Account:', {
    user: testAccount.user,
    pass: testAccount.pass,
  });

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

