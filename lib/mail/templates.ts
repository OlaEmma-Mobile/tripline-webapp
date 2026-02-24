/**
 * Build an OTP email template.
 */
export function buildOtpEmail({
  firstName,
  otp,
  purpose,
}: {
  firstName: string;
  otp: string;
  purpose: 'verify_email' | 'reset_password';
}): string {
  const title = purpose === 'verify_email' ? 'Verify your Tripline account' : 'Reset your Tripline password';
  const body =
    purpose === 'verify_email'
      ? 'Use this code to verify your email address.'
      : 'Use this code to reset your password.';

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
      <h2>${title}</h2>
      <p>Hi ${firstName},</p>
      <p>${body}</p>
      <div style="font-size:24px;font-weight:bold;letter-spacing:4px;margin:16px 0;">${otp}</div>
      <p>This code expires in 10 minutes.</p>
    </div>
  `;
}
