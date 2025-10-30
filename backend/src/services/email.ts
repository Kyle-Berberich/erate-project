import { ServerClient } from 'postmark';

// Initialize Postmark client
const postmarkClient = new ServerClient(process.env.POSTMARK_API_KEY || '');
const fromEmail = process.env.FROM_EMAIL || 'noreply@erate.local';

export interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

/**
 * Send a generic email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.POSTMARK_API_KEY) {
    console.warn('POSTMARK_API_KEY not set, email will not be sent:', options.subject);
    return;
  }

  try {
    await postmarkClient.sendEmail({
      From: fromEmail,
      To: options.to,
      Subject: options.subject,
      HtmlBody: options.htmlBody,
      TextBody: options.textBody || stripHtml(options.htmlBody),
      MessageStream: 'outbound',
    });

    console.log(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
  const subject = 'Welcome to E-Rate Management System';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .button { background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to E-Rate Management</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Your account has been created successfully. You can now log in to the E-Rate Management System to:</p>
            <ul>
              <li>Track E-Rate applications and FRNs</li>
              <li>Manage vendor relationships</li>
              <li>Monitor compliance deadlines</li>
              <li>Generate reports</li>
            </ul>
            <p>If you have any questions or need assistance, please don't hesitate to reach out to your administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from E-Rate Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    htmlBody,
  });
}

/**
 * Send application status update email
 */
export async function sendApplicationStatusEmail(
  userEmail: string,
  applicationName: string,
  frn: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  const subject = `Application Status Updated: ${frn}`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .status-box { background-color: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Status Update</h1>
          </div>
          <div class="content">
            <p>The status of your E-Rate application has been updated:</p>
            <div class="status-box">
              <p><strong>Application:</strong> ${applicationName}</p>
              <p><strong>FRN:</strong> ${frn}</p>
              <p><strong>Previous Status:</strong> ${oldStatus}</p>
              <p><strong>New Status:</strong> ${newStatus}</p>
            </div>
            <p>Log in to the E-Rate Management System to view more details.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from E-Rate Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    htmlBody,
  });
}

/**
 * Send deadline reminder email
 */
export async function sendDeadlineReminderEmail(
  userEmail: string,
  documentType: string,
  applicationName: string,
  frn: string,
  dueDate: Date
): Promise<void> {
  const daysUntil = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const urgency = daysUntil <= 3 ? 'URGENT: ' : '';

  const subject = `${urgency}Compliance Deadline Approaching: ${documentType}`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${daysUntil <= 3 ? '#ef4444' : '#f59e0b'}; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .deadline-box { background-color: white; border-left: 4px solid ${daysUntil <= 3 ? '#ef4444' : '#f59e0b'}; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${daysUntil <= 3 ? '⚠️ URGENT' : '📅'} Deadline Reminder</h1>
          </div>
          <div class="content">
            <p>This is a reminder that a compliance deadline is approaching:</p>
            <div class="deadline-box">
              <p><strong>Document Type:</strong> ${documentType}</p>
              <p><strong>Application:</strong> ${applicationName}</p>
              <p><strong>FRN:</strong> ${frn}</p>
              <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
              <p><strong>Days Until Due:</strong> ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}</p>
            </div>
            <p>Please ensure this document is submitted before the deadline to maintain compliance.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from E-Rate Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    htmlBody,
  });
}

/**
 * Send overdue notification email
 */
export async function sendOverdueNotificationEmail(
  userEmail: string,
  documentType: string,
  applicationName: string,
  frn: string,
  dueDate: Date
): Promise<void> {
  const daysOverdue = Math.ceil((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  const subject = `OVERDUE: ${documentType} - ${frn}`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .overdue-box { background-color: white; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 OVERDUE COMPLIANCE DOCUMENT</h1>
          </div>
          <div class="content">
            <p><strong>URGENT:</strong> A compliance document is now overdue:</p>
            <div class="overdue-box">
              <p><strong>Document Type:</strong> ${documentType}</p>
              <p><strong>Application:</strong> ${applicationName}</p>
              <p><strong>FRN:</strong> ${frn}</p>
              <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
              <p><strong>Days Overdue:</strong> ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'}</p>
            </div>
            <p>Immediate action is required. Please submit this document as soon as possible to avoid compliance issues.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from E-Rate Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    htmlBody,
  });
}

/**
 * Send report generated notification
 */
export async function sendReportGeneratedEmail(
  userEmail: string,
  reportType: string,
  reportUrl: string
): Promise<void> {
  const subject = `Report Ready: ${reportType}`;
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .button { background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Report Generated</h1>
          </div>
          <div class="content">
            <p>Your requested report has been generated and is ready for download:</p>
            <p><strong>Report Type:</strong> ${reportType}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <a href="${reportUrl}" class="button">Download Report</a>
            <p>This link will expire in 24 hours for security purposes.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from E-Rate Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    htmlBody,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  resetToken: string,
  resetUrl: string
): Promise<void> {
  const subject = 'Password Reset Request';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .button { background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <p>You requested a password reset for your E-Rate Management System account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this password reset, please ignore this email or contact your administrator if you have concerns.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from E-Rate Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    htmlBody,
  });
}

/**
 * Send daily digest email
 */
export async function sendDailyDigestEmail(
  userEmail: string,
  data: {
    upcomingDeadlines: number;
    overdueItems: number;
    pendingApplications: number;
    recentUpdates: Array<{ type: string; message: string }>;
  }
): Promise<void> {
  const subject = 'Daily E-Rate Management Digest';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .stat-box { background-color: white; border-radius: 4px; padding: 15px; margin: 10px 0; }
          .alert { color: #dc2626; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 Daily Digest</h1>
          </div>
          <div class="content">
            <p>Here's your daily summary for ${new Date().toLocaleDateString()}:</p>

            <div class="stat-box">
              <h3>Overview</h3>
              <p>Upcoming Deadlines (30 days): <strong>${data.upcomingDeadlines}</strong></p>
              <p class="${data.overdueItems > 0 ? 'alert' : ''}">Overdue Items: <strong>${data.overdueItems}</strong></p>
              <p>Pending Applications: <strong>${data.pendingApplications}</strong></p>
            </div>

            ${
              data.recentUpdates.length > 0
                ? `
            <div class="stat-box">
              <h3>Recent Updates</h3>
              <ul>
                ${data.recentUpdates.map((update) => `<li>${update.message}</li>`).join('')}
              </ul>
            </div>
            `
                : ''
            }

            <p>Log in to the E-Rate Management System to view more details.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from E-Rate Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    to: userEmail,
    subject,
    htmlBody,
  });
}

/**
 * Utility function to strip HTML tags
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
