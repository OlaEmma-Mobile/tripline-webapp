import nodemailer from 'nodemailer';

/**
 * Create a reusable nodemailer transport.
 */
export function createMailer(): nodemailer.Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials are not configured');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Send a transactional email.
 */
export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const transporter = createMailer();
  const from = process.env.SMTP_FROM || 'Tripline <no-reply@tripline.ng>';

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}
