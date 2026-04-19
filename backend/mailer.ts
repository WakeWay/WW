import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOtpEmail = async (toEmail: string, otpCode: string, reason: 'login' | 'deactivate' = 'login') => {
  const isDeactivate = reason === 'deactivate';
  const mailOptions = {
    from: `"WakeWay Auth" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: isDeactivate ? 'WakeWay Account Deactivation' : 'Your WakeWay Login Code',
    html: isDeactivate
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
      `,
  };

  await transporter.sendMail(mailOptions);
};
