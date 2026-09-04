import nodemailer from 'nodemailer';
import SMTPTransport = require('nodemailer/lib/smtp-transport');
import * as dotenv from 'dotenv';
dotenv.config();

const smtpTimeoutMs = Number.parseInt(process.env.SMTP_TIMEOUT_MS || '30000', 10);
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpSecure = process.env.SMTP_SECURE === 'true';

const smtpOptions: SMTPTransport.Options = {
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  connectionTimeout: smtpTimeoutMs,
  greetingTimeout: smtpTimeoutMs,
  socketTimeout: smtpTimeoutMs,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(smtpOptions);

export const sendOtpEmail = async (toEmail: string, otpCode: string, reason: 'login' | 'deactivate' | 'signup' = 'login') => {
  const isDeactivate = reason === 'deactivate';
  const subject = isDeactivate ? 'WakeWay Account Deactivation' : 'Your WakeWay Login Code';
  const html = isDeactivate
    ? `
      <h2>Account Deactivation Request</h2>
      <p>You have requested to permanently delete your WakeWay account.</p>
      <p>Use the code below to confirm deletion. <b>This action cannot be undone.</b></p>
      <h1 style="letter-spacing: 0.25rem; color: #ef4444;">${otpCode}</h1>
      <p>This code expires in 10 minutes. If you did not request this, please secure your device.</p>
      `
    : `
      <h2>Hello!</h2>
      <p>Here is your one-time verification code to sign into WakeWay:</p>
      <h1 style="letter-spacing: 0.25rem;">${otpCode}</h1>
      <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
      `;

  if (process.env.BREVO_API_KEY) {
    console.log('[Email] Sending OTP through Brevo API', { reason });
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_FROM || process.env.SMTP_USER,
          name: 'WakeWay Auth',
        },
        to: [{ email: toEmail }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(smtpTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Brevo API returned ${response.status}: ${await response.text()}`);
    }

    console.log('[Email] OTP accepted by Brevo');
    return;
  }

  if (process.env.RESEND_API_KEY) {
    console.log('[Email] Sending OTP through Resend API', { reason });
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'WakeWay Auth <onboarding@resend.dev>',
        to: [toEmail],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(smtpTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Resend API returned ${response.status}: ${await response.text()}`);
    }

    console.log('[Email] OTP accepted by Resend');
    return;
  }

  console.log('[SMTP] Sending OTP email', {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    hasUser: Boolean(process.env.SMTP_USER),
    hasPassword: Boolean(process.env.SMTP_PASS),
    reason,
  });
  const mailOptions = {
    from: `"WakeWay Auth" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
  console.log('[SMTP] Message accepted by provider');
};
