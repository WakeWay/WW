import * as dotenv from 'dotenv';
dotenv.config();

const emailTimeoutMs = Number.parseInt(process.env.EMAILJS_TIMEOUT_MS || '30000', 10);
const emailJsServiceId = process.env.EMAILJS_SERVICE_ID?.trim();
const emailJsTemplateId = process.env.EMAILJS_TEMPLATE_ID?.trim();
const emailJsPublicKey = process.env.EMAILJS_PUBLIC_KEY?.trim();
const emailJsPrivateKey = process.env.EMAILJS_PRIVATE_KEY?.trim();

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

  if (emailJsServiceId && emailJsTemplateId && emailJsPublicKey) {
    console.log('[Email] Sending OTP through EmailJS', { reason });
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: emailJsServiceId,
        template_id: emailJsTemplateId,
        user_id: emailJsPublicKey,
        accessToken: emailJsPrivateKey,
        template_params: {
          to_email: toEmail,
          email: toEmail,
          otp_code: otpCode,
          otp: otpCode,
          reason,
        },
      }),
      signal: AbortSignal.timeout(emailTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`EmailJS API returned ${response.status}: ${await response.text()}`);
    }

    console.log('[Email] OTP accepted by EmailJS');
    return;
  }

};
