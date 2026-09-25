import nodemailer from 'nodemailer';
import { prisma } from '@/shared/database/prisma';

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
  from: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const records = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: [
          'SMTP_ENABLED',
          'SMTP_HOST',
          'SMTP_PORT',
          'SMTP_SECURE',
          'SMTP_USER',
          'SMTP_PASSWORD',
          'SMTP_FROM_NAME',
          'SMTP_FROM_EMAIL',
        ],
      },
      deletedAt: null,
    },
  });

  const map = new Map(records.map((r) => [r.key, r.value]));

  const enabled = (map.get('SMTP_ENABLED') ?? process.env.SMTP_ENABLED ?? 'true') === 'true';
  const host = map.get('SMTP_HOST') || process.env.SMTP_HOST || 'smtp.mailgun.org';
  const port = parseInt(map.get('SMTP_PORT') || process.env.SMTP_PORT || '587', 10);
  const secure = (map.get('SMTP_SECURE') ?? process.env.SMTP_SECURE ?? 'false') === 'true';
  const user = map.get('SMTP_USER') || process.env.SMTP_USER || '';
  const pass = map.get('SMTP_PASSWORD') || process.env.SMTP_PASSWORD || '';
  const fromName = map.get('SMTP_FROM_NAME') || process.env.SMTP_FROM_NAME || 'AlifWorld Notifications';
  const fromEmail = map.get('SMTP_FROM_EMAIL') || process.env.SMTP_FROM_EMAIL || 'noreply@alifworld.com';

  return {
    enabled,
    host,
    port,
    secure,
    user,
    pass,
    fromName,
    fromEmail,
    from: `"${fromName}" <${fromEmail}>`,
  };
}

export async function sendEmailViaSmtp(options: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  const config = await getSmtpConfig();

  if (!config.enabled) {
    throw new Error('SMTP email gateway is currently disabled in System > Setup.');
  }

  if (!config.host || !config.user || !config.pass || config.pass === '••••••••') {
    throw new Error(
      `Incomplete SMTP configuration for ${config.host || 'unconfigured host'}. Please configure SMTP Server Host, Username, and Password in Admin System > Setup.`
    );
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const info = await transporter.sendMail({
    from: config.from,
    to: options.to,
    subject: options.subject,
    text: options.text || options.html?.replace(/<[^>]*>?/gm, ''),
    html:
      options.html ||
      `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #FF6A00;">AlifWorld Notification</h2>
        <p>${options.text}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 11px; color: #888;">This is an automated operational email from AlifWorld Platform.</p>
      </div>
    `,
  });

  return {
    messageId: info.messageId,
    response: info.response,
    accepted: info.accepted,
    rejected: info.rejected,
    configUsed: {
      host: config.host,
      port: config.port,
      from: config.from,
    },
  };
}
