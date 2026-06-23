import nodemailer from 'nodemailer';

// Simple SMTP-only email wrapper. Configure these env vars in `.env.local`:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ADMIN_EMAILS

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter | null = null;
if (host && port && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
} else {
  console.warn('Email service not fully configured (missing SMTP_* variables)');
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  if (!transporter) {
    console.warn('Attempted to send email with unconfigured transporter');
    return false;
  }
  try {
    await transporter.sendMail({
      from: user,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error('Failed to send email', err);
    return false;
  }
}

export function getAdminEmailList(): string[] {
  const list = process.env.ADMIN_EMAILS || '';
  return list.split(',').map((s) => s.trim()).filter(Boolean);
}
